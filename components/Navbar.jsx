"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

// --- FETCHER ---
const fetchAuthStatus = async () => {
    const res = await fetch("/api/users/profile");
    if (!res.ok) throw new Error("Not logged in");
    const data = await res.json();
    return data.profile;
};

export default function Navbar() {
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch user profile. We set retry to false so it doesn't spam the server if they aren't logged in.
    const { data: profile, isLoading } = useQuery({
        queryKey: ["myProfile"],
        queryFn: fetchAuthStatus,
        retry: false, 
    });

    // Close dropdown when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            const res = await fetch("/api/users/logout");
            if (res.ok) {
                // We use window.location to force a full hard-refresh of the app state
                window.location.href = "/login"; 
            }
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // Close mobile menu when a link is clicked
    const handleMobileClick = () => setIsMobileMenuOpen(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/10">
            <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
                
                {/* LOGO */}
                <Link href="/" className="font-serif text-2xl font-bold tracking-widest uppercase text-[#1E1E1C] z-50">
                    Model<span className="text-neutral-400">WE</span>
                </Link>

                {/* --- DESKTOP NAVIGATION --- */}
                <div className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-[0.15em] font-semibold text-neutral-600">
                    {isLoading ? (
                        <div className="animate-pulse w-24 h-4 bg-neutral-200 rounded"></div>
                    ) : profile ? (
                        // LOGGED IN VIEW
                        <>
                            <Link href="/dashboard" className="hover:text-black transition-colors">Dashboard</Link>
                            <Link href="/explore" className="hover:text-black transition-colors text-pink-500">Explore</Link>
                            <Link href={`/portfolio/${profile.userId}`} className="hover:text-black transition-colors">Portfolio</Link>
                            <Link href="/portfolio/edit" className="hover:text-black transition-colors">Editor</Link>
                            
                            {/* PROFILE DROPDOWN */}
                            <div className="relative" ref={dropdownRef}>
                                <button 
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-9 h-9 rounded-full bg-neutral-200 border border-black/10 overflow-hidden relative focus:outline-none focus:ring-2 focus:ring-black/20 transition-all hover:scale-105"
                                >
                                    {profile.profilePic ? (
                                        <Image src={profile.profilePic} alt="Profile" fill className="object-cover" unoptimized />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[#1E1E1C] text-[#F2F2EE] text-sm font-serif">
                                            {profile.firstName?.charAt(0) || "M"}
                                        </div>
                                    )}
                                </button>

                                {/* DROPDOWN MENU */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-48 bg-white border border-black/10 rounded-xl shadow-xl py-2 flex flex-col overflow-hidden animate-fade-in">
                                        <div className="px-4 py-3 border-b border-black/5 mb-2">
                                            <p className="text-xs font-bold text-black truncate">@{profile.username || profile.firstName}</p>
                                        </div>
                                        <Link 
                                            href={`/profile/${profile.userId}`} 
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="px-4 py-2 text-left hover:bg-neutral-50 transition-colors"
                                        >
                                            Social Profile
                                        </Link>
                                        <Link 
                                            href="/settings" 
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="px-4 py-2 text-left hover:bg-neutral-50 transition-colors"
                                        >
                                            Account Settings
                                        </Link>
                                        <button 
                                            onClick={handleLogout}
                                            className="px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors mt-2 border-t border-black/5 pt-3"
                                        >
                                            Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // LOGGED OUT VIEW
                        <div className="flex items-center gap-6">
                            <Link href="/login" className="hover:text-black transition-colors">Log In</Link>
                            <Link 
                                href="/signup" 
                                className="px-6 py-2.5 bg-[#1E1E1C] text-[#F2F2EE] rounded-full hover:bg-black transition-colors"
                            >
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>

                {/* --- MOBILE HAMBURGER BUTTON --- */}
                <button 
                    className="md:hidden z-50 p-2 -mr-2 text-black focus:outline-none"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <div className="w-6 h-5 flex flex-col justify-between">
                        <span className={`w-full h-0.5 bg-current transition-all ${isMobileMenuOpen ? "rotate-45 translate-y-2.5" : ""}`}></span>
                        <span className={`w-full h-0.5 bg-current transition-all ${isMobileMenuOpen ? "opacity-0" : ""}`}></span>
                        <span className={`w-full h-0.5 bg-current transition-all ${isMobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`}></span>
                    </div>
                </button>

            </div>

            {/* --- MOBILE MENU OVERLAY --- */}
            <div className={`md:hidden h-screen fixed inset-0 bg-white z-40 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
                
                {/* FIX: Changed justify-center to justify-start, added pt-28 (padding top) and overflow-y-auto */}
                <div className="flex flex-col bg-white items-center justify-start h-full pt-28 pb-12 overflow-y-auto gap-8 text-sm uppercase tracking-[0.2em] font-semibold text-neutral-800">
                    
                    {isLoading ? (
                         <div className="animate-pulse tracking-widest">Loading...</div>
                    ) : profile ? (
                        <>
                            {profile.profilePic ? (
                                <div className="w-20 h-20 rounded-full overflow-hidden relative mb-4 border border-black/10 shrink-0">
                                    <Image src={profile.profilePic} alt="Profile" fill className="object-cover" unoptimized />
                                </div>
                            ) : null}
                            <Link href="/dashboard" onClick={handleMobileClick} >Dashboard</Link>
                            <Link href="/explore" onClick={handleMobileClick} className="text-pink-500">Explore</Link>
                            <Link href={`/portfolio/${profile.userId}`} onClick={handleMobileClick}>My Portfolio</Link>
                            <Link href="/portfolio/edit" onClick={handleMobileClick}>Editor</Link>
                            <Link href={`/profile/${profile.userId}`} onClick={handleMobileClick}>Social Profile</Link>
                            <Link href="/settings" onClick={handleMobileClick} >Settings</Link>
                            <button onClick={handleLogout} className="text-red-500 mt-4 pb-8">Log Out</button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" onClick={handleMobileClick}>Log In</Link>
                            <Link href="/signup" onClick={handleMobileClick} className="px-8 py-3 bg-[#1E1E1C] text-[#F2F2EE] rounded-full mt-4 shrink-0">Sign Up</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}