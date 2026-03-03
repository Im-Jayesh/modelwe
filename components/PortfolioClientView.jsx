"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import MasonryGallery from "@/components/MasonryGallery"; 
import SocialIcons from "@/components/SocialIcons";
import PortfolioControls from "@/components/PortfolioControls";
import { getOptimizedUrl } from "@/lib/optimizeImage";

// --- FETCH FUNCTIONS ---
const fetchPublicProfile = async (id) => {
  const res = await fetch(`/api/users/profile?id=${id}`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
};

const fetchPublicSettings = async (id) => {
  const res = await fetch(`/api/portfolio/settings?id=${id}`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
};

// NOTICE: We receive `id` and `isOwner` from the Server Wrapper!
export default function PortfolioClientView({ id, isOwner }) {
  const glowRef = useRef(null);
  const imageRef = useRef(null);
  const [theme, setTheme] = useState("first");

  const { data: profileData, isLoading: isLoadingProfile, isError: isProfileError } = useQuery({
    queryKey: ["publicProfile", id],
    queryFn: () => fetchPublicProfile(id),
    enabled: !!id, 
  });

  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["publicSettings", id],
    queryFn: () => fetchPublicSettings(id),
    enabled: !!id,
  });

  const profile = profileData?.profile;
  const settings = settingsData?.settings;
  
  const backgroundColor = settings?.backgroundColor || "#483e3b";
  const activeTheme = settings?.theme || "first";

  // --- COLOR UTILS ---
  function applyHexShift(hex) {
    hex = hex.replace("#", "");
    let r = parseInt(hex.slice(0, 2), 16) - 28;
    let g = parseInt(hex.slice(2, 4), 16) - 23;
    let b = parseInt(hex.slice(4, 6), 16) - 21;
    return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  function getNeutralTextColor(hex) {
    hex = hex.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 140 ? "#F2F2EE" : "#1E1E1C";
  }

  const textColor = getNeutralTextColor(backgroundColor);

  // --- PARALLAX EFFECT ---
  useEffect(() => {
    let rafId;
    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (glowRef.current) glowRef.current.style.transform = `translate(-50%, ${Math.min(y * 0.15, 120)}px)`;
        if (imageRef.current) imageRef.current.style.transform = `translateY(${Math.min(y * 0.25, 180)}px)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (isLoadingProfile || isLoadingSettings) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#483e3b] text-[#F2F2EE]">
        <div className="animate-pulse tracking-widest uppercase text-sm">Loading Profile...</div>
      </div>
    );
  }

  if (isProfileError || !profile) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#483e3b] text-[#F2F2EE]">
        <div className="tracking-widest uppercase text-sm opacity-70">Model Not Found</div>
      </div>
    );
  }

  const images = profile.images || [];
  const heroImageUrl = images.length > 0 ? images[0].url : "/demo/hero.png";
  const galleryImages = images.length > 1 ? images.slice(1) : [];
  const socials = profile.instagram ? { instagram: profile.instagram } : {};
  const stats = profile.stats || {};
  const hasMeasurements = Object.values(stats).some((val) => val !== null && val !== "");

  // ==========================================
  // RENDER: THEME 1 (Editorial)
  // ==========================================
  if (theme === "first") {
    return (
      <div className="relative md:w-screen min-h-[200vh] " style={{ backgroundColor }}>
        <main className="relative h-[75vh] md:h-screen vogue-heading" style={{ color: textColor }}>
          <h1 className="font-extrabold flex justify-center pt-[150px] md:pt-12 text-center px-4">{profile.firstName}</h1>
          <h2 className="absolute sub-headings z-12 max-w-[500px] pl-24 pt-24 hidden md:block" style={{ color: textColor }}>
            {profile?.heading1 || "THE BUTTERLY EFFECT"}
          </h2>
          <h2 className="absolute sub-headings z-12 max-w-[500px] right-[180px] top-[900px] hidden md:block" style={{ color: textColor }}>
            {profile?.heading2 || "GLOBAL STYLE ICONS"}
          </h2>

          <div
            ref={glowRef}
            className="pointer-events-none absolute top-28 left-1/2 md:w-[759px] md:h-[759px] w-[359px] h-[359px] rounded-full blur-2xl"
            style={{ backgroundColor: applyHexShift(backgroundColor), transform: "translate(-50%, 0px)" }}
          />

          <div ref={imageRef} className="absolute top-3 left-0 right-0 mx-auto flex justify-center">
            <div className="relative group">
              <Image
                src={getOptimizedUrl(heroImageUrl, 900)}
                alt={`${profile.firstName}'s Profile`}
                width={800}
                height={1400}
                unoptimized
                priority
                className="block md:pt-20 pt-6 object-cover max-h-screen w-auto"
              />
            </div>
          </div>
        </main>

        <section className="relative z-10 w-full max-w-[1400px] mx-auto px-6 py-24 md:pt-[620px]" style={{ color: textColor }}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Identity Card */}
            <div className="flex-1 p-8 rounded-xl flex flex-col justify-between min-h-[280px] border border-black/10 shadow-sm" style={{ backgroundColor: applyHexShift(backgroundColor) }}>
              <div>
                <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-3">Model Profile</span>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex flex-row gap-3">
                    <h2 className="text-4xl md:text-5xl font-serif leading-[0.95]">{profile.firstName}</h2>
                    <h2 className="text-4xl md:text-5xl font-serif leading-[0.95]">{profile.lastName}</h2>
                  </div>
                  {Object.keys(socials).length > 0 && <SocialIcons socials={socials} size={24} className="opacity-70 hover:opacity-100 transition-opacity" iconClassName="w-4 h-4" />}
                </div>
              </div>
              <div className="mt-10">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-2">Category</span>
                <p className="text-2xl font-light">{profile.category}</p>
              </div>
            </div>

            {/* Measurements Card */}
            {hasMeasurements && (
              <div className="w-full md:w-[320px] p-8 rounded-xl flex flex-col border border-black/10 shadow-sm" style={{ backgroundColor: applyHexShift(backgroundColor) }}>
                <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-4">Measurements</span>
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm font-medium">
                  {stats.height && <div><span className="opacity-60 block text-xs mb-1 font-normal uppercase">Height</span>{stats.height} cm</div>}
                  {stats.chest && <div><span className="opacity-60 block text-xs mb-1 font-normal uppercase">Chest</span>{stats.chest} cm</div>}
                  {stats.waist && <div><span className="opacity-60 block text-xs mb-1 font-normal uppercase">Waist</span>{stats.waist} cm</div>}
                  {stats.hips && <div><span className="opacity-60 block text-xs mb-1 font-normal uppercase">Hips</span>{stats.hips} cm</div>}
                  {stats.shoe && <div><span className="opacity-60 block text-xs mb-1 font-normal uppercase">Shoe</span>{stats.shoe} EU</div>}
                  {stats.ageRange && <div><span className="opacity-60 block text-xs mb-1 font-normal uppercase">Age Range</span>{stats.ageRange} yrs</div>}
                </div>
              </div>
            )}

            {/* Location Card */}
            <div className="w-full md:w-[280px] p-8 rounded-xl flex flex-col justify-between border border-black/10 shadow-sm" style={{ backgroundColor: applyHexShift(backgroundColor) }}>
              <div>
                <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-3">City</span>
                <p className="text-2xl font-medium">{profile.location?.city}</p>
              </div>
              <div className="mt-10 pt-6 border-t border-black/10">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-2">Country</span>
                <p className="text-xl opacity-70">{profile.location?.country}</p>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-8 p-8 rounded-xl border border-black/10 shadow-sm" style={{ backgroundColor: applyHexShift(backgroundColor) }}>
              <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-4">Biography</span>
              <p className="text-lg md:text-xl leading-relaxed font-serif opacity-85 max-w-[900px]">{profile.bio}</p>
            </div>
          )}
        </section>

        {galleryImages.length > 0 && <MasonryGallery images={galleryImages} isEditing={false} textColor={textColor} />}

        {/* The Control Dock */}
        <PortfolioControls theme={theme} setTheme={setTheme} isOwner={isOwner} />
      </div>
    );
  }

  // ==========================================
  // RENDER: THEME 2 (Clean/Minimal)
  // ==========================================
  return (
    <div className="min-h-screen w-full" style={{ backgroundColor }}>
      <header className="max-w-[1200px] mx-auto px-6 pt-16" style={{ color: textColor }}>
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          <div className="flex-1">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-semibold">{profile.firstName} {profile.lastName}</h1>
              {Object.keys(socials).length > 0 && <SocialIcons socials={socials} size={20} className="opacity-60 hover:opacity-100 transition-opacity" iconClassName="w-4 h-4" />}
            </div>
            <p className="mt-2 text-xs uppercase tracking-widest opacity-60">{profile.category}</p>
            <p className="mt-8 text-sm opacity-70">{profile.location?.city}, {profile.location?.country}</p>
          </div>
          <div className="flex-1 flex justify-end">
            <Image src={heroImageUrl} alt="Profile" width={380} height={620} unoptimized priority className="rounded-md shadow-sm object-cover" />
          </div>
        </div>
      </header>

      {hasMeasurements && (
        <section className="max-w-[900px] mx-auto px-6 mt-16" style={{ color: textColor }}>
          <p className="text-xs uppercase tracking-widest opacity-50 mb-4 border-b border-black/10 pb-2">Measurements</p>
          <div className="flex flex-wrap gap-8 text-sm">
            {stats.height && <div><span className="opacity-50 block text-xs uppercase mb-1">Height</span><span className="font-medium text-lg">{stats.height}cm</span></div>}
            {stats.chest && <div><span className="opacity-50 block text-xs uppercase mb-1">Chest</span><span className="font-medium text-lg">{stats.chest}cm</span></div>}
            {stats.waist && <div><span className="opacity-50 block text-xs uppercase mb-1">Waist</span><span className="font-medium text-lg">{stats.waist}cm</span></div>}
            {stats.hips && <div><span className="opacity-50 block text-xs uppercase mb-1">Hips</span><span className="font-medium text-lg">{stats.hips}cm</span></div>}
            {stats.shoe && <div><span className="opacity-50 block text-xs uppercase mb-1">Shoe</span><span className="font-medium text-lg">{stats.shoe}</span></div>}
            {stats.ageRange && <div><span className="opacity-50 block text-xs uppercase mb-1">Age Range</span><span className="font-medium text-lg">{stats.ageRange}</span></div>}
          </div>
        </section>
      )}

      {profile.bio && (
        <section className="max-w-[900px] mx-auto px-6 mt-16" style={{ color: textColor }}>
          <p className="text-xs uppercase tracking-widest opacity-50 mb-2">Biography</p>
          <p className="text-base leading-relaxed max-w-[700px]">{profile.bio}</p>
        </section>
      )}

      {galleryImages.length > 0 && (
        <section className="mt-24 pb-24">
          <MasonryGallery images={galleryImages} isEditing={false} />
        </section>
      )}

      <PortfolioControls theme={theme} setTheme={setTheme} isOwner={isOwner} />
    </div>
  );
}