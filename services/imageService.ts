
/**
 * Service for client-side image processing, compression, and conversion.
 */
export const imageService = {
    /**
     * Compresses an image and converts it to WebP format.
     * @param file The original image file.
     * @param maxWidth Maximum width for the compressed image (default 1920px).
     * @param quality Quality factor between 0 and 1 (default 0.75).
     * @returns A promise that resolves to a data URL string.
     */
    compressAndConvertToWebP: async (file: File, maxWidth: number = 1920, quality: number = 0.75): Promise<string> => {
        return new Promise((resolve, reject) => {
            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                reject(new Error('File is not an image'));
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions while maintaining aspect ratio
                    if (width > maxWidth) {
                        const scaleFactor = maxWidth / width;
                        height = Math.round(height * scaleFactor);
                        width = maxWidth;
                        console.log(`[ImageService] Downscaling image from ${img.width}x${img.height} to ${width}x${height}`);
                    } else {
                        console.log(`[ImageService] Image width (${width}px) is smaller than limit (${maxWidth}px). Keeping original dimensions.`);
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context not available'));
                        return;
                    }

                    // Use high-quality image smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to WebP
                    let dataUrl = canvas.toDataURL('image/webp', quality);

                    // Fallback to JPEG if WebP is not supported by the browser
                    if (!dataUrl.startsWith('data:image/webp')) {
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    console.log(`Original size: ${(file.size / 1024).toFixed(2)} KB`);
                    console.log(`Compressed size: ${(dataUrl.length * 0.75 / 1024).toFixed(2)} KB`);

                    resolve(dataUrl);
                };
                img.onerror = () => reject(new Error('Failed to load image for processing'));
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
        });
    },

    /**
     * Compresses the image and uploads it to the server (R2).
     * GIF files are uploaded without conversion to preserve animation.
     * @param file Original file
     * @param maxWidth Maximum width (default 1920px)
     * @param quality Quality factor (default 0.9)
     * @returns Public URL of the uploaded image
     */
    uploadImage: async (file: File, maxWidth: number = 1920, quality: number = 0.9): Promise<string> => {
        let uploadFile: File;

        // Check if file is a GIF - upload without conversion to preserve animation
        if (file.type === 'image/gif') {
            console.log(`Uploading GIF without conversion: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
            uploadFile = file;
        } else {
            // 1. Compress to high quality WebP
            const dataUrl = await imageService.compressAndConvertToWebP(file, maxWidth, quality);

            // 2. Convert Data URL to Blob
            const res = await fetch(dataUrl);
            const blob = await res.blob();

            // 3. Prepare File for upload (rename to .webp)
            const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            uploadFile = new File([blob], fileName, { type: 'image/webp' });
        }

        // 4. Upload via API
        const formData = new FormData();
        formData.append('file', uploadFile);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json() as { error?: string };
            throw new Error(err.error || 'Image upload failed');
        }

        const data = await response.json() as { url: string };
        return data.url;
    },

    /**
     * Uploads a video file to the server (R2) without modification.
     * @param file Video file (MP4, WebM, etc.)
     * @returns Public URL of the uploaded video
     */
    uploadVideo: async (file: File): Promise<string> => {
        // Validate video type
        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (!validTypes.includes(file.type) && !file.type.startsWith('video/')) {
            throw new Error('Invalid video format. Please use MP4 or WebM.');
        }

        console.log(`Uploading video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json() as { error?: string };
            throw new Error(err.error || 'Video upload failed');
        }

        const data = await response.json() as { url: string };
        return data.url;
    }
};
