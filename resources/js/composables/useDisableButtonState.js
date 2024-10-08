import { ref, onMounted, onUnmounted } from "vue";

export function useButtonState() {
    const buttonsDisabled = ref(true);
    let pollingInterval = null;

    function setTimestamp() {
        const futureTime = new Date().getTime() + 4 * 60 * 60 * 1000; // 4 hours from now
        localStorage.setItem("buttonsDisabledUntil", futureTime.toString());
        checkTimestamp();
    }

    function checkTimestamp() {
        const now = new Date().getTime();
        const disabledUntil = localStorage.getItem("buttonsDisabledUntil");
        buttonsDisabled.value = now < disabledUntil;
    }

    function startPolling() {
        if (pollingInterval) return;
        pollingInterval = setInterval(checkTimestamp, 1000);
    }

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            stopPolling();
        } else {
            startPolling();
        }
    }

    onMounted(() => {
        document.addEventListener("visibilitychange", handleVisibilityChange);
        startPolling();
    });

    onUnmounted(() => {
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange
        );
        stopPolling();
    });

    return {
        buttonsDisabled,
        setTimestamp,
        checkTimestamp,
    };
}
