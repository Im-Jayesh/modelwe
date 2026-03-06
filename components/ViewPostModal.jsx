"use client";

import Image from "next/image";
import { getOptimizedUrl } from "@/lib/optimizeImage";
import { useState, useRef, Fragment, useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ViewPostModal({ post, onClose, currentUserId, author }) {
  const queryClient = useQueryClient();
  const postAuthor = author || post.userId || post.userDetails || {};
  const isOwner = String(currentUserId) === String(post.userId?._id || post.userId);

  // local UI state (Initializes from the post prop!)
  const [isLiked, setIsLiked] = useState(post.isLikedByMe || false); 
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentsCount || 0);
  const [showDropdown, setShowDropdown] = useState(false);

  // --- THE FIX: KEEP STATE IN SYNC WITH BACKGROUND UPDATES ---
  // If TanStack Query fetches fresh data in the background, this makes sure the modal updates instantly
  useEffect(() => {
    setLikesCount(post.likesCount || 0);
    setCommentCount(post.commentsCount || 0);
    if (post.isLikedByMe !== undefined) setIsLiked(post.isLikedByMe);
  }, [post]);

  // image toggle (1:1 vs full) and heart animation
  const [showFullRatio, setShowFullRatio] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const heartTimeoutRef = useRef(null);

  // --- Comments infinite query (page-based)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingComments
  } = useInfiniteQuery({
    queryKey: ["postComments", post._id],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/posts/comments?postId=${post._id}&page=${pageParam}`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: !!post._id,
  });

  // ---------- LIKE MUTATION (optimistic with rollback) ----------
// ---------- LIKE MUTATION (LOUD DEBUGGING VERSION) ----------
  const likeMutation = useMutation({
    mutationFn: async () => {
      console.log("🔥 1. HITTING LIKE ENDPOINT FOR POST ID:", post._id);
      
      const res = await fetch("/api/posts/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post._id }),
      });
      
      // Try to parse the response, even if it's an error
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        console.error("❌ 2. SERVER FAILED OR REJECTED THE LIKE:", res.status, data);
        throw new Error(data.error || "Failed to toggle like");
      }
      
      console.log("✅ 3. SERVER ACCEPTED LIKE SUCCESS:", data);
      return data;
    },
    onMutate: async () => {
      console.log("⚡ 4. OPTIMISTIC UI: Flipping the heart state locally instantly!");
      const prevLiked = isLiked;
      const prevCount = likesCount;

      setIsLiked(v => !v);
      setLikesCount(c => (prevLiked ? Math.max(0, c - 1) : c + 1));

      return { prevLiked, prevCount };
    },
    onError: (err, variables, context) => {
      console.error("🔄 5. ROLLBACK TRIGGERED: Reverting the heart back to normal.", err.message);
      if (context) {
        setIsLiked(context.prevLiked);
        setLikesCount(context.prevCount);
      }
      // POPUP ALERT so you definitely know it failed!
      alert(`Like Action Failed: ${err.message}`); 
    },
    onSettled: () => {
      queryClient.invalidateQueries(["userPosts"]);
    }
  });

  // show heart animation on double click
  const handleImageDoubleClick = () => {
    if (!isLiked) {
      likeMutation.mutate();
    }
    if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
    setShowHeartAnim(true);
    heartTimeoutRef.current = setTimeout(() => setShowHeartAnim(false), 1000);
  };

  // ---------- COMMENT CREATE MUTATION ----------
  const commentMutation = useMutation({
    mutationFn: async (text) => {
      const res = await fetch("/api/posts/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post._id, text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to post comment");
      }
      return res.json(); 
    },
    onMutate: async (text) => {
      const tempId = `temp-${Date.now()}`;
      
      const optimisticComment = {
        _id: tempId,
        postId: post._id,
        userId: currentUserId,
        username: "you", 
        profilePic: null, 
        text,
        createdAt: new Date().toISOString()
      };

      queryClient.setQueryData(["postComments", post._id], (old) => {
        if (!old) return { pages: [{ comments: [optimisticComment], nextPage: null }], pageParams: [] };
        const pages = [...old.pages];
        pages[0] = { ...pages[0], comments: [optimisticComment, ...(pages[0].comments || [])] };
        return { ...old, pages };
      });

      setCommentCount(c => c + 1);
      return { tempId };
    },
    onSuccess: (data, text, context) => {
      const newComment = data.comment;
      queryClient.setQueryData(["postComments", post._id], (old) => {
        if (!old) return old;
        const pages = old.pages.map(page => {
          const comments = page.comments.map(c => (c._id === context.tempId ? newComment : c));
          return { ...page, comments };
        });
        return { ...old, pages };
      });
      queryClient.invalidateQueries(["userPosts"]);
    },
    onError: (err, variables, context) => {
      if (context?.tempId) {
        queryClient.setQueryData(["postComments", post._id], (old) => {
          if (!old) return old;
          const pages = old.pages.map(page => ({
            ...page,
            comments: page.comments.filter(c => c._id !== context.tempId)
          }));
          return { ...old, pages };
        });
        setCommentCount(c => Math.max(0, c - 1));
      }
    }
  });

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText.trim());
    setCommentText("");
  };

  // ---------- DELETE COMMENT MUTATION ----------
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      const res = await fetch(`/api/posts/comments?commentId=${commentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete comment");
      return res.json();
    },
    onMutate: async (commentId) => {
      const previous = queryClient.getQueryData(["postComments", post._id]);
      queryClient.setQueryData(["postComments", post._id], (old) => {
        if (!old) return old;
        const pages = old.pages.map(page => ({
          ...page,
          comments: page.comments.filter(c => String(c._id) !== String(commentId))
        }));
        return { ...old, pages };
      });
      setCommentCount(c => Math.max(0, c - 1));
      return { previous };
    },
    onError: (err, commentId, context) => {
      if (context?.previous) queryClient.setQueryData(["postComments", post._id], context.previous);
      if (context?.previous) {
        const prevCount = context.previous.pages.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
        setCommentCount(prevCount);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["userPosts"]);
    }
  });

  // ---------- DELETE POST MUTATION ----------
  const deletePostMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/posts?id=${post._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      return res.json();
    },
    onSuccess: () => {
      // Refresh the grid to remove the image, and close the modal!
      queryClient.invalidateQueries(["userPosts"]);
      onClose(); 
    },
    onError: () => {
      alert("Failed to delete the post. Please try again.");
    }
  });

  const renderSkeletons = (n = 4) => {
    return Array.from({ length: n }).map((_, i) => (
      <div key={`s-${i}`} className="flex gap-3 animate-pulse">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-3 bg-gray-200 rounded w-3/5" />
          <div className="h-3 bg-gray-200 rounded w-1/2 mt-2" />
        </div>
      </div>
    ));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-12"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[90vh] rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >

        {/* --- LEFT: IMAGE CONTAINER --- */}
        <div className="w-full md:w-[55%] bg-black relative flex-shrink-0 h-[45%] md:h-auto md:min-h-[75vh] overflow-hidden">
          
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onDoubleClick={handleImageDoubleClick}
          >
            <Image
              src={getOptimizedUrl(post.imageUrl, 1080)}
              alt="Post content"
              fill
              className={`transition-all duration-300 ${showFullRatio ? "object-contain" : "object-cover"}`}
              sizes="(max-width:768px) 100vw, 50vw"
              unoptimized
            />

            {/* INSTAGRAM HEART ANIMATION */}
            {showHeartAnim && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <svg className="animate-insta-heart drop-shadow-2xl" color="white" fill="white" height="120" role="img" viewBox="0 0 48 48" width="120">
                  <path d="M34.6 3.1c-4.5 0-7.9 1.8-10.6 5.6-2.7-3.7-6.1-5.5-10.6-5.5C6 3.1 0 9.6 0 17.6c0 7.3 5.4 12 10.6 16.5.6.5 1.3 1.1 1.9 1.7l2.3 2c4.4 3.9 6.6 5.9 7.6 6.5.5.3 1.1.5 1.6.5s1.1-.2 1.6-.5c1-.6 2.8-2.2 7.8-6.8l2-1.8c.7-.6 1.3-1.2 2-1.7C42.7 29.6 48 25 48 17.6c0-8-6-14.5-13.4-14.5z"></path>
                </svg>
              </div>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setShowFullRatio(s => !s); }}
            className="absolute bottom-4 right-4 z-10 bg-black/60 text-white text-xs px-3 py-1.5 rounded-md hover:bg-black/80 backdrop-blur-sm transition-colors shadow-lg"
          >
            {showFullRatio ? "1:1" : "Full"}
          </button>
        </div>

        {/* --- RIGHT: CONTENT & COMMENTS --- */}
        <div className="w-full md:w-[45%] flex flex-col h-[55%] md:h-auto flex-1 min-h-0 bg-white">

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-black/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 relative">
                <Image src={getOptimizedUrl(postAuthor.profilePic) || "/default-avatar.webp"} fill alt="avatar" className="object-cover" />
              </div>
              <span className="font-bold text-sm tracking-tight">@{postAuthor.username || postAuthor.firstName || "model"}</span>
            </div>

            <div className="flex items-center gap-2 relative">
              {isOwner && (
                <div className="relative">
                  {/* The 3-Dot Trigger Button */}
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="text-xs font-bold opacity-50 hover:opacity-100 tracking-widest px-2 py-1 transition-opacity"
                  >
                    •••
                  </button>

                  {/* The Dropdown Menu */}
                  {showDropdown && (
                    <>
                      {/* Invisible overlay: clicking anywhere outside the menu closes it */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowDropdown(false)}
                      />
                      
                      {/* The actual menu box */}
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-xl border border-black/5 z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button 
                          onClick={() => {
                            setShowDropdown(false);
                            if (window.confirm("Delete this post? This cannot be undone.")) {
                              deletePostMutation.mutate();
                            }
                          }}
                          disabled={deletePostMutation.isPending}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 font-semibold transition-colors disabled:opacity-50"
                        >
                          {deletePostMutation.isPending ? "Deleting..." : "Delete Post"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <button onClick={onClose} className="opacity-50 hover:opacity-100 p-1 text-lg">✕</button>
            </div>
          </div>

          {/* Scrollable area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">

            {/* Caption */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 relative flex-shrink-0">
                <Image src={getOptimizedUrl(postAuthor.profilePic) || "/default-avatar.webp"} fill alt="avatar" className="object-cover" />
              </div>
              <p className="text-sm leading-relaxed">
                <span className="font-bold mr-2">@{postAuthor.username || postAuthor.firstName || "model"}</span>
                {post.caption}
              </p>
            </div>

            <hr className="border-black/5" />

            {/* Comments header: counts */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase opacity-60">{commentCount} comments</div>
              <div className="text-xs font-semibold uppercase opacity-40">{likesCount} likes</div>
            </div>

            {/* Comments list */}
            {isLoadingComments ? (
              <div className="space-y-3 py-2">
                {renderSkeletons(4)}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {data?.pages.map((page, i) => (
                  <Fragment key={i}>
                    {page.comments.map((comment) => {
                      const cUsername = comment.userId?.username || comment.userId?.firstName || comment.username || comment.firstName || "user";
                      const cProfilePic = comment.userId?.profilePic || comment.profilePic || "/default-avatar.webp";
                      const cOwnerId = String(comment.userId?._id || comment.userId || comment.userId);

                      return (
                        <div key={comment._id} className="flex gap-3 group">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 relative flex-shrink-0">
                            <Image src={getOptimizedUrl(cProfilePic)} fill alt="avatar" className="object-cover" />
                          </div>
                          <div className="flex flex-col w-full">
                            <p className="text-sm leading-relaxed">
                              <span className="font-bold mr-2">
                                @{cUsername}
                              </span>
                              {comment.text}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-[10px] text-black/40 font-semibold">
                              <span>{new Date(comment.createdAt).toLocaleDateString()}</span>

                              <div className="ml-auto flex items-center gap-2">
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-black text-xs">Reply</button>

                                {cOwnerId === String(currentUserId) && (
                                  <button
                                    onClick={() => deleteCommentMutation.mutate(comment._id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 text-xs text-red-500"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </Fragment>
                ))}

                {/* load more */}
                {hasNextPage && (
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="mt-2 text-xs font-semibold text-black/50 hover:text-black transition-colors self-center"
                  >
                    {isFetchingNextPage ? "Loading..." : "Load more comments"}
                  </button>
                )}

                {data?.pages?.[0]?.comments?.length === 0 && (
                  <div className="text-center opacity-40 text-xs uppercase tracking-widest pt-4">
                    No comments yet. Start the conversation!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-black/10 p-4 bg-white flex-shrink-0">
            <div className="flex items-center gap-4 mb-3">
              <button
                onClick={() => likeMutation.mutate()}
                className={`transition-transform active:scale-90 text-2xl ${isLiked ? "text-red-500" : "text-black"}`}
              >
                {isLiked ? "❤️" : "🤍"}
              </button>
              <button className="text-black transition-transform active:scale-90 text-2xl">💬</button>
            </div>

            <p className="font-bold text-sm mb-1">{likesCount} likes</p>
            <p className="text-[10px] uppercase tracking-widest opacity-40">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Comment form */}
          <form onSubmit={handlePostComment} className="border-t border-black/10 p-4 flex items-center gap-3 flex-shrink-0">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-sm outline-none bg-transparent"
              disabled={commentMutation.isPending}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || commentMutation.isPending}
              className="text-blue-500 font-semibold text-sm transition-opacity disabled:opacity-50"
            >
              {commentMutation.isPending ? "Posting..." : "Post"}
            </button>
          </form>
        </div>
      </div>

      {/* INSTAGRAM HEART CSS */}
      <style jsx>{`
        .animate-insta-heart {
          animation: instaHeart 1000ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes instaHeart {
          0% { opacity: 0; transform: scale(0); }
          15% { opacity: 0.9; transform: scale(1.2); }
          30% { opacity: 1; transform: scale(1); }
          70% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}