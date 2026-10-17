const defaultTheme = require("tailwindcss/defaultTheme");
const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
        "./vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php",
        "./storage/framework/views/*.php",
        "./resources/views/**/*.blade.php",
        "./resources/js/**/*.vue",
        // Shared class-name constants live in plain JS modules, so Tailwind has to
        // scan those too. Listed individually rather than globbing all of
        // resources/js/**/*.js, which would also scan .test.js files and emit
        // utilities for class names that only ever appear in test fixtures.
        "./resources/js/Components/actionMenuItem.js",
        "./resources/js/Components/Messages/sharedMedia.js",
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ["Nunito", ...defaultTheme.fontFamily.sans],
                heading: ["Spicy Rice", ...defaultTheme.fontFamily.sans],
                content: ["Newsreader", ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // Storybook Christmas: two greens far enough apart to tell,
                // two reds, a warm antique gold (on dark surfaces only: it
                // fails contrast on snow), and ice blue in place of silver
                // and mint. `night` is the page backdrop (app.css).
                christmas: {
                    spruce: "#0F3D2E",
                    evergreen: "#1F6B45",
                    cranberry: "#B3192B",
                    poinsettia: "#D7263D",
                    gold: "#E8B547",
                    candle: "#F4D58D",
                    ice: "#9CC7E4",
                    snow: "#F7F9FC",
                    night: "#0E1B33",
                },
                halloween: {
                    orange: "#FF6600",
                    purple: "#6B2D8F",
                    black: "#1A1A1A",
                    pumpkin: "#FF7518",
                    midnight: "#2B1B3D",
                    witch: "#4B0082",
                    ghost: "#F5F5F5",
                    candy: "#FF8C42",
                    spooky: "#8B4789",
                    moonlight: "#E6E6FA",
                },
            },
        },
    },

    plugins: [
        require("@tailwindcss/forms"),
        require("@tailwindcss/typography"),
        plugin(function ({ addVariant }) {
            // The `html` prefix is deliberate: without it these tie with
            // Tailwind's `dark:` variant (both 0,2,0) and lose on source
            // order, so every seasonal utility was a no-op for anyone in dark
            // mode (<html> gets `dark` from ThemeToggle/OS preference, not
            // always). See resources/css/app.css.
            addVariant("christmas", 'html[data-theme="christmas"] &');
            addVariant("fireworks", 'html[data-theme="fireworks"] &');
            addVariant("halloween", 'html[data-theme="halloween"] &');
        }),
    ],
};
