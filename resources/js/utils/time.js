// "m:ss" for a number of seconds (whole seconds, rounded down).
export function formatClock(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
