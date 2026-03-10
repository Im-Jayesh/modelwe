"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image"; // Assuming you use Next.js Image optimization

export default function SearchSystem({ initialTag = "" }) {
  const [term, setTerm] = useState(initialTag);
  const [debouncedTerm, setDebouncedTerm] = useState(initialTag);
  const [isOpen, setIsOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();

  // Debounce input to save API calls
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch search results
  const { data, isFetching } = useQuery({
    queryKey: ["globalSearch", debouncedTerm],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${debouncedTerm}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedTerm.length >= 2,
    staleTime: 60000, 
  });

  const prefetchUser = (userId) => {
    queryClient.prefetchQuery({
      queryKey: ["socialProfile", userId],
      queryFn: () => fetch(`/api/users/profile?id=${userId}`).then(res => res.json()),
    });
  };

  const hasUsers = data?.users?.length > 0;
  const hasPosts = data?.posts?.length > 0;
  const hasResults = hasUsers || hasPosts;
  const showDropdown = isOpen && term.length >= 2;

  return (
    <div className="relative w-full max-w-2xl mx-auto z-50" ref={dropdownRef}>
      
      {/* Search Input */}
      <div className="relative">
        <input
          autoFocus
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full rounded-full p-4 pl-12 bg-[#F2F2EE] border border-transparent focus:border-black/20 focus:bg-white text-xl text-neutral-800 font-serif focus:outline-none transition-all shadow-sm"
          placeholder="Search people, tags, or posts..."
        />
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        
        {isFetching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-neutral-300 border-t-black rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {showDropdown && (
        <div className="absolute top-[110%] left-0 w-full bg-white shadow-2xl rounded-2xl border border-neutral-100 p-2 flex flex-col max-h-[75vh] overflow-y-auto">
          
          {!hasResults && !isFetching && (
            <div className="p-8 text-center text-neutral-500 font-serif">
              No results found for "{term}"
            </div>
          )}

          {/* USERS LIST VIEW */}
          {hasUsers && (
            <div className="p-2">
              <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 px-2">Profiles</h3>
              <div className="flex flex-col gap-1">
                {data.users.map((user) => (
                  <Link
                    key={user.userId}
                    href={`/profile/${user.userId}`}
                    onMouseEnter={() => prefetchUser(user.userId)}
                    className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-xl transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                      <img src={user.profilePic || "/default-avatar.webp"} alt={user.username} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <p className="font-bold text-sm text-neutral-900 truncate leading-tight">@{user.username}</p>
                      <p className="text-xs text-neutral-500 truncate">{user.firstName} {user.lastName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {hasUsers && hasPosts && <hr className="border-neutral-100 mx-4 my-2" />}

          {/* POSTS GRID VIEW */}
          {/* --- POSTS SECTION (Grid View) --- */}
{hasPosts && (
  <div className="p-2">
    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 px-2">Posts</h3>
    
    <div className="grid grid-cols-2 gap-3">
      {data.posts.map((post) => (
        <Link
          key={post._id}
          href={`/post/${post._id}`} // <-- THIS MAKES THE WHOLE THING CLICKABLE
          onClick={() => setIsOpen(false)}
          className="group relative aspect-square rounded-xl overflow-hidden bg-neutral-100 block border border-black/5 shadow-sm"
        >
          {/* 1. Post Image */}
          {post.imageUrl ? (
            <img 
              src={post.imageUrl} 
              alt={post.caption || "Search result"} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 p-3 bg-neutral-800 flex items-center justify-center">
              <p className="text-white text-xs text-center line-clamp-3">{post.caption}</p>
            </div>
          )}
          
          {/* Dark Gradient Overlay for perfect text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 opacity-80 group-hover:opacity-100 transition-opacity"></div>
          
          {/* 2. Author Info Overlay (Top Left) */}
          <div className="absolute top-2 left-2 right-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-200 border border-white/30 shrink-0">
              <img 
                src={post.author?.profilePic || "/default-avatar.webp"} 
                alt="avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white text-[10px] font-bold tracking-wide truncate drop-shadow-md">
              @{post.author?.username || "model"}
            </span>
          </div>

          {/* 3. Caption & Tags (Bottom) */}
          <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1">
             {post.tags?.[0] && (
               <span className="text-[8px] font-bold text-black bg-white/90 px-1.5 py-0.5 rounded-sm backdrop-blur-sm w-max uppercase tracking-wider">
                 {post.tags[0]}
               </span>
             )}
             <p className="text-white text-[11px] line-clamp-2 leading-tight drop-shadow-md font-medium">
               {post.caption}
             </p>
          </div>
        </Link>
      ))}
    </div>
  </div>
)}

        </div>
      )}
    </div>
  );
}