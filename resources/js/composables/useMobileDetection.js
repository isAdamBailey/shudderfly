import { useMediaQuery } from "@vueuse/core";
import { computed } from "vue";

export function useMobileDetection() {
  // Use VueUse's useMediaQuery for reliable screen size detection
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  const isDesktop = useMediaQuery("(min-width: 1025px)");

  // Simple browser detection using user agent
  const userAgent = computed(() => {
    if (typeof window === "undefined") return "";
    return navigator.userAgent.toLowerCase();
  });

  const isIOS = computed(() => /iphone|ipad|ipod/i.test(userAgent.value));
  const isAndroid = computed(() => /android/i.test(userAgent.value));
  const isSafari = computed(
    () => /safari/i.test(userAgent.value) && !/chrome/i.test(userAgent.value)
  );
  const isChrome = computed(
    () => /chrome/i.test(userAgent.value) && !/edge/i.test(userAgent.value)
  );
  const isFirefox = computed(() => /firefox/i.test(userAgent.value));

  // Check if PDF embedding is likely to work
  const canEmbedPDF = () => {
    // Desktop browsers generally handle PDFs better
    if (isDesktop.value) return true;

    // Mobile browsers often have issues with PDF iframes
    if (isMobile.value) return false;

    // Tablet browsers can be hit or miss
    if (isTablet.value) return false;

    return true;
  };

  return {
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    canEmbedPDF
  };
}
