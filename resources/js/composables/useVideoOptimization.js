import { ref } from "vue";

export function useVideoOptimization() {
  const compressionProgress = ref(false);
  const optimizationProgress = ref(0);

  async function optimizeVideoForUpload(file) {
    return new Promise((resolve) => {
      if (!file.type.startsWith("video/")) {
        resolve(file);
        return;
      }

      const maxSize = 60 * 1024 * 1024;
      if (file.size <= maxSize) {
        optimizationProgress.value = 100;
        resolve(file);
        return;
      }

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      let objectUrl = null;
      let animationFrameId = null;
      let canvas = null;
      let ctx = null;

      const cleanup = () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        video.src = "";
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
          canvas = null;
          ctx = null;
        }
      };

      video.onerror = () => {
        cleanup();
        optimizationProgress.value = 0;
        resolve(file);
      };

      video.onloadedmetadata = () => {
        optimizationProgress.value = 10;

        try {
          const frameRate = 30;

          let targetWidth = video.videoWidth;
          let targetHeight = video.videoHeight;
          const needsScaling = targetWidth > 1920;

          if (needsScaling) {
            const maxWidth = 1920;
            const scale = maxWidth / targetWidth;
            targetWidth = Math.round(targetWidth * scale);
            targetHeight = Math.round(targetHeight * scale);
          }

          const targetSizeMB = 60;
          const targetBitrate = Math.floor(
            (targetSizeMB * 8 * 1024 * 1024) / video.duration
          );
          const clampedBitrate = Math.max(
            200000,
            Math.min(2000000, targetBitrate)
          );

          let stream;

          if (needsScaling) {
            canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx = canvas.getContext("2d");
            stream = canvas.captureStream(frameRate);
          } else {
            stream = video.captureStream(frameRate);
          }
          const codecs = [
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm"
          ];

          let selectedMimeType = codecs[0];
          for (const mimeType of codecs) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
              selectedMimeType = mimeType;
              break;
            }
          }

          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: selectedMimeType,
            videoBitsPerSecond: clampedBitrate
          });

          const chunks = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            optimizationProgress.value = 100;
            const blob = new Blob(chunks, { type: selectedMimeType });
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            const extension = selectedMimeType.includes("webm")
              ? "webm"
              : "mp4";
            const compressedFile = new File(
              [blob],
              `${nameWithoutExt}_compressed.${extension}`,
              {
                type: selectedMimeType,
                lastModified: Date.now()
              }
            );

            cleanup();
            resolve(compressedFile);
          };

          const drawFrame = () => {
            if (!canvas || !ctx) return;
            if (video.ended || video.paused) {
              if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
              }
              return;
            }
            try {
              ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            } catch (err) {
              // ignore
            }
            animationFrameId = requestAnimationFrame(drawFrame);
          };

          video.ontimeupdate = () => {
            if (video.duration > 0) {
              const progress =
                Math.round((video.currentTime / video.duration) * 85) + 10;
              optimizationProgress.value = Math.min(progress, 95);
            }
          };

          video.onplay = () => {
            optimizationProgress.value = 15;
            mediaRecorder.start();
            if (canvas && ctx) {
              drawFrame();
            }
          };

          video.onended = () => {
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
              animationFrameId = null;
            }
            optimizationProgress.value = 98;
            mediaRecorder.stop();
          };

          video.currentTime = 0;
          video.play().catch(() => {
            cleanup();
            optimizationProgress.value = 0;
            resolve(file);
          });
        } catch (err) {
          cleanup();
          optimizationProgress.value = 0;
          resolve(file);
        }
      };

      objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
    });
  }

  async function processMediaFile(file) {
    if (!file) return null;

    try {
      let processedFile = file;

      if (file.type.startsWith("video/")) {
        compressionProgress.value = true;
        processedFile = await optimizeVideoForUpload(file);
      }

      return processedFile;
    } catch {
      return file;
    } finally {
      compressionProgress.value = false;
      optimizationProgress.value = 0;
    }
  }

  function resetProgress() {
    compressionProgress.value = false;
    optimizationProgress.value = 0;
  }

  return {
    compressionProgress,
    optimizationProgress,
    processMediaFile,
    optimizeVideoForUpload,
    resetProgress
  };
}
