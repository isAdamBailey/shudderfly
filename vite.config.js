import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
    const isTest = mode === "test" || process.env.NODE_ENV === "test";

    return {
        plugins: [
            // Only include `laravel-vite-plugin` in non-test environments
            !isTest &&
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
        ].filter(Boolean), // Filter out `false` values if `laravel-vite-plugin` is skipped

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
    };
});
