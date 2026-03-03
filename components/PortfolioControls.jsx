"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PortfolioControls({ theme, setTheme, isOwner }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const { id } = useParams();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/portfolio/${id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === "first" ? "second" : "first");
  };

  // If a casting agency is viewing the portfolio, they shouldn't see these controls!
  // We only render this dock if the person viewing it is the owner.
  if (!isOwner) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 bg-white/80 backdrop-blur-md border border-black/10 rounded-full shadow-2xl">
      
      <button 
        onClick={toggleTheme}
        title="Toggle Theme"
        className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 text-black transition-colors"
      >
        <span className="text-xs font-serif font-bold">{theme === "first" ? "I" : "II"}</span>
      </button>

      <div className="w-px h-6 bg-black/10 mx-2"></div>

      <button
        onClick={handleShare}
        className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold px-4 py-3 rounded-full hover:bg-black/5 transition-colors w-24 flex justify-center"
      >
        {copied ? "Copied ✓" : "Share"}
      </button>

      <button
        onClick={() => console.log("PDF Generation")}
        className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold px-4 py-3 rounded-full hover:bg-black/5 transition-colors"
      >
        PDF
      </button>

      <div className="w-px h-6 bg-black/10 mx-2"></div>

      <button
        onClick={() => router.push(`/portfolio/edit`)}
        className="text-[10px] uppercase tracking-widest font-bold px-6 py-3 rounded-full bg-[#1E1E1C] text-[#F2F2EE] hover:bg-black transition-colors"
      >
        Edit
      </button>
    </div>
  );
}