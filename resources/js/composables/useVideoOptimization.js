import { ref } from 'vue';

export function useVideoOptimization() {
    const compressionProgress = ref(false);
    const optimizationProgress = ref(0);

    // Smart video optimization that reduces size while preserving timeline structure
    async function optimizeVideoForUpload(file) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('video/')) {
                resolve(file);
                return;
            }

            // Check if file needs compression for 60MB validation
            const maxSize = 60 * 1024 * 1024; // 60MB
            if (file.size <= maxSize) {
                optimizationProgress.value = 100;
                resolve(file);
                return;
            }

            const video = document.createElement('video');
            video.muted = false;
            video.playsInline = true;
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                optimizationProgress.value = 10;
                
                try {
                    // Use video stream but with settings optimized for size while preserving structure
                    const stream = video.captureStream(30); // Keep good frame rate for timeline preservation
                    
                    // Calculate bitrate to target ~50MB (under 60MB limit with buffer)
                    const targetSizeMB = 50;
                    const targetBitrate = Math.floor((targetSizeMB * 8 * 1024 * 1024) / video.duration);
                    const clampedBitrate = Math.max(400000, Math.min(2000000, targetBitrate)); // 400kbps - 2Mbps
                    
                    const mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'video/webm;codecs=vp9',
                        videoBitsPerSecond: clampedBitrate,
                    });
                    
                    const chunks = [];
                    
                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            chunks.push(event.data);
                        }
                    };
                    
                    mediaRecorder.onstop = () => {
                        optimizationProgress.value = 100;
                        const blob = new Blob(chunks, { type: 'video/webm' });
                        
                        // Create compressed file
                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                        const compressedFile = new File([blob], `${nameWithoutExt}_compressed.webm`, {
                            type: 'video/webm',
                            lastModified: Date.now()
                        });
                        
                        resolve(compressedFile);
                    };
                    
                    // Track progress during compression
                    video.ontimeupdate = () => {
                        if (video.duration > 0) {
                            const progress = Math.round((video.currentTime / video.duration) * 85) + 10; // 10-95%
                            optimizationProgress.value = Math.min(progress, 95);
                        }
                    };
                    
                    video.onplay = () => {
                        optimizationProgress.value = 15;
                        mediaRecorder.start();
                    };
                    
                    video.onended = () => {
                        optimizationProgress.value = 98;
                        mediaRecorder.stop();
                    };
                    
                    video.onerror = () => {
                        optimizationProgress.value = 0;
                        resolve(file);
                    };
                    
                    video.currentTime = 0;
                    video.play().catch(() => {
                        optimizationProgress.value = 0;
                        resolve(file);
                    });
                    
                } catch {
                    optimizationProgress.value = 0;
                    resolve(file);
                }
            };
            
            video.onerror = () => {
                optimizationProgress.value = 0;
                resolve(file);
            };
            
            video.src = URL.createObjectURL(file);
        });
    }

    async function processMediaFile(file) {
        if (!file) return null;

        try {
            let processedFile = file;
            
            if (file.type.startsWith('video/')) {
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