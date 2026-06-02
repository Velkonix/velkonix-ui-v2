declare const config: {
  preset: string;
  testEnvironment: string;
  roots: string[];
  testMatch: string[];
  setupFilesAfterEnv: string[];
  moduleNameMapper: {
    "\\.module\\.css$": string;
    "\\.css$": string;
    "\\.(svg|png|jpg|jpeg|gif|webp|avif)$": string;
  };
};
export default config;
