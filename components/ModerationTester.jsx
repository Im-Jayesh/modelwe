"use client";

import { useState } from "react";
import { isPostSafe } from "@/lib/moderation"; // Adjust path if needed

export default function ModerationTester() {
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);

  const handleTest = async (e) => {
    e.preventDefault();
    
    // Require at least one field to test
    if (!imageUrl && !caption) {
      setResult({ safe: false, message: "Please enter an image URL or a caption to test." });
      return;
    }

    setIsChecking(true);
    setResult(null); // Clear previous results

    try {
      // Call the all-in-one function from your lib folder
      const isSafe = await isPostSafe(imageUrl, caption);
      
      if (isSafe) {
        setResult({ safe: true, message: "✅ Content is safe and good to go!" });
      } else {
        setResult({ safe: false, message: "🚨 Flagged! This content violates safety guidelines." });
      }
    } catch (error) {
      console.error("Test failed:", error);
      setResult({ safe: false, message: "⚠️ Error running the check. Check your browser console." });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 mt-10 bg-white border rounded-xl shadow-sm font-sans">
      <h2 className="text-xl font-bold mb-4">AI Moderation Tester</h2>
      
      <form onSubmit={handleTest} className="flex flex-col gap-4">
        
        {/* Image URL Input */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Image URL</label>
          <input 
            type="url" 
            placeholder="https://example.com/photo.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <p className="text-xs text-gray-500">
            Note: Some external images might block testing due to CORS policies.
          </p>
        </div>

        {/* Caption Input */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Caption Text</label>
          <textarea
            placeholder="Type a test caption here..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="border p-2 rounded h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Run Test Button */}
        <button 
          type="submit" 
          disabled={isChecking}
          className="mt-2 bg-slate-900 text-white p-3 rounded-lg font-semibold hover:bg-slate-800 disabled:bg-slate-400 transition-colors"
        >
          {isChecking ? "Analyzing with AI..." : "Run Safety Check"}
        </button>
        
      </form>

      {/* Results Display */}
      {result && (
        <div className={`mt-6 p-4 rounded-lg font-medium border ${
          result.safe 
            ? "bg-green-50 text-green-800 border-green-200" 
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
}