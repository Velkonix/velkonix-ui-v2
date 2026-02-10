type SpacerProps = {
  size?: number;
  axis?: "vertical" | "horizontal";
};

export function Spacer({ size = 16, axis = "vertical" }: SpacerProps) {
  if (axis === "horizontal") {
    return <span style={{ display: "inline-block", width: size }} aria-hidden="true" />;
  }

  return <span style={{ display: "block", height: size }} aria-hidden="true" />;
}
