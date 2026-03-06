"use client";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { getOptimizedUrl } from "@/lib/optimizeImage";

// Added 'author' prop
export default function PostCard({ post, initialIsLiked, currentUserId, author }) {
  const queryClient = useQueryClient();
  
  // 1. SMART AUTHOR RESOLUTION
  // If parent passed it (ProfilePage), use it. 
  // Else, look inside the post object (for the upcoming Explore Feed)
  const postAuthor = author || post.userId || post.userDetails || {};

  // 2. OWNERSHIP CHECK
  const postOwnerId = post.userId?._id || post.userId;
  const isOwner = currentUserId === postOwnerId;

  const [isLiked, setIsLiked] = useState(initialIsLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts?id=${post._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["userPosts"]);
      queryClient.invalidateQueries(["socialProfile"]);
    }
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="flex flex-col gap-3 mb-10 bg-white border-b border-black/5 pb-8">
      {/* --- POST HEADER --- */}
      <div className="flex items-center justify-between px-2">
         <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 relative">
                {/* USE postAuthor HERE */}
                <Image 
                  src={getOptimizedUrl(postAuthor.profilePic) || "/default.png"} 
                  fill 
                  alt="avatar" 
                  className="object-cover"
                />
             </div>
             {/* USE postAuthor HERE */}
             <span className="font-bold text-sm tracking-tight">@{postAuthor.username || postAuthor.firstName}</span>
         </div>

         {isOwner && (
           <div className="relative" ref={menuRef}>
             <button 
               onClick={() => setShowMenu(!showMenu)}
               className="p-2 font-bold tracking-widest hover:bg-black/5 rounded-full transition-colors"
             >
               •••
             </button>

             {showMenu && (
               <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col text-sm font-medium animate-in fade-in slide-in-from-top-2">
                 <button 
                    onClick={() => {
                        setShowMenu(false);
                        alert("Open Edit Modal"); 
                    }}
                    className="px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                 >
                   Edit Caption
                 </button>
                 <button 
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-3 text-left text-red-500 hover:bg-red-50 transition-colors border-t border-black/5"
                 >
                   {deleteMutation.isPending ? "Deleting..." : "Delete Post"}
                 </button>
               </div>
             )}
           </div>
         )}
      </div>

      {/* --- POST IMAGE --- */}
      <div className="w-full aspect-square bg-neutral-100 relative">
        <Image src={getOptimizedUrl(post.imageUrl, 800)} alt="Post" fill className="object-cover" unoptimized />
      </div>

      {/* Action Buttons (Like / Comment / Share) */}
      <div className="flex items-center gap-4 px-2 pt-1">
         {/* ... (Your like button logic remains exactly the same here) ... */}
         <button className="text-black transition-transform active:scale-90">🤍</button>
         <button className="text-black transition-transform active:scale-90">💬</button>
      </div>

      {/* Likes & Caption */}
      <div className="px-2 flex flex-col gap-1">
        <p className="font-bold text-sm">{likesCount} likes</p>
        <p className="text-sm">
          {/* USE postAuthor HERE */}
          <span className="font-bold mr-2">@{postAuthor.username || postAuthor.firstName}</span>
          {post.caption}
        </p>
      </div>
    </div>
  );
}