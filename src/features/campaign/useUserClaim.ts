import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";

import { useWallet } from "../../app/providers/WalletProvider";
import { getCampaignConfig, isCampaignClaimConfigured } from "../../config/networks";
import { getPreviewWalletClient, previewPublicClient } from "../../shared/lib/previewChain";
import { CAMPAIGN_DISTRIBUTOR_ABI } from "./campaignAbis";
import { getUnlockedWeek } from "./campaignWeeks";
import { fetchUserProof } from "./snapshotsClient";
import type { UserProof } from "./types";

const readClient = previewPublicClient;

type ClaimProof = UserProof & { week: number };

type ClaimState = {
  proof: ClaimProof | null;
  alreadyClaimed: bigint;
  isLoading: boolean;
  error: string | null;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const shortMessage = (error as { shortMessage?: string }).shortMessage;
    return shortMessage ?? error.message;
  }
  return typeof error === "string" ? error : "UNKNOWN_ERROR";
};

export function useUserClaim() {
  const wallet = useWallet();
  const address = (wallet.address as Address | null) ?? null;

  const campaign = getCampaignConfig();
  const distributor = (campaign.distributor || "") as Address | "";
  const baseUrl = campaign.snapshotsBaseUrl;
  const isClaimAvailable = isCampaignClaimConfigured();

  const [state, setState] = useState<ClaimState>({
    proof: null,
    alreadyClaimed: 0n,
    isLoading: false,
    error: null,
  });
  const [isPending, setIsPending] = useState(false);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (!isClaimAvailable || !distributor || !address) {
      setState({ proof: null, alreadyClaimed: 0n, isLoading: false, error: null });
      return;
    }
    const seq = ++loadSeq.current;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [onChainRootRaw, claimedRaw] = await Promise.all([
        readClient.readContract({
          address: distributor,
          abi: CAMPAIGN_DISTRIBUTOR_ABI,
          functionName: "merkleRoot",
        }),
        readClient.readContract({
          address: distributor,
          abi: CAMPAIGN_DISTRIBUTOR_ABI,
          functionName: "claimed",
          args: [address],
        }),
      ]);
      const onChainRoot = (onChainRootRaw as `0x${string}`).toLowerCase();
      const alreadyClaimed = (claimedRaw as bigint) ?? 0n;

      let matched: ClaimProof | null = null;
      const unlockedWeek = getUnlockedWeek(campaign);
      for (let w = unlockedWeek; w >= 1; w -= 1) {
        const proof = await fetchUserProof(baseUrl, w, address);
        if (proof && proof.root.toLowerCase() === onChainRoot) {
          matched = { week: w, ...proof };
          break;
        }
      }

      if (seq === loadSeq.current) {
        setState({ proof: matched, alreadyClaimed, isLoading: false, error: null });
      }
    } catch (error) {
      if (seq === loadSeq.current) {
        setState({
          proof: null,
          alreadyClaimed: 0n,
          isLoading: false,
          error: toErrorMessage(error),
        });
      }
    }
  }, [isClaimAvailable, distributor, address, baseUrl, campaign]);

  useEffect(() => {
    void load();
  }, [load]);

  const cumulativeAmount = state.proof?.amount ?? 0n;
  const alreadyClaimed = state.alreadyClaimed;
  const claimable = cumulativeAmount > alreadyClaimed ? cumulativeAmount - alreadyClaimed : 0n;
  const claimWeek = state.proof?.week ?? null;

  const claim = useCallback(async () => {
    if (!state.proof || claimable === 0n || !distributor) return;
    if (!address) {
      throw new Error("WALLET_NOT_READY");
    }
    setIsPending(true);
    try {
      const { request } = await readClient.simulateContract({
        account: address,
        address: distributor,
        abi: CAMPAIGN_DISTRIBUTOR_ABI,
        functionName: "claim",
        args: [state.proof.amount, state.proof.proof],
      });
      const walletClient = getPreviewWalletClient(address);
      const hash = await walletClient.writeContract(request);
      await readClient.waitForTransactionReceipt({ hash });
      await load();
      return hash;
    } finally {
      setIsPending(false);
    }
  }, [state.proof, claimable, distributor, address, load]);

  return {
    claim,
    claimable,
    cumulativeAmount,
    alreadyClaimed,
    claimWeek,
    isClaimAvailable,
    isLoading: state.isLoading,
    isPending,
    error: state.error,
    hasProof: Boolean(state.proof),
  };
}
