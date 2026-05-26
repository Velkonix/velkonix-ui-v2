import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { useWallet } from "../../app/providers/WalletProvider";
import { MockEngineProvider } from "../../app/providers/MockEngineProvider";
import { WalletProvider } from "../../app/providers/WalletProvider";
import { createInitialMockState, saveMockState } from "../../mock";
import { AssetPage } from "../../pages/AssetPage";
import { DashboardPage } from "../../pages/DashboardPage";
import { MarketsPage } from "../../pages/MarketsPage";

function WalletTestControls() {
  const wallet = useWallet();
  return (
    <button type="button" onClick={() => void wallet.connect()}>
      Connect test wallet
    </button>
  );
}

function renderLendingRoutes(initialPath: string) {
  return render(
    <WalletProvider mockMode>
      <MockEngineProvider>
        <WalletTestControls />
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/markets" element={<MarketsPage />} />
            <Route path="/asset/:assetId" element={<AssetPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </MemoryRouter>
      </MockEngineProvider>
    </WalletProvider>
  );
}

describe("Slice B", () => {
  beforeEach(() => {
    window.localStorage.clear();
    const initial = createInitialMockState();
    initial.settings.failRateBps = 0;
    saveMockState(initial);
  });

  test("runs borrow to dashboard lifecycle with withdraw, repay approval and claim actions", async () => {
    const user = userEvent.setup();
    const assetRender = renderLendingRoutes("/asset/USDC");

    await user.click(screen.getByRole("button", { name: "Connect test wallet" }));
    await user.click(screen.getByRole("button", { name: "Supply" }));

    const supplyDialog = screen.getByRole("dialog", { name: "Supply USDC" });
    await user.click(within(supplyDialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(screen.getByText("APPROVE success")).toBeInTheDocument(), {
      timeout: 8_000,
    });

    await user.click(within(supplyDialog).getByRole("button", { name: "Deposit" }));
    await waitFor(() => expect(screen.getByText("SUPPLY success")).toBeInTheDocument(), {
      timeout: 8_000,
    });
    await user.click(within(supplyDialog).getByRole("button", { name: "Close" }));

    await user.click(screen.getByRole("button", { name: "Borrow" }));
    const borrowDialog = screen.getByRole("dialog", { name: "Borrow USDC" });
    await user.click(within(borrowDialog).getByRole("button", { name: "Borrow" }));
    await waitFor(() => expect(screen.getByText("BORROW success")).toBeInTheDocument(), {
      timeout: 8_000,
    });

    assetRender.unmount();

    renderLendingRoutes("/dashboard");
    await user.click(screen.getByRole("button", { name: "Connect test wallet" }));

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByText("No borrow positions")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Withdraw" })[0]);
    const withdrawDialog = screen.getByRole("dialog", { name: "Withdraw USDC" });
    await user.click(within(withdrawDialog).getByRole("button", { name: "Withdraw" }));
    await waitFor(() => expect(screen.getByText("WITHDRAW success")).toBeInTheDocument(), {
      timeout: 8_000,
    });

    await user.click(screen.getAllByRole("button", { name: "Repay" })[0]);
    const repayDialog = screen.getByRole("dialog", { name: "Repay USDC" });
    await user.click(within(repayDialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(screen.getByText("APPROVE success")).toBeInTheDocument(), {
      timeout: 8_000,
    });
    await user.click(
      within(screen.getByRole("dialog", { name: "Repay USDC" })).getByRole("button", {
        name: "Close",
      })
    );

    await user.click(screen.getByRole("button", { name: "Claim" }));
    await waitFor(
      () => expect(screen.getByText("CLAIMLENDINGREWARDS success")).toBeInTheDocument(),
      {
        timeout: 8_000,
      }
    );

    expect(screen.getAllByText(/tx_/i).length).toBeGreaterThan(0);
  }, 45_000);

  test("surfaces deterministic failure path for borrow", async () => {
    const initial = createInitialMockState();
    initial.settings.failRateBps = 10_000;
    saveMockState(initial);

    const user = userEvent.setup();
    const assetRender = renderLendingRoutes("/asset/USDC");

    await user.click(screen.getByRole("button", { name: "Connect test wallet" }));
    await user.click(screen.getByRole("button", { name: "Borrow" }));
    const borrowDialog = screen.getByRole("dialog", { name: "Borrow USDC" });
    await user.click(within(borrowDialog).getByRole("button", { name: "Borrow" }));

    await waitFor(() => expect(screen.getByText("BORROW failed")).toBeInTheDocument(), {
      timeout: 8_000,
    });
    expect(screen.getByText("Last error: DETERMINISTIC_FAILURE")).toBeInTheDocument();

    assetRender.unmount();
    renderLendingRoutes("/dashboard");
    await user.click(screen.getByRole("button", { name: "Connect test wallet" }));
    expect(screen.getByText("No borrow positions")).toBeInTheDocument();
  }, 20_000);
});
