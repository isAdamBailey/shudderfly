import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import laravel from "laravel-vite-plugin";
import { defineConfig } from "vite";

// Vitest leaves the Laravel plugin out: it deletes public/hot whenever a
// process using it exits, so every test run would cut Laravel off from a
// running dev server (pages fall back to the last `npm run build`). Tests
// only need its `@` alias, given below.
const testing = Boolean(process.env.VITEST);

export default defineConfig({
    plugins: [
        !testing &&
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
    resolve: testing
        ? {
              alias: {
                  "@": fileURLToPath(
                      new URL("./resources/js", import.meta.url)
                  ),
              },
          }
        : {},
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./resources/js/vitest.setup.js"],
        include: ["resources/js/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    },
});
