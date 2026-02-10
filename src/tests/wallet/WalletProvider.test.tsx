import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WalletProvider, useWallet } from "../../app/providers/WalletProvider";

function WalletProbe() {
  const wallet = useWallet();
  return (
    <div>
      <div data-testid="wallet-mode">{wallet.mode}</div>
      <div data-testid="wallet-connected">{wallet.isConnected ? "yes" : "no"}</div>
      <div data-testid="wallet-address">{wallet.address ?? ""}</div>
      <button onClick={() => void wallet.connect()}>connect</button>
      <button onClick={() => void wallet.disconnect()}>disconnect</button>
    </div>
  );
}

describe("WalletProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("uses mock mode and persists generated address", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <WalletProvider mockMode>
        <WalletProbe />
      </WalletProvider>
    );

    expect(screen.getByTestId("wallet-mode")).toHaveTextContent("mock");
    expect(screen.getByTestId("wallet-connected")).toHaveTextContent("no");

    await user.click(screen.getByRole("button", { name: "connect" }));
    await waitFor(() => expect(screen.getByTestId("wallet-connected")).toHaveTextContent("yes"));

    const firstAddress = screen.getByTestId("wallet-address").textContent;
    expect(firstAddress).toMatch(/^0x[a-f0-9]{40}$/);
    expect(window.localStorage.getItem("mock.wallet.currentUser")).toBe(firstAddress);

    unmount();

    render(
      <WalletProvider mockMode>
        <WalletProbe />
      </WalletProvider>
    );

    expect(screen.getByTestId("wallet-connected")).toHaveTextContent("no");
    await user.click(screen.getByRole("button", { name: "connect" }));
    await waitFor(() => expect(screen.getByTestId("wallet-connected")).toHaveTextContent("yes"));
    expect(screen.getByTestId("wallet-address")).toHaveTextContent(firstAddress ?? "");
  });

  test("disconnect keeps persisted identity but closes session", async () => {
    const user = userEvent.setup();
    render(
      <WalletProvider mockMode>
        <WalletProbe />
      </WalletProvider>
    );

    await user.click(screen.getByRole("button", { name: "connect" }));
    await waitFor(() => expect(screen.getByTestId("wallet-connected")).toHaveTextContent("yes"));
    const persistedAddress = screen.getByTestId("wallet-address").textContent;

    await user.click(screen.getByRole("button", { name: "disconnect" }));
    await waitFor(() => expect(screen.getByTestId("wallet-connected")).toHaveTextContent("no"));
    expect(window.localStorage.getItem("mock.wallet.currentUser")).toBe(persistedAddress);
  });
});
