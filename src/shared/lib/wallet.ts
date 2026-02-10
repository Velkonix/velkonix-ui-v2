export type WalletAddress = `0x${string}`;

const HEX_CHARS = "0123456789abcdef";

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

const getRandomByte = (): number => {
  if (typeof globalThis !== "undefined" && "crypto" in globalThis) {
    const bytes = new Uint8Array(1);
    globalThis.crypto.getRandomValues(bytes);
    return bytes[0];
  }
  return Math.floor(Math.random() * 256);
};

export const createRandomMockAddress = (): WalletAddress => {
  let body = "";
  for (let index = 0; index < 40; index += 1) {
    const byte = getRandomByte();
    body += HEX_CHARS[byte % HEX_CHARS.length];
  }
  return `0x${body}` as WalletAddress;
};
