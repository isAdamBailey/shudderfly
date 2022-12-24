import { format, parseISO } from "date-fns";

export function useDate() {
    const short = (date) => format(parseISO(date), "PP");

    return { short };
}
