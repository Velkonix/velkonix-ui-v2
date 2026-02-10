import { render, screen } from "@testing-library/react";
import App from "../app/App";
import { WalletProvider } from "../app/providers/WalletProvider";

test("renders bootstrap heading", () => {
  render(
    <WalletProvider mockMode>
      <App mockMode={false} />
    </WalletProvider>
  );
  expect(screen.getByRole("heading", { name: /velkonix home/i })).toBeInTheDocument();
});
