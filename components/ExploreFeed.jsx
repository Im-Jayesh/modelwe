"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import PostCard from "./PostCard";

export default function ExploreFeed({ currentUserId }) {
  const queryClient = useQueryClient();
  const observerRef = useRef(null);
  const [seed] = useState(Math.random());

  // --- 1. THE INFINITE QUERY ENGINE ---
  // --- 1. THE INFINITE QUERY ENGINE ---
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isRefetching,
  refetch
} = useInfiniteQuery({
  queryKey: ["explorePosts", seed], // Adding seed to the key ensures a fresh feed on refresh
  queryFn: async ({ pageParam = 1 }) => {
    // FIX: Changed 'page' to 'pageParam'
    const res = await fetch(`/api/explore?page=${pageParam}&seed=${seed}`);
    if (!res.ok) throw new Error("Failed to fetch explore feed");
    return res.json(); 
  },
  getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
});

  // --- 2. THE DEDUPLICATION FILTER (Fixes Pagination Drift) ---
  const uniquePosts = useMemo(() => {
    if (!data) return [];
    
    const allPosts = data.pages.flatMap(page => page.posts || []);
    const seenIds = new Set();
    const filtered = [];
    
    for (const post of allPosts) {
      if (!seenIds.has(post._id)) {
        seenIds.add(post._id);
        filtered.push(post);
      }
    }
    
    return filtered;
  }, [data]);

  // --- 3. THE INFINITE SCROLL OBSERVER ---
  useEffect(() => {
    // This watches the invisible div at the bottom of the screen
    const observer = new IntersectionObserver(
      (entries) => {
        // If the bottom div enters the screen, and we have more pages, fetch!
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" } // Trigger 200px BEFORE they hit the absolute bottom
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // --- RENDER LOADERS ---
  if (isLoading && !isRefetching) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest opacity-50">Curating your feed...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto pb-32 pt-20">
      
      {/* HEADER & REFRESH BUTTON */}
      <div className="flex items-center justify-between mb-8 px-4">
        <h1 className="text-2xl font-serif">For You</h1>
        <button 
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            refetch();
          }}
          disabled={isRefetching}
          className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity disabled:opacity-30"
        >
          {isRefetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* THE FEED */}
      {uniquePosts.length > 0 ? (
        <div className="flex flex-col">
          {uniquePosts.map((post) => (
             // Notice we pass currentUserId down to the PostCard so it knows who owns what!
            <PostCard 
              key={post._id} 
              post={post} 
              currentUserId={currentUserId}
              author={post.userDetails} // Passed from the aggregation pipeline!
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 opacity-50">
          <p className="text-xl font-serif mb-2">It's quiet here...</p>
          <p className="text-xs uppercase tracking-widest">Follow creators to see more posts.</p>
        </div>
      )}

      {/* THE INFINITE SCROLL TRIGGER (Invisible bottom target) */}
      <div ref={observerRef} className="w-full h-20 flex items-center justify-center mt-4">
        {isFetchingNextPage && (
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin opacity-50"></div>
        )}
        {!hasNextPage && uniquePosts.length > 0 && (
          <p className="text-xs font-bold uppercase tracking-widest opacity-30">You're all caught up</p>
        )}
      </div>
      
    </div>
  );
}