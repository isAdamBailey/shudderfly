import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import vue from "@vitejs/plugin-vue";

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
        exclude: ["node_modules", "dist"],
    },
});
