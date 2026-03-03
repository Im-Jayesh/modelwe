"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HexColorPicker } from "react-colorful";
import EditableText from "@/components/EditableText";
import UploadHeroImage from "@/components/UploadHeroImage";
import useDebounce from "@/hooks/useDebounce";
import SocialIcons from "@/components/SocialIcons";

// --- FETCHERS ---
const fetchMyProfile = async () => {
  const res = await fetch("/api/users/profile"); 
  if (!res.ok) throw new Error("Failed to fetch profile");
  const data = await res.json();
  return data.profile;
};

const fetchMySettings = async () => {
  const res = await fetch("/api/portfolio/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  const data = await res.json();
  return data.settings;
};

export default function EditPortfolioPage() {
  const queryClient = useQueryClient();
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const galleryInputRef = useRef(null);
  const glowRef = useRef(null);
  const imageRef = useRef(null);

  // --- LOCAL STATE FOR EDITING ---
  const [localProfile, setLocalProfile] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState("#483e3b");
  const [theme, setTheme] = useState("first");

  // --- TANSTACK QUERIES ---
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["myProfile"],
    queryFn: fetchMyProfile,
    refetchOnWindowFocus: false,
  });

  const { data: settingsData } = useQuery({
    queryKey: ["mySettings"],
    queryFn: fetchMySettings,
    refetchOnWindowFocus: false,
  });

  // --- INITIALIZE LOCAL STATE ---
useEffect(() => {
  // Only set localProfile if it hasn't been set yet
  if (profileData && !localProfile) {
    setLocalProfile(profileData);
  }

  // Only set settings if settingsData exists AND we are currently 
  // at the default color (meaning we haven't loaded the real one yet)
  if (settingsData) {
    // We use a functional update or check to prevent constant overwrites
    setBackgroundColor((current) => {
      // If the current color is the hardcoded default, use the DB value
      if (current === "#483e3b") return settingsData.backgroundColor || "#483e3b";
      return current;
    });
    
    setTheme((current) => {
      if (current === "first") return settingsData.theme || "first";
      return current;
    });
  }
}, [profileData, settingsData]); // Remove localProfile from here to avoid loops

  // --- PARALLAX EFFECT ---
  useEffect(() => {
    let rafId;
    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (glowRef.current) {
          glowRef.current.style.transform = `translate(-50%, ${Math.min(y * 0.15, 120)}px)`;
        }
        if (imageRef.current) {
          imageRef.current.style.transform = `translateY(${Math.min(y * 0.25, 180)}px)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // --- DEBOUNCE HOOKS (Auto-save magic) ---
  const debouncedProfile = useDebounce(localProfile, 1500);
  const debouncedColor = useDebounce(backgroundColor, 1000);

  // --- MUTATIONS (DB Savers) ---
  const saveProfileMutation = useMutation({
    mutationFn: async (updatedProfile) => {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile),
      });
      if (!res.ok) throw new Error("Failed to save profile");
    },
    onSuccess: () => queryClient.invalidateQueries(["myProfile"]),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings) => {
      const res = await fetch("/api/portfolio/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
    },
    onSuccess: () => queryClient.invalidateQueries(["mySettings"]),
  });

  // --- AUTO-SAVE TRIGGERS ---
  useEffect(() => {
    if (debouncedProfile && profileData) {
      saveProfileMutation.mutate(debouncedProfile);
    }
  }, [debouncedProfile]);

  useEffect(() => {
    if (settingsData && debouncedColor !== settingsData.backgroundColor) {
      saveSettingsMutation.mutate({ backgroundColor: debouncedColor, theme });
    }
  }, [debouncedColor, theme]);

  // --- GALLERY EDITING LOGIC ---
  const handleAddGalleryImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Optimistic UI: Show the temporary image instantly
    const tempId = `temp_${Date.now()}`;
    const tempUrl = URL.createObjectURL(file);

    setLocalProfile((prev) => {
      const newImages = [...(prev.images || [])];
      newImages.push({ 
        url: tempUrl, 
        order: newImages.length + 1, 
        cover: false, 
        _id: tempId, 
        isUploading: true 
      });
      return { ...prev, images: newImages };
    });

    e.target.value = "";

    try {
      // 2. Get the Cloudinary Permission Slip
      const sigRes = await fetch('/api/upload/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'portfolio_gallery' })
      });
      
      if (!sigRes.ok) throw new Error("Failed to get signature");
      const sigData = await sigRes.json();

      // 3. Upload directly to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sigData.apiKey);
      formData.append('timestamp', sigData.timestamp);
      formData.append('signature', sigData.signature);
      formData.append('folder', sigData.folder);

      const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`, 
          { method: 'POST', body: formData }
      );
      
      const uploadData = await uploadRes.json();
      if (!uploadData.secure_url) throw new Error("Upload failed");

      // 4. THE FIX: Update React AND immediately force a database save!
      setLocalProfile((prev) => {
          // Swap the temporary blob URL for the permanent Cloudinary URL
          const newImages = prev.images.map(img => 
              img._id === tempId 
                  ? { url: uploadData.secure_url, order: img.order, cover: false } 
                  : img
          );

          const updatedProfile = { ...prev, images: newImages };

          // Create a clean copy to send to MongoDB
          const cleanProfile = {
              ...updatedProfile,
              images: updatedProfile.images.filter(img => !img.isUploading && !img.url.startsWith("blob:"))
          };

          // SKIP THE DEBOUNCE AND SAVE IMMEDIATELY
          saveProfileMutation.mutate(cleanProfile);

          return updatedProfile; 
      });

    } catch (error) {
       console.error("Gallery upload error:", error);
       setLocalProfile((prev) => ({
           ...prev,
           images: prev.images.filter(img => img._id !== tempId)
       }));
       alert("Failed to upload gallery image. Please try again.");
    }
  };

