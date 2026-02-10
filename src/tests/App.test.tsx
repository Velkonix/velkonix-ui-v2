import { render, screen } from "@testing-library/react";
import App from "../app/App";

test("renders bootstrap heading", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /velkonix ui/i })).toBeInTheDocument();
});
