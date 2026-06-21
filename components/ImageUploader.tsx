
import React, { useRef, useState } from 'react';

interface ImageUploaderProps {
    imageUrl?: string;
    onImageUpload: (file: File) => Promise<string>;
    onUrlChange: (url: string) => void;
    label?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
    imageUrl,
    onImageUpload,
    onUrlChange,
    label = 'Thumbnail / Cover Image'
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const url = await onImageUpload(file);
            onUrlChange(url);
        } catch (error) {
            console.error('Image upload failed', error);
            alert('Failed to upload image');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <label className="text-[12px] font-bold text-[#666666] uppercase tracking-widest pl-1">
                {label}
            </label>

            <div className="group relative w-full h-[300px] bg-[#ffffff] rounded-[8px] overflow-hidden border border-dashed border-[#e5e5e5] hover:border-[#4169E1] transition-colors flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>

                {imageUrl ? (
                    <>
                        <img
                            src={imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-medium bg-[#4169E1]/85 px-6 py-3 rounded-full backdrop-blur-md">Change Image</span>
                        </div>
                    </>
                ) : (
                    <div className="text-center p-6">
                        <div className="w-16 h-16 bg-[#ffffff] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-[#111111] border border-[#e5e5e5]">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-[#111111] font-semibold text-lg mb-1">Click to upload image</p>
                        <p className="text-[#666666] text-sm">SVG, PNG, JPG or GIF (max. 5MB)</p>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-[#4169E1] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
};
