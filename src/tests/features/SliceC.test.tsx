import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { MockEngineProvider } from "../../app/providers/MockEngineProvider";
import { useWallet, WalletProvider } from "../../app/providers/WalletProvider";
import { createInitialMockState, saveMockState } from "../../mock";
import { StakingPage } from "../../pages/StakingPage";

function WalletTestControls() {
  const wallet = useWallet();
  return (
    <button type="button" onClick={() => void wallet.connect()}>
      Connect test wallet
    </button>
  );
}

function renderStakingRoute(initialPath: string) {
  return render(
    <WalletProvider mockMode>
      <MockEngineProvider>
        <WalletTestControls />
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/staking" element={<StakingPage />} />
          </Routes>
        </MemoryRouter>
      </MockEngineProvider>
    </WalletProvider>
  );
}

describe("Slice C", () => {
  beforeEach(() => {
    window.localStorage.clear();
    const initial = createInitialMockState();
    initial.settings.failRateBps = 0;
    initial.settings.queueVestingMs = 200;
    saveMockState(initial);
  });

  test("runs convert, stake and exit lifecycle actions", async () => {
    const user = userEvent.setup();
    renderStakingRoute("/staking");

    expect(screen.getByRole("heading", { name: "Staking" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Connect test wallet" }));
    await user.click(screen.getByRole("tab", { name: "Convert" }));

    await user.clear(screen.getByRole("textbox", { name: "Convert amount" }));
    await user.type(screen.getByRole("textbox", { name: "Convert amount" }), "500");
    await user.click(screen.getByRole("button", { name: "Convert" }));
    await waitFor(() => expect(screen.getByText("CONVERT success")).toBeInTheDocument(), { timeout: 8_000 });

    await user.click(screen.getByRole("tab", { name: "Stake" }));
    await user.clear(screen.getByRole("textbox", { name: "Stake amount" }));
    await user.type(screen.getByRole("textbox", { name: "Stake amount" }), "200");
    await user.click(screen.getByRole("button", { name: "Stake" }));
    await waitFor(() => expect(screen.getByText("STAKETOREWARDS success")).toBeInTheDocument(), { timeout: 8_000 });

    await user.click(screen.getByRole("tab", { name: "Exit" }));
    await user.clear(screen.getByRole("textbox", { name: "Exit amount" }));
    await user.type(screen.getByRole("textbox", { name: "Exit amount" }), "100");
    await user.click(screen.getByRole("checkbox", { name: "Instant" }));
    await user.click(screen.getByRole("button", { name: /Loss .* and Exit/i }));
    await waitFor(() => expect(screen.getByText("INSTANTEXIT success")).toBeInTheDocument(), { timeout: 8_000 });

    await user.click(screen.getByRole("tab", { name: "Exit" }));
    await user.click(screen.getByRole("checkbox", { name: "Instant" }));
    await user.clear(screen.getByRole("textbox", { name: "Exit amount" }));
    await user.type(screen.getByRole("textbox", { name: "Exit amount" }), "50");
    await user.click(screen.getByRole("button", { name: "Request Exit" }));
    await waitFor(() => expect(screen.getByText("REQUESTEXIT success")).toBeInTheDocument(), { timeout: 8_000 });

    expect(screen.getAllByText(/tx_/i).length).toBeGreaterThan(0);
  }, 45_000);
});
