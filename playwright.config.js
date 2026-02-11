import { defineConfig } from "@playwright/test";
export default defineConfig({
    testDir: "./src/tests/e2e",
    use: {
        baseURL: "http://localhost:4173",
        headless: true,
    },
    projects: [
        {
            name: "desktop",
            use: {
                viewport: { width: 1280, height: 800 },
            },
        },
        {
            name: "mobile",
            use: {
                viewport: { width: 375, height: 812 },
                isMobile: true,
                hasTouch: true,
            },
        },
    ],
    webServer: {
        command: "npm run dev -- --port 4173",
        port: 4173,
        reuseExistingServer: !process.env.CI,
    },
});
