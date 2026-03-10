"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";

const fetchNotifications = async () => {
  const res = await fetch("/api/notifications");
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Silently check for new ones every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", { method: "PATCH" });
    },
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && data?.unreadCount > 0) {
      markAsReadMutation.mutate();
    }
  };

  const getNotificationLink = (notif) => {
    switch (notif.type) {
      case "FOLLOW": return `/profile/${notif.sender?._id}`;
      case "COMMENT": return `/post/${notif.post}?view=comments`; 
      case "LIKE":
      case "MENTION": return `/post/${notif.post}`;
      default: return "/";
    }
  };

  const notifications = data?.notifications || [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BELL ICON BUTTON */}
      <button onClick={handleOpen} className="relative p-2 text-black/70 hover:text-black transition-colors focus:outline-none">
        <span className="text-xl">🔔</span>
        {data?.unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-[-60px] md:right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-black/5 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-black/5 font-semibold font-serif flex justify-between items-center">
            <span>Notifications</span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <Link 
                  href={getNotificationLink(notif)}
                  key={notif._id} 
                  className={`flex items-start gap-3 p-4 hover:bg-neutral-50 transition-colors border-b border-black/5 last:border-0 ${!notif.read ? 'bg-blue-50/50' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <img 
                    src={notif.sender?.profilePic || "/default-avatar.webp"} 
                    alt="avatar" 
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="text-sm">
                    <span className="font-semibold">{notif.sender?.username || "Someone"}</span>
                    {notif.type === "LIKE" && " liked your post."}
                    {notif.type === "COMMENT" && " commented on your post."}
                    {notif.type === "MENTION" && " mentioned you in a post."}
                    {notif.type === "FOLLOW" && " started following you."}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-black/50">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}