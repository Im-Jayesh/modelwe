"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import UploadProfilePic from "@/components/UploadProfilePic";
import { useParams } from "next/navigation"; // 1. IMPORT useParams
import { getOptimizedUrl } from "@/lib/optimizeImage";

// --- FETCHER ---
// 2. UPDATE FETCHER to take an ID
const fetchProfile = async (id) => {
  const res = await fetch(`/api/users/profile?id=${id}`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  const data = await res.json();
  return data; // Return the whole payload so we can check `isOwner`
};

export default function ProfilePage({id, isOwner}) {
  const queryClient = useQueryClient();
  const params = useParams(); // 3. GET ID FROM URL
  const profileId = params?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["socialProfile", profileId],
    queryFn: () => fetchProfile(profileId),
    enabled: !!profileId, // Only run query if we have an ID
  });

  const profile = data?.profile; // 4. DETERMINE OWNERSHIP

  // --- MUTATION FOR PROFILE PIC ---
  const saveProfileMutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error("Failed to update profile");
    },
    onSuccess: () => queryClient.invalidateQueries(["socialProfile", profileId]),
  });

  const handleProfilePicUpdate = (newUrl) => {
    saveProfileMutation.mutate({ profilePic: newUrl });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#F2F2EE] flex items-center justify-center text-xs uppercase tracking-widest">Loading Profile...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-[#F2F2EE] flex items-center justify-center text-xs uppercase tracking-widest text-red-500">Profile Not Found</div>;
  }

  // Placeholder posts for Phase 2
  const dummyPosts = profile?.images?.slice(1) || []; 

  return (
    <div className="min-h-screen bg-[#F2F2EE] text-[#1E1E1C] pb-32">
      <main className="max-w-[935px] mx-auto pt-24 px-4 sm:px-6">
        
        {/* --- TOP SECTION: INSTAGRAM STYLE HEADER --- */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center gap-8 md:gap-24 mb-12 border-b border-black/10 pb-12">
          
          {/* Avatar Column */}
          <div className="flex-shrink-0">
             {/* 5. ONLY ALLOW UPLOAD IF OWNER */}
             {isOwner ? (
                <UploadProfilePic currentPic={getOptimizedUrl(profile?.profilePic)} onUploadSuccess={handleProfilePicUpdate} />
             ) : (
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border border-black/10 relative">
                   {profile?.profilePic ? (
                     <Image src={getOptimizedUrl(profile.profilePic)} alt="Profile" fill unoptimized className="object-cover" />
                   ) : (
                     <div className="w-full h-full bg-neutral-300 flex items-center justify-center text-3xl font-serif">
                       {profile?.firstName?.charAt(0) || "M"}
                     </div>
                   )}
                </div>
             )}
          </div>

          {/* Info Column */}
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6 mb-6">
              <h1 className="text-2xl font-serif flex items-center gap-2">
                {profile?.username || profile?.firstName?.toLowerCase() || "model"}
                {profile?.isVerified && (
                  <span className="text-blue-500 text-sm" title="Verified Model">✓</span>
                )}
              </h1>
              
              <div className="flex gap-2">
                {/* 6. CONDITIONAL BUTTONS: Owner vs Visitor */}
                {isOwner ? (
                  <>
                    <button className="px-4 py-1.5 bg-[#1E1E1C] text-[#F2F2EE] text-xs uppercase tracking-widest font-semibold rounded-md hover:bg-neutral-800 transition">
                      Edit Profile
                    </button>
                    <button className="px-4 py-1.5 border border-black/20 text-xs uppercase tracking-widest font-semibold rounded-md hover:bg-black/5 transition">
                      Settings
                    </button>
                  </>
                ) : (
                  <>
                     <button className="px-6 py-1.5 bg-blue-500 text-white text-xs uppercase tracking-widest font-semibold rounded-md hover:bg-blue-600 transition">
                      Follow
                    </button>
                    <button className="px-4 py-1.5 border border-black/20 text-xs uppercase tracking-widest font-semibold rounded-md hover:bg-black/5 transition">
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-8 mb-6">
              <p><span className="font-semibold">{dummyPosts.length}</span> <span className="opacity-70 text-sm tracking-wide">posts</span></p>
              <p><span className="font-semibold">{profile?.followers?.length || 0}</span> <span className="opacity-70 text-sm tracking-wide">followers</span></p>
              <p><span className="font-semibold">{profile?.following?.length || 0}</span> <span className="opacity-70 text-sm tracking-wide">following</span></p>
            </div>

            {/* Bio Section */}
            <div className="text-sm">
              <p className="font-semibold text-base mb-1">{profile?.firstName} {profile?.lastName}</p>
              <p className="opacity-60 text-xs uppercase tracking-widest mb-2">{profile?.category}</p>
              <p className="whitespace-pre-wrap max-w-md leading-relaxed opacity-90">{profile?.bio}</p>
              <a href={`/portfolio/${profile?.userId}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline font-medium mt-2 inline-block">
                modelwe.com/portfolio/{profile?.userId}
              </a>
            </div>
          </div>
        </header>

        {/* --- TABS --- */}
        <div className="flex justify-center gap-12 text-xs uppercase tracking-widest font-semibold opacity-50 mb-6">
          <span className="text-black opacity-100 border-t border-black pt-4 -mt-[1px] cursor-pointer">Posts</span>
          {/* Only show "Saved" tab if it's the owner */}
          {isOwner && <span className="pt-4 cursor-pointer hover:opacity-100 transition">Saved</span>}
        </div>

        {/* --- POSTS GRID --- */}
        {dummyPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 md:gap-6">
            {dummyPosts.map((post, index) => (
              <div key={index} className="aspect-square relative group bg-neutral-200 cursor-pointer">
                <Image
                  src={post.url || post} // fallback if dummyPosts is just strings
                  alt={`Post ${index}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-6">
                  {/* Placeholder for likes/comments counts in Phase 2 */}
                  <span className="font-semibold">♥ 124</span>
                  <span className="font-semibold">💬 12</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 opacity-50 text-center">
            <span className="text-4xl mb-4">📷</span>
            <p className="text-xl font-serif">No Posts Yet</p>
          </div>
        )}

      </main>
    </div>
  );
}