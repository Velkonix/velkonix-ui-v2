export type WalletAddress = `0x${string}`;

export const formatWalletAddress = (address: WalletAddress | null, visible = 4): string | null => {
  if (!address) {
    return null;
  }
  const minLength = 2 + visible * 2 + 3;
  if (address.length <= minLength) {
    return address;
  }
  return `${address.slice(0, visible + 2)}...${address.slice(-visible)}`;
};
