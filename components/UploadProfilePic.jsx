"use client";

import { useState, useRef } from "react";
import Image from "next/image";

export default function UploadProfilePic({ currentPic, onUploadSuccess }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const handleChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            // 1. Get the Cloudinary Signature
            const sigRes = await fetch('/api/upload/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: 'profile_pics' })
            });
            
            if (!sigRes.ok) throw new Error("Failed to get upload signature");
            const sigData = await sigRes.json();

            // 2. Upload directly to Cloudinary
            const formData = new FormData();
            formData.append('file', file); 
            formData.append('api_key', sigData.apiKey);
            formData.append('timestamp', sigData.timestamp);
            formData.append('signature', sigData.signature);
            formData.append('folder', sigData.folder);

            const uploadRes = await fetch(
                `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`, 
                { method: 'POST', body: formData }
            );
            
            const uploadData = await uploadRes.json();

            if (uploadData.secure_url) {
                // 3. Pass the new URL back to the parent to save to MongoDB
                onUploadSuccess(uploadData.secure_url);

                // 4. BACKGROUND CLEANUP: Destroy the old image on Cloudinary
                if (currentPic && currentPic.includes("res.cloudinary.com") && currentPic !== uploadData.secure_url) {
                    // Notice we don't 'await' this. We let it run invisibly in the background
                    // so the user's UI updates instantly without waiting for the deletion.
                    fetch('/api/upload/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: currentPic })
                    }).catch(err => console.error("Failed to delete old profile pic", err));
                }

            } else {
                throw new Error("Cloudinary upload failed");
            }

        } catch (error) {
            console.error("Profile pic upload failed:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsProcessing(false);
            if (event.target) event.target.value = ""; 
        }
    };

    return (
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleChange} 
                disabled={isProcessing}
                className="hidden" 
            />

            <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border border-black/10 overflow-hidden relative bg-neutral-100 flex items-center justify-center">
                {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : currentPic ? (
                    <Image
                        src={currentPic}
                        alt="Profile"
                        fill
                        unoptimized
                        className="object-cover transition-transform group-hover:scale-105"
                    />
                ) : (
                    <span className="text-3xl opacity-20">📷</span>
                )}
                
                {/* Hover Overlay */}
                {!isProcessing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs uppercase tracking-widest font-semibold">Edit</span>
                    </div>
                )}
            </div>
        </div>
    );
}