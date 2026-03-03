"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import ShareLinkWidget from "@/components/ShareLinkWidget";

// --- FETCHER ---
const fetchMyProfile = async () => {
  const res = await fetch("/api/users/profile");
  if (!res.ok) throw new Error("Failed to fetch profile");
  const data = await res.json();
  return data.profile;
};

export default function DashboardPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: fetchMyProfile,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2F2EE] flex items-center justify-center text-[#1E1E1C]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-[#1E1E1C] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xs uppercase tracking-widest font-semibold">Loading Command Center...</p>
        </div>
      </div>
    );
  }

  // Fallback if they somehow don't have a profile yet
  const firstName = profile?.firstName || "Model";
  const userId = profile?.userId;

  return (
    <div className="min-h-screen bg-[#F2F2EE] text-[#1E1E1C] pb-32">
      {/* --- HEADER SECTION --- */}
      <header className="pt-32 pb-16 px-6 max-w-[1200px] mx-auto border-b border-black/10">
        <p className="text-xs uppercase tracking-[0.3em] opacity-60 mb-4 font-semibold">Dashboard</p>
        <h1 className="text-5xl md:text-7xl font-serif tracking-tight mb-8">
          Welcome back, <br />
          <span className="italic opacity-90">{firstName}</span>.
        </h1>
        
        {/* Render the Share Widget we just built! */}
        {userId && <ShareLinkWidget userId={userId} />}
      </header>

      <main className="max-w-[1200px] mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* --- LEFT COLUMN: QUICK ACTIONS (8 Cols) --- */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold opacity-50 mb-2">Management</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action Card 1: The Editor */}
            <Link 
              href="/portfolio/edit"
              className="group block p-8 rounded-2xl border border-black/10 bg-white/50 hover:bg-white transition duration-300 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                ✎
              </div>
              <h3 className="text-xl font-serif mb-2">Edit Portfolio</h3>
              <p className="text-sm opacity-60 leading-relaxed">
                Update your gallery, measurements, biography, and background colors.
              </p>
            </Link>

            {/* Action Card 2: Explore / Social (Phase 2 Prep) */}
            <Link 
              href="/explore"
              className="group block p-8 rounded-2xl border border-black/10 bg-white/50 hover:bg-white transition duration-300 shadow-sm hover:shadow-md relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-black/5 text-black px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold">
                Coming Soon
              </div>
              <div className="w-12 h-12 rounded-full bg-neutral-200 text-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                ✦
              </div>
              <h3 className="text-xl font-serif mb-2">Explore Network</h3>
              <p className="text-sm opacity-60 leading-relaxed">
                Discover trending models, agencies, and view your social feed.
              </p>
            </Link>
          </div>
        </div>

        {/* --- RIGHT COLUMN: STATS (4 Cols) --- */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <h2 className="text-xs uppercase tracking-[0.2em] font-semibold opacity-50 mb-2">Analytics</h2>
          
          <div className="p-8 rounded-2xl bg-[#1E1E1C] text-[#F2F2EE] flex flex-col gap-8 shadow-xl">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-60 mb-2">Portfolio Views</p>
              <p className="text-5xl font-serif">
                {profile?.stats?.views || "0"}
              </p>
            </div>
            
            <div className="h-px w-full bg-white/10"></div>
            
            <div>
              <p className="text-xs uppercase tracking-widest opacity-60 mb-2">Network Followers</p>
              <p className="text-4xl font-serif opacity-90">
                {profile?.stats?.followers || "0"}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-widest opacity-40 leading-relaxed">
                Analytics engine currently tracking live data. View count updates every 24 hours.
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}