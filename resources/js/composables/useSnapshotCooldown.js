import { onMounted, ref } from 'vue';

export const COOLDOWN_MINUTES = 20;
export const COOLDOWN_KEY = 'global_snapshot_cooldown';

export function useSnapshotCooldown() {
    const isOnCooldown = ref(false);
    const remainingMinutes = ref(0);

    const updateRemainingTime = () => {
        const lastSnapshot = localStorage.getItem(COOLDOWN_KEY);
        if (lastSnapshot) {
            const cooldownEnds = new Date(parseInt(lastSnapshot));
            const now = new Date();
            if (now < cooldownEnds) {
                const diffMs = cooldownEnds - now;
                remainingMinutes.value = Math.ceil(diffMs / (1000 * 60));
            } else {
                remainingMinutes.value = 0;
            }
        } else {
            remainingMinutes.value = 0;
        }
    };

    const checkCooldown = () => {
        const lastSnapshot = localStorage.getItem(COOLDOWN_KEY);
        if (lastSnapshot) {
            const cooldownEnds = new Date(parseInt(lastSnapshot));
            const now = new Date();
            if (now < cooldownEnds) {
                isOnCooldown.value = true;
                updateRemainingTime();
                // Set interval to update remaining time
                const interval = setInterval(() => {
                    updateRemainingTime();
                }, 1000);
                // Set timeout to clear interval and cooldown
                setTimeout(() => {
                    clearInterval(interval);
                    isOnCooldown.value = false;
                    remainingMinutes.value = 0;
                    localStorage.removeItem(COOLDOWN_KEY);
                }, cooldownEnds - now);
            } else {
                localStorage.removeItem(COOLDOWN_KEY);
            }
        }
    };

    const setCooldown = () => {
        const cooldownEnds = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
        localStorage.setItem(COOLDOWN_KEY, cooldownEnds.getTime().toString());
        isOnCooldown.value = true;
        remainingMinutes.value = COOLDOWN_MINUTES;
    };

    const resetCooldown = () => {
        localStorage.removeItem(COOLDOWN_KEY);
        isOnCooldown.value = false;
        remainingMinutes.value = 0;
    };

    onMounted(() => {
        checkCooldown();
    });

    return {
        isOnCooldown,
        remainingMinutes,
        setCooldown,
        resetCooldown,
        checkCooldown
    };
} 