import SearchSystem from "@/components/SearchSystem";
import ExploreFeed from "@/components/ExploreFeed"; // Make sure this path is correct!
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function ExplorePage() {
  // 1. Securely fetch the current user's ID on the server
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  let currentUserId = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.SECRET);
      currentUserId = decoded.userId || decoded.id || decoded._id;
    } catch (error) {
      // Invalid token, safely ignore (user will just see feed as a guest)
    }
  }

  return (
    // Changed to #F2F2EE to beautifully match your Profile Page & Post Cards!
    <div className="min-h-screen bg-[#F2F2EE] text-[#1E1E1C] flex flex-col items-center pt-24 px-0 sm:px-6 relative overflow-x-hidden">
      
      {/* Subtle Background Glow (Updated for light theme) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-white/60 blur-[100px] rounded-full pointer-events-none z-0"></div>

      {/* Main Content Wrapper - Responsive sizing */}
      <div className="w-full max-w-xl z-10 flex flex-col items-center">
        
        {/* Search System - Pinned near top */}
        <div className="w-full px-4 sm:px-0 mb-2">
          <SearchSystem />
        </div>

        {/* The Infinite Algorithm Feed */}
        <div className="w-full">
          <ExploreFeed currentUserId={currentUserId} />
        </div>
        
      </div>
    </div>
  );
}