import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WalletProvider } from "../../app/providers/WalletProvider";
import { WalletConnectButton, WalletMenu } from "../../shared/ui";

function WalletActionsHarness() {
  return (
    <div>
      <WalletConnectButton />
      <WalletMenu />
    </div>
  );
}

describe("Wallet UI", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("shows connect state and then connected menu with disconnect", async () => {
    const user = userEvent.setup();
    render(
      <WalletProvider mockMode>
        <WalletActionsHarness />
      </WalletProvider>
    );

    expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument();
    expect(screen.queryByTestId("wallet-menu")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Connect Wallet" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Connect Wallet" })).not.toBeInTheDocument());
    expect(screen.getByTestId("wallet-menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Connect Wallet" })).toBeInTheDocument());
  });
});
