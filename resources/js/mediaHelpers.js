export function useMedia() {
  const isVideo = (path) => {
    const videoFormats = ["mp4", "avi", "mpeg", "quicktime"];
    return videoFormats.some(function (suffix) {
      return path.endsWith(suffix);
    });
  };

  const isPoster = (path) => {
    return path.includes("poster");
  };

  const isSnapshot = (path) => {
    return path.includes("snapshot");
  };

  return { isVideo, isPoster, isSnapshot };
}
