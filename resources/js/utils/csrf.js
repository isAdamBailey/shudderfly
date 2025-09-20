// Shared CSRF helpers for fetch/XMLHttpRequest calls

export const getMetaCsrfToken = () => {
    try {
        return (
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute("content") || ""
        );
    } catch (_e) {
        return "";
    }
};

export const getXsrfTokenFromCookie = () => {
    try {
        const match = document.cookie
            .split("; ")
            .find((row) => row.startsWith("XSRF-TOKEN="));
        if (!match) return "";
        const raw = match.split("=")[1];
        if (!raw) return "";
        // Laravel sets URL-encoded token in cookie
        return decodeURIComponent(raw);
    } catch (_e) {
        return "";
    }
};

export const getCsrfToken = () => getMetaCsrfToken();

export const refreshCsrf = async () => {
    try {
        const resp = await fetch("/sanctum/csrf-cookie", {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                Accept: "application/json",
            },
        });
        if (resp?.ok) {
            return getMetaCsrfToken() || getXsrfTokenFromCookie();
        }
    } catch (_e) {
        // no-op; fall back to current token
    }
    return getMetaCsrfToken() || getXsrfTokenFromCookie();
};

// Build headers for CSRF verification. Returns { headers, csrfToken }
// - If meta CSRF token available, sets X-CSRF-TOKEN and returns csrfToken for optional _token form field.
// - Else, if XSRF cookie token available, sets X-XSRF-TOKEN; no csrfToken returned for _token field.
export const buildCsrfHeaders = () => {
    const headers = { "X-Requested-With": "XMLHttpRequest" };
    const meta = getMetaCsrfToken();
    const xsrf = getXsrfTokenFromCookie();
    let csrfToken = null;
    if (meta) {
        headers["X-CSRF-TOKEN"] = meta;
        csrfToken = meta;
    }
    if (xsrf) {
        headers["X-XSRF-TOKEN"] = xsrf;
    }
    return { headers, csrfToken };
};
