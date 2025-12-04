<script setup>
import KioskBoard from "kioskboard";
import "kioskboard/dist/kioskboard-2.3.0.min.css";
import { onMounted, onUnmounted } from "vue";

const props = defineProps({
  inputSelector: {
    type: String,
    required: true,
    default: ".virtual-keyboard-input"
  },
  autoFocus: {
    type: Boolean,
    default: false
  }
});

// Default QWERTY keyboard layout for KioskBoard
// Note: Keys must be strings, not numbers, for KioskBoard to work correctly
const qwertyLayout = [
  {
    0: "Q",
    1: "W",
    2: "E",
    3: "R",
    4: "T",
    5: "Y",
    6: "U",
    7: "I",
    8: "O",
    9: "P"
  },
  {
    0: "A",
    1: "S",
    2: "D",
    3: "F",
    4: "G",
    5: "H",
    6: "J",
    7: "K",
    8: "L"
  },
  { 0: "Z", 1: "X", 2: "C", 3: "V", 4: "B", 5: "N", 6: "M" }
];

let darkModeObserver = null;

const getTheme = () => {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
};

const initializeKeyboard = () => {
  const inputElement = document.querySelector(props.inputSelector);
  if (!inputElement) return;

  const isDarkMode = getTheme() === "dark";

  KioskBoard.init({
    // Default QWERTY keyboard layout
    keysArrayOfObjects: qwertyLayout,
    language: "en",
    theme: isDarkMode ? "dark" : "light",
    allowRealKeyboard: true,
    allowMobileKeyboard: true,
    keysJsonUrl: null,
    keysSpecialCharsArrayOfStrings: [
      "!",
      "@",
      "#",
      "$",
      "%",
      "^",
      "&",
      "*",
      "(",
      ")",
      "-",
      "_",
      "+",
      "=",
      "/",
      "?",
      "|",
      "\\",
      "{",
      "}",
      "[",
      "]",
      '"',
      "'",
      ":",
      ";",
      "~",
      "`",
      "<",
      ">",
      ",",
      "."
    ],
    keysNumpadArrayOfNumbers: null,
    cssAnimations: true,
    cssAnimationsDuration: 360,
    cssAnimationsStyle: "slide",
    keysAllowSpacebar: true,
    keysSpacebarText: "Space",
    keysFontFamily: "sans-serif",
    keysFontSize: "28px",
    keysFontWeight: "normal",
    keysIconSize: "28px",
    keysSymbolSize: "28px"
  });

  KioskBoard.run(props.inputSelector, {
    keysArrayOfObjects: qwertyLayout,
    theme: isDarkMode ? "dark" : "light"
  });

  // Focus input to show keyboard immediately if autoFocus is enabled
  if (props.autoFocus) {
    inputElement.focus();
  }
};

const updateKeyboardTheme = () => {
  const inputElement = document.querySelector(props.inputSelector);
  if (!inputElement) return;

  const isDarkMode = getTheme() === "dark";
  KioskBoard.run(props.inputSelector, {
    keysArrayOfObjects: qwertyLayout,
    theme: isDarkMode ? "dark" : "light"
  });
};

onMounted(() => {
  // Wait for DOM to be ready
  setTimeout(() => {
    initializeKeyboard();
  }, 100);

  // Watch for dark mode changes and update keyboard theme
  darkModeObserver = new MutationObserver(() => {
    updateKeyboardTheme();
  });

  darkModeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"]
  });
});

onUnmounted(() => {
  if (darkModeObserver) {
    darkModeObserver.disconnect();
  }
  // KioskBoard automatically cleans up when the DOM element is removed
  // No explicit destroy method is needed
});
</script>

<template>
  <!-- This component doesn't render anything, it just initializes KioskBoard -->
  <div style="display: none"></div>
</template>

<style>
/* Global styles for KioskBoard - needed because KioskBoard injects into body */
/* Desktop styles for keyboard buttons */
#KioskBoard-VirtualKeyboard .kioskboard-key {
  min-height: 60px;
  min-width: 60px;
  font-size: 28px;
  padding: 12px 16px;
  margin: 4px;
  background-color: red !important;
  color: white !important;

  /* Prevent text selection for better touch interaction */
  -webkit-user-select: none;
  user-select: none;
  /* Improve touch feedback */
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
  touch-action: manipulation;
}

#KioskBoard-VirtualKeyboard .kioskboard-key-space {
  min-width: 300px;
}

#KioskBoard-VirtualKeyboard .kioskboard-key-specialcharacter {
  min-width: 80px;
}

#KioskBoard-VirtualKeyboard .kioskboard-row {
  margin-bottom: 8px;
}

/* Hide the numbers row - first row typically contains numbers */
#KioskBoard-VirtualKeyboard .kioskboard-row:first-child {
  display: none;
}

/* Ensure keyboard is always visible and properly positioned */
#KioskBoard-VirtualKeyboard {
  position: relative;
  margin-top: 20px;
  z-index: 1;
}
@media (max-width: 768px) {
  #KioskBoard-VirtualKeyboard .kioskboard-key,
  #KioskBoard-VirtualKeyboard .kioskboard-key * {
    margin: 5px !important;
    font-size: 30px !important;
  }
}
</style>
