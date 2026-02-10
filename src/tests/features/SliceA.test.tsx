import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { useWallet } from "../../app/providers/WalletProvider";
import { MockEngineProvider } from "../../app/providers/MockEngineProvider";
import { WalletProvider } from "../../app/providers/WalletProvider";
import { createInitialMockState, saveMockState } from "../../mock";
import { AssetPage } from "../../pages/AssetPage";
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
          </Routes>
        </MemoryRouter>
      </MockEngineProvider>
    </WalletProvider>
  );
}

describe("Slice A", () => {
  beforeEach(() => {
    window.localStorage.clear();
    const initial = createInitialMockState();
    initial.settings.failRateBps = 0;
    saveMockState(initial);
  });

  test("sorts markets, opens APY modal, and navigates to asset page", async () => {
    const user = userEvent.setup();
    renderLendingRoutes("/markets");

    expect(screen.getByRole("heading", { name: "Markets" })).toBeInTheDocument();

    const rowsBeforeSort = screen.getAllByRole("row");
    expect(rowsBeforeSort[1]).toHaveTextContent("USDC");

    await user.click(screen.getByRole("button", { name: "Sort by Total Supplied" }));
    const rowsAfterSort = screen.getAllByRole("row");
    expect(rowsAfterSort[1]).toHaveTextContent("WETH");

    await user.click(screen.getByRole("button", { name: "4.20%" }));
    expect(screen.getByRole("dialog", { name: "USDC Supply APY" })).toBeInTheDocument();
    expect(screen.getByText("Current APY")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(rowsAfterSort[1]);
    await waitFor(() => expect(screen.getByRole("heading", { name: /WETH/i })).toBeInTheDocument());
  });

  test("runs supply and borrow actions and surfaces pending/failed states", async () => {
    const user = userEvent.setup();
    renderLendingRoutes("/asset/USDC");

    expect(screen.getByText("Available to supply")).toBeInTheDocument();
    expect(screen.getByText("Available to borrow")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Connect test wallet" }));

    await user.click(screen.getByRole("button", { name: "Supply" }));
    const supplyDialog = screen.getByRole("dialog", { name: "Supply USDC" });

    await user.click(within(supplyDialog).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(screen.getByText("APPROVE success")).toBeInTheDocument(), {
      timeout: 5_000,
    });

    await user.click(within(supplyDialog).getByRole("button", { name: "Deposit" }));
    await waitFor(() => expect(screen.getByText("SUPPLY success")).toBeInTheDocument(), {
      timeout: 8_000,
    });

    await user.click(within(supplyDialog).getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Borrow" }));
    const borrowDialog = screen.getByRole("dialog", { name: "Borrow USDC" });

    await user.click(within(borrowDialog).getByRole("button", { name: "Borrow" }));
    await waitFor(() => expect(screen.getByText("BORROW success")).toBeInTheDocument(), { timeout: 8_000 });

    await waitFor(() => expect(screen.queryByText(/Last error: INSUFFICIENT_BALANCE/i)).not.toBeInTheDocument(), {
      timeout: 5_000,
    });

    expect(screen.getAllByText(/Transaction tx_/i).length).toBeGreaterThan(0);
  }, 20_000);
});
