"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

export default function UploadHeroImage({ setFileUrl, defaultPic }) {
    const [file, setFile] = useState(defaultPic || null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    // Keep the local state in sync if the database provides a default picture
    useEffect(() => {
        if (defaultPic) setFile(defaultPic);
    }, [defaultPic]);

    const handleChange = async (event) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        setIsProcessing(true);
        try {
            // 1. Remove the background (Your existing local logic)
            const { removeBackground } = await import("@imgly/background-removal");
            const processedBlob = await removeBackground(selectedFile);
            
            // Show a temporary local preview immediately so the UI feels fast
            const tempUrl = URL.createObjectURL(processedBlob);
            setFile(tempUrl);

            // 2. Ask our Next.js API for the Cloudinary Signature
            const sigRes = await fetch('/api/upload/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: 'portfolio_hero' })
            });
            
            if (!sigRes.ok) throw new Error("Failed to get upload signature");
            const sigData = await sigRes.json();

            // 3. Prepare the package for Cloudinary
            const formData = new FormData();
            formData.append('file', processedBlob); 
            formData.append('api_key', sigData.apiKey);
            formData.append('timestamp', sigData.timestamp);
            formData.append('signature', sigData.signature);
            formData.append('folder', sigData.folder);

            // 4. Send it directly to Cloudinary!
            const uploadRes = await fetch(
                `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`, 
                { method: 'POST', body: formData }
            );
            
            const uploadData = await uploadRes.json();

            if (uploadData.secure_url) {
                // 5. Success! Update the UI and tell the parent component to save this to the DB
                setFile(uploadData.secure_url);
                setFileUrl(uploadData.secure_url);
            } else {
                throw new Error("Cloudinary upload failed");
            }

        } catch (error) {
            console.error("Image processing/upload failed:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsProcessing(false);
            if (event.target) event.target.value = ""; 
        }
    };

    const handleEditClick = (e) => {
        e.preventDefault(); 
        e.stopPropagation(); 
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleChange} 
                disabled={isProcessing}
                className="hidden" 
            />

            <div className={`relative flex flex-col items-center justify-center transition-all ${!file ? 'w-64 h-64 border-2 border-dashed border-neutral-400 bg-neutral-100/30 rounded-xl hover:bg-neutral-100/50 cursor-pointer' : ''}`}
                 onClick={!file ? handleEditClick : undefined}>
                
                {isProcessing && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 rounded-xl">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-sm font-medium text-neutral-600 text-center px-2">Processing & Uploading...</p>
                    </div>
                )}

                {!file && !isProcessing && (
                    <div className="text-center p-4">
                        <span className="text-3xl block mb-2">📸</span>
                        <p className="mt-2 text-sm text-neutral-500">Upload Hero Image</p>
                    </div>
                )}

                {file && (
                    <div className="group relative">
                        <Image
                            src={file}
                            alt="Hero Preview"
                            width={657}
                            height={1227}
                            unoptimized
                            priority
                            className="block md:pt-20 pt-6 rounded-lg shadow-sm transition-opacity group-hover:opacity-90 max-h-[90vh] w-auto object-cover"
                        />
                        {!isProcessing && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                <button
                                    type="button" 
                                    className="absolute w-12 h-12 rounded-full backdrop-blur-md bg-black/50 border border-white/30 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-black/70 cursor-pointer flex items-center justify-center"
                                    onClick={handleEditClick} 
                                    aria-label="Edit image"
                                >
                                    ✎
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}