var config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src/tests"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setupTests.ts"],
  moduleNameMapper: {
    "\\.module\\.css$": "<rootDir>/src/tests/styleMock.ts",
    "\\.css$": "<rootDir>/src/tests/styleMock.ts",
    "\\.(svg|png|jpg|jpeg|gif|webp|avif)$": "<rootDir>/src/tests/fileMock.ts",
  },
};
export default config;
