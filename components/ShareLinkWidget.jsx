"use client";

import { useState } from "react";
import Link from "next/link";

export default function ShareLinkWidget({ userId }) {
    const [copied, setCopied] = useState(false);
    
    // Dynamically generate the full URL based on the environment
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const portfolioUrl = `${baseUrl}/portfolio/${userId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(portfolioUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error("Failed to copy!", err);
        }
    };

    return (
        <div className="bg-white border border-black/10 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full max-w-2xl shadow-sm">
            <div>
                <p className="text-xs uppercase tracking-widest opacity-50 mb-1 font-semibold">Your Live Link</p>
                <Link 
                    href={`/portfolio/${userId}`} 
                    target="_blank" 
                    className="text-sm md:text-base font-medium text-blue-600 hover:underline truncate block max-w-[300px] md:max-w-[400px]"
                >
                    {portfolioUrl}
                </Link>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <button 
                    onClick={handleCopy}
                    className="flex-1 sm:flex-none px-4 py-2 bg-black text-white text-xs uppercase tracking-widest rounded-full hover:bg-neutral-800 transition"
                >
                    {copied ? "Copied! ✓" : "Copy Link"}
                </button>
                <Link 
                    href={`/portfolio/${userId}`} 
                    target="_blank"
                    className="px-4 py-2 border border-black/20 text-black text-xs uppercase tracking-widest rounded-full hover:bg-black/5 transition text-center"
                >
                    Preview
                </Link>
            </div>
        </div>
    );
}