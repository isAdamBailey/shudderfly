import { format, parseISO } from "date-fns";

export function useDate() {
    const toDate = (value) => {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value === "string") {
            try {
                // Prefer ISO parsing when the string looks ISO-like
                if (value.includes("T")) {
                    const d = parseISO(value);
                    if (!isNaN(d)) return d;
                }
                // Fallback: let Date handle common non-ISO formats (e.g., "YYYY-MM-DD HH:mm:ss")
                const d2 = new Date(value);
                if (!isNaN(d2)) return d2;
            } catch (e) {
                // ignore and fall through
            }
        }
        // Final fallback
        const d3 = new Date(value);
        return isNaN(d3) ? null : d3;
    };

    const short = (date) => {
        const d = toDate(date);
        return d ? format(d, "PP") : "";
    };

    return { short };
}
