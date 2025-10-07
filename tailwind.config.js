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
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ["Nunito", ...defaultTheme.fontFamily.sans],
                heading: ["Spicy Rice", ...defaultTheme.fontFamily.sans],
                content: ["Newsreader", ...defaultTheme.fontFamily.sans],
            },
            colors: {
                christmas: {
                    red: "#D42426",
                    green: "#165B33",
                    gold: "#FFD700",
                    silver: "#C0C0C0",
                    pine: "#2D5A27",
                    holly: "#00843D",
                    berry: "#BE0B31",
                    snow: "#F8F8FF",
                    candy: "#EE204D",
                    mint: "#2AC8A4",
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
            addVariant("christmas", '[data-theme="christmas"] &');
            addVariant("fireworks", '[data-theme="fireworks"] &');
            addVariant("halloween", '[data-theme="halloween"] &');
        }),
    ],
};
