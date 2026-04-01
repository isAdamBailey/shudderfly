export function useMedia() {
    const isVideo = (path) => {
        if (!path || typeof path !== "string") {
            return false;
        }
        const base = path.split("?")[0].split("#")[0].toLowerCase();
        const videoFormats = [".mp4", ".avi", ".mpeg", ".mov", ".webm"];
        return videoFormats.some((suffix) => base.endsWith(suffix));
    };

    const isPoster = (path) => {
        return path.includes("poster");
    };

    const isSnapshot = (path) => {
        return path.includes("snapshot");
    };

    return { isVideo, isPoster, isSnapshot };
}
