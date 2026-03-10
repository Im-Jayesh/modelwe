"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedUrl } from "@/lib/optimizeImage";
import ViewPostModal from "./ViewPostModal"; // <-- IMPORT YOUR MODAL!

export default function PostCard({ post, currentUserId, author }) {
  const queryClient = useQueryClient();
  
  // Smart Author Resolution
  const postAuthor = author || post.userDetails || post.userId || {};
  
  // THE FIX: Always grab the Auth User ID, never the Profile Document ID!
  const postOwnerId = post.userId?._id || post.userId || postAuthor?.userId;
  const isOwner = String(currentUserId) === String(postOwnerId);

  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  
  const [showMenu, setShowMenu] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // <-- TRACK MODAL STATE
  
  const menuRef = useRef(null);
  const heartTimeoutRef = useRef(null);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  useEffect(() => {
    setLikesCount(post.likesCount || 0);
    if (post.isLikedByMe !== undefined) setIsLiked(post.isLikedByMe);
  }, [post]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post._id }),
      });
      if (!res.ok) throw new Error("Failed to toggle like");
      return res.json();
    },
    onMutate: async () => {
      const prevLiked = isLiked;
      const prevCount = likesCount;
      setIsLiked(v => !v);
      setLikesCount(c => (prevLiked ? Math.max(0, c - 1) : c + 1));
      return { prevLiked, prevCount };
    },
    onError: (err, variables, context) => {
      if (context) {
        setIsLiked(context.prevLiked);
        setLikesCount(context.prevCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(["explorePosts"]); // <-- Refresh Explore feed
    }
  });

  const handleImageDoubleClick = () => {
    if (!isLiked) likeMutation.mutate();
    if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
    setShowHeartAnim(true);
    heartTimeoutRef.current = setTimeout(() => setShowHeartAnim(false), 1000);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts?id=${post._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["explorePosts"]);
    }
  });

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post._id}`; 
    if (navigator.share) {
      try { await navigator.share({ title: `Post by @${postAuthor.username}`, url: postUrl }); } 
      catch (err) {}
    } else {
      navigator.clipboard.writeText(postUrl);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 mb-10 bg-white border-b border-black/5 pb-8" >
        <div className="flex items-center justify-between px-2">
           <Link href={`/profile/${postOwnerId}`} className="flex items-center gap-3 group">
               <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 relative">
                  <Image src={getOptimizedUrl(postAuthor.profilePic) || "/default-avatar.webp"} fill alt="avatar" className="object-cover group-hover:scale-105 transition-transform" />
               </div>
               <span className="font-bold text-sm tracking-tight group-hover:text-black/70 transition-colors">
                 @{postAuthor.username || postAuthor.firstName || "model"}
               </span>
           </Link>

           {isOwner && (
             <div className="relative" ref={menuRef}>
               <button onClick={() => setShowMenu(!showMenu)} className="p-2 font-bold tracking-widest hover:bg-black/5 rounded-full transition-colors">•••</button>
               {showMenu && (
                 <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col text-sm animate-in fade-in">
                   <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-4 py-3 text-left text-red-500 hover:bg-red-50 font-semibold transition-colors">
                     {deleteMutation.isPending ? "Deleting..." : "Delete Post"}
                   </button>
                 </div>
               )}
             </div>
           )}
        </div>

        <div className="w-full aspect-square bg-neutral-100 relative cursor-pointer overflow-hidden" onDoubleClick={handleImageDoubleClick} >
        
            <Image src={getOptimizedUrl(post.imageUrl, 800)} alt="Post" fill className="object-cover" unoptimized  />

          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <svg className="animate-insta-heart drop-shadow-2xl" color="white" fill="white" height="120" viewBox="0 0 48 48" width="120"><path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z"></path></svg>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-2 pt-1">
           <div className="flex items-center gap-4">
             <button onClick={() => likeMutation.mutate()} className={`flex items-center justify-center transition-transform active:scale-90 text-2xl ${isLiked ? "text-red-500" : "text-black"}`}>
               {isLiked ? "❤️" : "🤍"} <span className="font-bold text-sm text-center">{post.likesCount}</span> 
             </button>
             {/* 💬 OPENS THE MODAL NOW! */}
             <button onClick={() => setIsModalOpen(true)} className="text-black transition-transform active:scale-90 text-2xl flex items-center justify-center">💬 <span className="font-bold text-sm">{post.commentsCount}</span></button>
             <button onClick={handleShare} className="text-black transition-transform active:scale-90 text-2xl mb-1">
               <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="22" x2="9.218" y1="3" y2="10.083"></line><polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></polygon></svg>
             </button>
           </div>
        </div>

        <div className="px-2 flex flex-col gap-1">
          <p className="font-bold text-sm">{likesCount} likes</p>
          <p className="text-sm">
            <Link href={`/profile/${postOwnerId}`} className="font-bold mr-2 hover:opacity-70">@{postAuthor.username || postAuthor.firstName || "model"}</Link>
            {post.caption}
          </p>
          {/* View comments text link */}
          {post.commentsCount > 0 && (
            <button onClick={() => setIsModalOpen(true)} className="text-black/50 text-sm font-semibold text-left mt-1 hover:text-black">
              View all {post.commentsCount} comments
            </button>
          )}
        </div>

        <style jsx>{`
          .animate-insta-heart { animation: instaHeart 1000ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
          @keyframes instaHeart { 0% { opacity: 0; transform: scale(0); } 15% { opacity: 0.9; transform: scale(1.2); } 30% { opacity: 1; transform: scale(1); } 70% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.1); } }
        `}</style>
      </div>

      {/* RENDER MODAL OUTSIDE THE CARD LAYOUT */}
      {isModalOpen && (
        <ViewPostModal 
          post={post} 
          currentUserId={currentUserId} 
          author={postAuthor} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </>
  );
}