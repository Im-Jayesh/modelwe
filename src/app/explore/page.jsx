import SearchSystem from "@/components/SearchSystem";
import Link from "next/link";

export default function ExploreComingSoon() {
  return (
    <div className="min-h-screen bg-[#1E1E1C] text-[#F2F2EE] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <SearchSystem />
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 blur-[120px] rounded-full pointer-events-none"></div>

     
    </div>
  );
}