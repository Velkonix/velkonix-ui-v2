import { render, screen } from "@testing-library/react";
import { WalletProvider } from "../app/providers/WalletProvider";
import { HomePage } from "../pages/HomePage";

test("renders bootstrap heading", () => {
  render(
    <WalletProvider mockMode>
      <HomePage />
    </WalletProvider>
  );
  expect(screen.getByRole("heading", { name: /velkonix home/i })).toBeInTheDocument();
});
