export function useDate() {
    const toDate = (value) => {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value === "string") {
            try {
                const d = new Date(value);
                if (!isNaN(d)) return d;
            } catch (e) {
                // ignore and fall through
            }
        }
        const d2 = new Date(value);
        return isNaN(d2) ? null : d2;
    };

    const short = (date) => {
        const d = toDate(date);
        return d
            ? d.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
              })
            : "";
    };

    return { short };
}
