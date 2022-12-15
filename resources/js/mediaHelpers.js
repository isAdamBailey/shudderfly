export function useMedia() {
    const isVideo = (path) => {
        const videoFormats = ["mp4", "avi", "mpeg", "quicktime"];
        return videoFormats.some(function (suffix) {
            return path.endsWith(suffix);
        });
    };
    return { isVideo };
}