const handleDeleteImage = async (idToRemove) => {
    // 1. Find the image data BEFORE we delete it from state, so we know its URL
    const imageToDelete = localProfile.images.find(img => img._id === idToRemove);
    
    // 2. Optimistic UI: Instantly remove it from the screen
    setLocalProfile((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img._id !== idToRemove),
    }));

    // (Your useDebounce hook will automatically see the state change and update MongoDB for you!)

    // 3. Background Cleanup: If it's a real Cloudinary image, destroy it permanently
    if (imageToDelete && imageToDelete.url.includes("res.cloudinary.com")) {
        try {
            await fetch('/api/upload/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: imageToDelete.url })
            });
            console.log("Image permanently wiped from Cloudinary");
        } catch (error) {
            console.error("Failed to delete from Cloudinary backend", error);
        }
    }
  };

  const handleMoveImage = (index, direction) => {
    setLocalProfile((prev) => {
      const newImages = [...prev.images];
      if (direction === "up" && index > 1) {
        [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      } else if (direction === "down" && index < newImages.length - 1) {
        [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
      }
      return { ...prev, images: newImages };
    });
  };

const handleHeroImageUpdate = async (newCloudinaryUrl) => {
    // 1. Capture the old URL *before* we overwrite it in state
    const oldHeroUrl = localProfile.images?.[0]?.url;

    // 2. Instantly update the React UI with the newly uploaded image
    setLocalProfile((prev) => {
      const newImages = [...(prev.images || [])];
      if (newImages.length > 0) {
        newImages[0] = { ...newImages[0], url: newCloudinaryUrl };
      } else {
        newImages.push({ url: newCloudinaryUrl, order: 1, cover: true });
      }
      return { ...prev, images: newImages };
    });

    // (Your useDebounce hook will notice this state change and save the new URL to MongoDB automatically!)

    // 3. Background Cleanup: If the old image was a real Cloudinary file, destroy it!
    if (oldHeroUrl && oldHeroUrl.includes("res.cloudinary.com") && oldHeroUrl !== newCloudinaryUrl) {
      try {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: oldHeroUrl })
        });
        console.log("Old Hero Image permanently wiped from Cloudinary!");
      } catch (error) {
        console.error("Failed to delete old Hero Image from Cloudinary", error);
      }
    }
  };

  // --- HANDLERS FOR TEXT/STATS EDITS ---
  const updateField = (field, value) => {
    setLocalProfile((prev) => ({ ...prev, [field]: value }));
  };

  const updateLocation = (field, value) => {
    setLocalProfile((prev) => ({ ...prev, location: { ...prev.location, [field]: value } }));
  };

  const updateStat = (field, value) => {
    setLocalProfile((prev) => ({ ...prev, stats: { ...(prev.stats || {}), [field]: value } }));
  };

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
    return 0.299 * r + 0.587 * g + 0.114 * b < 140 ? "#F2F2EE" : "#1E1E1C";
  }

  if (isLoadingProfile || !localProfile) {
    return <div className="min-h-screen flex items-center justify-center bg-[#483e3b] text-[#F2F2EE]">Loading Editor...</div>;
  }

  const textColor = getNeutralTextColor(backgroundColor);
  const heroImageUrl = localProfile.images?.[0]?.url || "";
  const galleryImages = localProfile.images?.length > 1 ? localProfile.images.slice(1) : [];
  const socials = localProfile.instagram ? { instagram: localProfile.instagram } : {};
  const stats = localProfile.stats || {};

  return (
    <div className="relative w-full min-h-[200vh] pb-32" style={{ backgroundColor }}>
      
      {/* --- SAVING INDICATOR --- */}
      {(saveProfileMutation.isPending || saveSettingsMutation.isPending) && (
        <div className="fixed top-4 right-4 z-50 bg-black/80 text-[#F2F2EE] px-4 py-2 rounded-full text-xs animate-pulse">
          Saving to Database...
        </div>
      )}

      {/* ==========================================
          HERO SECTION (Vogue Theme)
          ========================================== */}
      <main className="relative h-[75vh] md:h-screen vogue-heading" style={{ color: textColor }}>
        <EditableText
          as="h1"
          value={localProfile.firstName}
          onChange={(val) => updateField("firstName", val)}
          className="font-extrabold flex justify-center pt-[150px] md:pt-12 text-center px-4 hover:opacity-80 transition-opacity"
        />
        <EditableText
          as="h2"
          value={localProfile.heading1 || "THE BUTTERLY EFFECT"}
          onChange={(val) => updateField("heading1", val)}
          className="absolute sub-headings z-12 max-w-[500px] pl-24 pt-24 hidden md:block"
          style={{ color: textColor }}
        />
        <EditableText
          as="h2"
          value={localProfile.heading2 || "GLOBAL STYLE ICONS"}
          onChange={(val) => updateField("heading2", val)}
          className="absolute sub-headings z-12 max-w-[500px] right-[180px] top-[900px] hidden md:block"
          style={{ color: textColor }}
        />

        {/* GLOW */}
        <div
          ref={glowRef}
          className="pointer-events-none absolute top-28 left-1/2 md:w-[759px] md:h-[759px] w-[359px] h-[359px] rounded-full blur-2xl"
          style={{ backgroundColor: applyHexShift(backgroundColor), transform: "translate(-50%, 0px)" }}
        />

        {/* HERO IMAGE */}
        <div ref={imageRef} className="absolute top-3 left-0 right-0 mx-auto flex justify-center">
          <UploadHeroImage setFileUrl={handleHeroImageUpdate} defaultPic={heroImageUrl} />
        </div>
      </main>

      {/* ==========================================
          DETAILS CARDS SECTION 
          ========================================== */}
      <section className="relative z-10 w-full max-w-[1400px] mx-auto px-6 py-24 md:pt-[620px]" style={{ color: textColor }}>
        <div className="flex flex-col md:flex-row gap-4">
          
          {/* 1. IDENTITY CARD */}
          <div
            className="flex-1 p-8 rounded-xl flex flex-col justify-between min-h-[280px] border border-black/10 shadow-sm transition-transform hover:scale-[1.01]"
            style={{ backgroundColor: applyHexShift(backgroundColor) }}
          >
            <div>
              <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-3">Model Profile (Edit)</span>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex flex-row gap-3">
                  <EditableText
                    as="h2"
                    value={localProfile.firstName}
                    onChange={(val) => updateField("firstName", val)}
                    className="text-4xl md:text-5xl font-serif leading-[0.95] border-b border-transparent hover:border-current border-dashed"
                  />
                  <EditableText
                    as="h2"
                    value={localProfile.lastName}
                    onChange={(val) => updateField("lastName", val)}
                    className="text-4xl md:text-5xl font-serif leading-[0.95] border-b border-transparent hover:border-current border-dashed"
                  />
                </div>
                {Object.keys(socials).length > 0 && (
                  <SocialIcons socials={socials} size={24} className="opacity-70 hover:opacity-100 transition-opacity" iconClassName="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="mt-10">
              <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-2">Category</span>
              <EditableText
                as="p"
                value={localProfile.category}
                onChange={(val) => updateField("category", val)}
                className="text-2xl font-light border-b border-transparent hover:border-current border-dashed w-fit"
              />
            </div>
          </div>

          {/* 2. MEASUREMENTS CARD */}
          <div
            className="w-full md:w-[320px] p-8 rounded-xl flex flex-col border border-black/10 shadow-sm transition-transform hover:scale-[1.01]"
            style={{ backgroundColor: applyHexShift(backgroundColor) }}
          >
            <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-4">Measurements (Edit)</span>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm font-medium">
              <div>
                <span className="opacity-60 block text-xs mb-1 font-normal uppercase">Height (cm)</span>
                <EditableText value={stats.height || ""} onChange={(val) => updateStat("height", val)} className="border-b border-transparent hover:border-current border-dashed" />
              </div>
              <div>
                <span className="opacity-60 block text-xs mb-1 font-normal uppercase">Chest (cm)</span>
                <EditableText value={stats.chest || ""} onChange={(val) => updateStat("chest", val)} className="border-b border-transparent hover:border-current border-dashed" />
              </div>
              <div>
                <span className="opacity-60 block text-xs mb-1 font-normal uppercase">Waist (cm)</span>
                <EditableText value={stats.waist || ""} onChange={(val) => updateStat("waist", val)} className="border-b border-transparent hover:border-current border-dashed" />
              </div>
              <div>
                <span className="opacity-60 block text-xs mb-1 font-normal uppercase">Hips (cm)</span>
                <EditableText value={stats.hips || ""} onChange={(val) => updateStat("hips", val)} className="border-b border-transparent hover:border-current border-dashed" />
              </div>
              <div>
                <span className="opacity-60 block text-xs mb-1 font-normal uppercase">Shoe (EU)</span>
                <EditableText value={stats.shoe || ""} onChange={(val) => updateStat("shoe", val)} className="border-b border-transparent hover:border-current border-dashed" />
              </div>
              <div>
                <span className="opacity-60 block text-xs mb-1 font-normal uppercase">Age Range</span>
                <EditableText value={stats.ageRange || ""} onChange={(val) => updateStat("ageRange", val)} className="border-b border-transparent hover:border-current border-dashed" />
              </div>
            </div>
          </div>

          {/* 3. LOCATION CARD */}
          <div
            className="w-full md:w-[280px] p-8 rounded-xl flex flex-col justify-between border border-black/10 shadow-sm transition-transform hover:scale-[1.01]"
            style={{ backgroundColor: applyHexShift(backgroundColor) }}
          >
            <div>
              <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-3">City</span>
              <EditableText
                as="p"
                value={localProfile.location?.city}
                onChange={(val) => updateLocation("city", val)}
                className="text-2xl font-medium border-b border-transparent hover:border-current border-dashed w-fit"
              />
            </div>
            <div className="mt-10 pt-6 border-t border-black/10">
              <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-2">Country</span>
              <EditableText
                as="p"
                value={localProfile.location?.country}
                onChange={(val) => updateLocation("country", val)}
                className="text-xl opacity-70 border-b border-transparent hover:border-current border-dashed w-fit"
              />
            </div>
          </div>
        </div>

        {/* BIO CARD */}
        <div
          className="mt-8 p-8 rounded-xl border border-black/10 shadow-sm transition-transform hover:scale-[1.01]"
          style={{ backgroundColor: applyHexShift(backgroundColor) }}
        >
          <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-60 block mb-4">Biography (Edit)</span>
          <EditableText
            as="p"
            value={localProfile.bio}
            onChange={(val) => updateField("bio", val)}
            className="text-lg md:text-xl leading-relaxed font-serif opacity-85 max-w-[900px] border border-transparent hover:border-current border-dashed p-2 rounded-md"
          />
        </div>
      </section>

      {/* ==========================================
          EDITABLE GALLERY SECTION
          ========================================== */}
      <section className="max-w-[1400px] mx-auto px-6 mt-12 pb-24">
        <div className="flex justify-between items-center mb-6" style={{ color: textColor }}>
          <p className="text-xs uppercase tracking-widest opacity-50">Gallery ({galleryImages.length} images)</p>
          <input type="file" accept="image/*" ref={galleryInputRef} onChange={handleAddGalleryImage} className="hidden" />
          <button 
            onClick={() => galleryInputRef.current?.click()}
            className="text-xs border px-4 py-2 rounded-full hover:bg-black/10 transition flex items-center gap-2"
            style={{ borderColor: textColor }}
          >
            + Add Image
          </button>
        </div>

        <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
          {galleryImages.map((img, index) => {
            const realIndex = index + 1; 
            return (
              <div key={img._id || `temp_${index}`} className="relative group break-inside-avoid">
                <Image src={img.url} alt="Gallery image" width={500} height={700} unoptimized className="w-full rounded-lg object-cover" />

                {img.isUploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleMoveImage(realIndex, "up")} disabled={realIndex === 1} className="bg-white text-black w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition disabled:opacity-30 disabled:cursor-not-allowed">↑</button>
                    <button onClick={() => handleMoveImage(realIndex, "down")} disabled={realIndex === localProfile.images.length - 1} className="bg-white text-black w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition disabled:opacity-30 disabled:cursor-not-allowed">↓</button>
                  </div>
                  <button onClick={() => handleDeleteImage(img._id)} className="bg-red-500 text-white px-4 py-1 rounded-full text-xs font-bold hover:bg-red-600 transition">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- COLOR PICKER WIDGET --- */}
      <div
        className="fixed bottom-4 right-4 z-50 w-[36px] h-[36px] rounded-full border-2 cursor-pointer shadow-lg hover:scale-110 transition"
        style={{ backgroundColor, borderColor: textColor }}
        onClick={() => setShowColorPicker(!showColorPicker)}
        title="Change Background Color"
      />
      {showColorPicker && (
        <div className="fixed bottom-16 right-4 z-50 bg-white p-2 rounded-xl shadow-2xl">
          <HexColorPicker color={backgroundColor} onChange={setBackgroundColor} />
        </div>
      )}

    </div>
  );
}