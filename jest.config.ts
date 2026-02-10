import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src/tests"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setupTests.ts"],
  moduleNameMapper: {
    "\\.module\\.css$": "<rootDir>/src/tests/styleMock.ts",
    "\\.css$": "<rootDir>/src/tests/styleMock.ts",
  },
};

export default config;
