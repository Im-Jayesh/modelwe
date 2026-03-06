"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import UploadProfilePic from "@/components/UploadProfilePic";
import { useParams } from "next/navigation";
import { getOptimizedUrl } from "@/lib/optimizeImage";
import { useState, useEffect } from "react";
import CreatePostModal from "./CreatePostModal";
import ViewPostModal from "./ViewPostModal"; // <-- IMPORT THE NEW MODAL

// --- FETCHERS ---
const fetchProfile = async (id) => {
  const res = await fetch(`/api/users/profile?id=${id}`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json(); 
};

// Dedicated fetcher for the user's posts grid
const fetchUserPosts = async (userId) => {
  const res = await fetch(`/api/posts?userId=${userId}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
};

export default function ProfilePage({ id, isOwner, initialIsFollowing, myUserId }) {
  const queryClient = useQueryClient();
  const params = useParams();
  const profileId = params?.id;

  // --- LOCAL STATE ---
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing); 
  const [followerCount, setFollowerCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // NEW: State to track which post was clicked in the grid!
  const [selectedPost, setSelectedPost] = useState(null);

  // 1. QUERY: Profile Data (Fast)
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["socialProfile", profileId],
    queryFn: () => fetchProfile(profileId),
    enabled: !!profileId, 
  });

  const profile = profileData?.profile;

  // 2. QUERY: Posts Data
  const { data: postsData, isLoading: isLoadingPosts } = useQuery({
    queryKey: ["userPosts", profile?.userId],
    queryFn: () => fetchUserPosts(profile.userId),
    enabled: !!profile?.userId,
  });

  // Sync state when profile loads
  useEffect(() => {
    if (profile) {
      setFollowerCount(profile.followersCount || 0);
    }
  }, [profile]);

  // --- THE FOLLOW MUTATION ---
  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: profile.userId }),
      });
      if (!res.ok) throw new Error("Failed to toggle follow");
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries(["socialProfile", profileId]);
      const previousProfile = queryClient.getQueryData(["socialProfile", profileId]);

      setIsFollowing(!isFollowing);
      setFollowerCount((prev) => isFollowing ? prev - 1 : prev + 1);

      return { previousProfile };
    },
    onError: (err, variables, context) => {
      setIsFollowing(!isFollowing); 
      setFollowerCount(context.previousProfile?.profile?.followersCount || 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries(["socialProfile", profileId]);
    },
  });

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

  if (isLoadingProfile) {
    return <div className="min-h-screen bg-[#F2F2EE] flex items-center justify-center text-xs uppercase tracking-widest">Loading Profile...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-[#F2F2EE] flex items-center justify-center text-xs uppercase tracking-widest text-red-500">Profile Not Found</div>;
  }

  const realPosts = postsData?.posts || []; 

  return (
    <div className="min-h-screen bg-[#F2F2EE] text-[#1E1E1C] pb-32">
      <main className="max-w-[935px] mx-auto pt-24 px-4 sm:px-6">
        
        {/* --- TOP SECTION: INSTAGRAM STYLE HEADER --- */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center gap-8 md:gap-24 mb-12 border-b border-black/10 pb-12">
          <div className="flex-shrink-0">
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

          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6 mb-6">
              <h1 className="text-2xl font-serif flex items-center gap-2">
                {profile?.username || profile?.firstName?.toLowerCase() || "model"}
                {profile?.isVerified && (
                  <span className="text-blue-500 text-sm" title="Verified Model">✓</span>
                )}
              </h1>
              
              <div className="flex gap-2">
                {isOwner ? (
                  <>
                    <button 
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-4 py-1.5 bg-blue-500 text-white text-xs uppercase tracking-widest font-semibold rounded-md hover:bg-blue-600 shadow-sm transition"
                    >
                      + Post
                    </button>
                    <button className="px-4 py-1.5 bg-[#1E1E1C] text-[#F2F2EE] text-xs uppercase tracking-widest font-semibold rounded-md hover:bg-neutral-800 transition">
                      Edit Profile
                    </button>
                    <button className="px-4 py-1.5 border border-black/20 text-xs uppercase tracking-widest font-semibold rounded-md hover:bg-black/5 transition">
                      Settings
                    </button>
                  </>
                ) : (
                  <>
                     <button 
                      onClick={() => followMutation.mutate()}
                      disabled={followMutation.isPending}
                      className={`px-6 py-1.5 text-xs uppercase tracking-widest font-semibold rounded-md transition-all ${
                        isFollowing 
                          ? "border border-black/20 text-black hover:bg-black/5" 
                          : "bg-blue-500 text-white hover:bg-blue-600 shadow-md"  
                      }`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                    <button className="px-4 py-1.5 border border-black/20 text-xs uppercase tracking-widest font-semibold rounded-md hover:bg-black/5 transition">
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-8 mb-6">
              <p><span className="font-semibold">{profile?.stats?.totalPosts || realPosts.length}</span> <span className="opacity-70 text-sm tracking-wide">posts</span></p>
              <p><span className="font-semibold">{followerCount}</span> <span className="opacity-70 text-sm tracking-wide">followers</span></p>
              <p><span className="font-semibold">{profile?.followingCount || 0}</span> <span className="opacity-70 text-sm tracking-wide">following</span></p>
            </div>

            <div className="text-sm">
              <p className="font-semibold text-base mb-1">{profile?.firstName} {profile?.lastName}</p>
              <p className="opacity-60 text-xs uppercase tracking-widest mb-2">{profile?.category}</p>
              <p className="whitespace-pre-wrap max-w-md leading-relaxed opacity-90">{profile?.bio}</p>
            </div>
          </div>
        </header>

        <div className="flex justify-center gap-12 text-xs uppercase tracking-widest font-semibold opacity-50 mb-6">
          <span className="text-black opacity-100 border-t border-black pt-4 -mt-[1px] cursor-pointer">Posts</span>
          {isOwner && <span className="pt-4 cursor-pointer hover:opacity-100 transition">Saved</span>}
        </div>

        {/* --- POSTS GRID SECTION --- */}
        {isLoadingPosts ? (
           <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin opacity-50"></div>
           </div>
        ) : realPosts.length > 0 ? (
          <div className="flex flex-col items-center w-full mt-8">
            {/* Owner Create Post Button (Centered above grid) */}
            {isOwner && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 mb-8 bg-[#1E1E1C] text-[#F2F2EE] text-xs uppercase tracking-widest font-semibold rounded-full hover:bg-black transition-colors"
              >
                Create Post
              </button>
            )}
            
            {/* 3x3 THUMBNAIL GRID */}
            <div className="grid grid-cols-3 gap-1 md:gap-4 w-full">
              {realPosts.map((post) => (
                <div 
                  key={post._id} 
                  className="aspect-square relative bg-neutral-200 group cursor-pointer"
                  onClick={() => setSelectedPost(post)} // Clicking opens the Modal!
                >
                  <Image src={getOptimizedUrl(post.imageUrl, 400)} alt="Post" fill className="object-cover" unoptimized />
                  
                  {/* Hover State: Shows Likes and Comments */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-6 font-semibold md:text-lg">
                    <span className="flex items-center gap-2">♥ {post.likesCount || 0}</span>
                    <span className="flex items-center gap-2">💬 {post.commentsCount || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        ) : (
          <div className="flex flex-col items-center justify-center py-24 opacity-50 text-center">
            {isOwner && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 mb-6 bg-[#1E1E1C] text-[#F2F2EE] text-xs uppercase tracking-widest font-semibold rounded-full hover:bg-black transition-colors"
              >
                Create First Post
              </button>
            )}
            <span className="text-4xl mb-4">📷</span>
            <p className="text-xl font-serif">No Posts Yet</p>
          </div>
        )}

        {/* --- MODALS --- */}
        <CreatePostModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          profileId={profileId}
        />

        {/* Render the ViewPostModal if a post is clicked */}
        {selectedPost && (
          <ViewPostModal 
            post={realPosts.find(p => p._id === selectedPost._id) || selectedPost}
            onClose={() => setSelectedPost(null)} 
            currentUserId={myUserId}
            author={profile} 
          />
        )}

      </main>
    </div>
  );
}