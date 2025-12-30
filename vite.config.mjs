import vue from "@vitejs/plugin-vue";
import laravel from "laravel-vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        laravel({
            input: "resources/js/app.js",
            refresh: true,
        }),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
    ],
    define: {
        __BUILD_TIMESTAMP__: JSON.stringify(
            new Date().toISOString().split("T")[0]
        ),
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./resources/js/vitest.setup.js"],
        include: ["resources/js/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    },
});
