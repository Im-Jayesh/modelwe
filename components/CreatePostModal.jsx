"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import CaptionInput from "./CaptionInput"; // <-- Import the new mention component

export default function CreatePostModal({ isOpen, onClose, profileId }) {
  const [imageUrl, setImageUrl] = useState("");
  const [localFile, setLocalFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // --- 1. THE CREATION MUTATION (Saves to MongoDB) ---
  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });
      if (!res.ok) throw new Error("Failed to create post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["userPosts", profileId]);
      queryClient.invalidateQueries(["socialProfile", profileId]);
      handleClose();
    },
  });

  // --- 2. LOCAL PREVIEW ---
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  // --- 3. SECURE UPLOAD & SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!localFile) return alert("Please select an image first.");

    setIsUploading(true);

    try {
      const sigRes = await fetch('/api/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'posts' })
      });
      
      if (!sigRes.ok) throw new Error("Failed to get signature");
      const sigData = await sigRes.json();

      const formData = new FormData();
      formData.append('file', localFile);
      formData.append('api_key', sigData.apiKey);
      formData.append('timestamp', sigData.timestamp);
      formData.append('signature', sigData.signature);
      formData.append('folder', sigData.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`, 
        { method: 'POST', body: formData }
      );
      
      const uploadData = await uploadRes.json();
      if (!uploadData.secure_url) throw new Error("Cloudinary upload failed");

      // Save the permanent URL and caption to MongoDB
      createPostMutation.mutate({ imageUrl: uploadData.secure_url, caption });

    } catch (error) {
      console.error("Post creation error:", error);
      alert("Failed to upload post. Please try again.");
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setImageUrl("");
    setLocalFile(null);
    setCaption("");
    setIsUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#F2F2EE] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
        
        {/* --- LEFT: IMAGE PREVIEW --- */}
        <div className="md:w-1/2 bg-neutral-200 aspect-square relative flex flex-col items-center justify-center border-r border-black/10">
          {imageUrl ? (
            <>
              <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
              <button 
                onClick={() => { setImageUrl(""); setLocalFile(null); }}
                disabled={isUploading || createPostMutation.isPending}
                className="absolute top-4 left-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors disabled:hidden"
              >
                ✕
              </button>
            </>
          ) : (
            <div className="text-center p-8 flex flex-col items-center">
              <span className="text-4xl mb-4 block">📷</span>
              <p className="font-serif text-xl mb-6 text-black/80">Select an Image</p>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-3 bg-[#1E1E1C] text-[#F2F2EE] text-xs uppercase tracking-widest font-semibold rounded-full hover:bg-black transition-colors"
              >
                Choose from Device
              </button>
            </div>
          )}
        </div>

        {/* --- RIGHT: CAPTION & SUBMIT --- */}
        <div className="md:w-1/2 p-8 flex flex-col bg-white">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-serif text-2xl">New Post</h2>
            <button 
              onClick={handleClose} 
              disabled={isUploading || createPostMutation.isPending}
              className="text-black/40 hover:text-black transition-colors disabled:opacity-0"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">
            
            {/* --- NEW MENTION INPUT --- */}
            <div className="flex-1">
              <CaptionInput 
                value={caption}
                onChange={setCaption}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/5 mt-auto">
              <span className="text-[10px] text-black/40 font-mono">{caption.length} / 2200</span>
              <button 
                type="submit" 
                disabled={isUploading || createPostMutation.isPending || !localFile}
                className="px-8 py-3 bg-blue-500 text-white text-xs uppercase tracking-widest font-semibold rounded-full hover:bg-blue-600 shadow-md transition-all disabled:opacity-50 disabled:bg-neutral-300 disabled:shadow-none flex items-center gap-2"
              >
                {(isUploading || createPostMutation.isPending) && (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isUploading ? "Uploading..." : createPostMutation.isPending ? "Publishing..." : "Share Post"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}