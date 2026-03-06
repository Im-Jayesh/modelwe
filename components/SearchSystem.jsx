"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function SearchSystem() {
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const queryClient = useQueryClient();

  // 1. Manual debounce to save API credits and reduce server load
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const { data, isFetching } = useQuery({
    queryKey: ["globalSearch", debouncedTerm],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${debouncedTerm}`);
      return res.json();
    },
    enabled: debouncedTerm.length >= 2,
    staleTime: 60000, // Cache results for 1 minute
  });

  // 2. Prefetch Profile Data on Hover
  const prefetchUser = (userId) => {
    queryClient.prefetchQuery({
      queryKey: ["socialProfile", userId],
      queryFn: () => fetch(`/api/users/profile?id=${userId}`).then(res => res.json()),
    });
  };

  return (
    <div className="relative max-w-lg mx-auto">
      <input
        className="w-full min-w-lg rounded-full p-4 bg-[#F2F2EE] border-b border-black/20 py-4 text-xl text-neutral-800 font-serif focus:outline-none focus:border-black transition-all"
        placeholder="Search @username or name..."
        onChange={(e) => setTerm(e.target.value)}
      />

      <div className="mt-4 flex flex-col gap-2">
        {data?.results?.map((user) => (
          <Link
            key={user.userId}
            href={`/profile/${user.userId}`}
            onMouseEnter={() => prefetchUser(user.userId)}
            className="group flex items-center justify-between p-4 hover:bg-black hover:text-white transition-all duration-300 rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-200">
                <img src={user.profilePic || "/default-avatar.webp"} alt="profile" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-bold tracking-tight">@{user.username}</p>
                <p className="text-sm opacity-60 group-hover:opacity-100">{user.firstName} {user.lastName}</p>
              </div>
            </div>
            
            {/* Minimalist Hover Info */}
            <div className="text-right opacity-0 group-hover:opacity-100 transition-opacity">
               <p className="text-[10px] uppercase tracking-widest">Followers</p>
               <p className="font-serif">{user.stats?.followersCount || 0}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}