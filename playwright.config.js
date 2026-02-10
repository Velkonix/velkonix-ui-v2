import { defineConfig } from "@playwright/test";
export default defineConfig({
    testDir: "./src/tests/e2e",
    use: {
        baseURL: "http://127.0.0.1:4175",
        headless: true,
    },
    webServer: {
        command: "VITE_MOCK_MODE=true npm run dev -- --host 127.0.0.1 --port 4175",
        port: 4175,
        reuseExistingServer: false,
    },
});
