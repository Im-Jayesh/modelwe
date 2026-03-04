"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const TOTAL_STEPS = 4; // Updated from 3 to 4!

export default function CompleteProfilePage() {
    const router = useRouter();
    const [pageCount, setPageCount] = useState(1);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        category: "",
        location: {
            city: "",
            country: ""
        },
        experienceLevel: "",
        bio: "",
        stats: {
            height: "", 
            chest: "",
            waist: "",
            hips: "",
            shoe: "",
            ageRange: null
        },
        images: [
            { url: "/demo/pencil_icon.png", order: 1, cover: true },
        ],
        instagram: "",
        openToWorkNow: true,
        // NEW: Initialized in state!
        username: "",
        agency: ""
    });

    const saveProfileMutation = useMutation({
        mutationFn: async (newProfileData) => {
            const response = await fetch('/api/users/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProfileData),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || "Failed to save profile");
            }
            return data;
        },
        onSuccess: () => {
            router.push('/dashboard'); 
        },
        onError: (error) => {
            setServerError(error.message);
        }
    });

    const currentMinAge = Number((formData.stats.ageRange || "20-25").split(/[-–]/)[0]);

    // --- HANDLERS ---
    const handleBasicChanges = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    }

    const handleNestedChanges = (section, e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [section]: { ...prev[section], [name]: value }
        }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    }

    // --- VALIDATION LOGIC ---
// --- BULLETPROOF VALIDATION LOGIC ---
    const validateStep = () => {
        const newErrors = {};

        if (pageCount === 1) {
            // Using || "" protects against undefined/null crashes
            if (!(formData.firstName || "").trim()) newErrors.firstName = "Required";
            if (!(formData.lastName || "").trim()) newErrors.lastName = "Required";
            if (!formData.category) newErrors.category = "Required";
            if (!(formData.location?.city || "").trim()) newErrors.city = "Required";
            if (!(formData.location?.country || "").trim()) newErrors.country = "Required";
        }

        if (pageCount === 2) {
            const requiredStats = ['height', 'chest', 'waist', 'hips', 'shoe'];
            requiredStats.forEach(field => {
                const val = formData.stats?.[field];
                if (!val) {
                    newErrors[field] = "Required";
                } else if (isNaN(val) || Number(val) <= 0) {
                    newErrors[field] = "Invalid";
                }
            });
        }

        if (pageCount === 3) {
            if (!(formData.bio || "").trim()) newErrors.bio = "Required";
            const urlRegex = /^(https?:\/\/)?([\w\d\-_]+\.+[A-Za-z]{2,})+\/?/;
            if (formData.instagram && !urlRegex.test(formData.instagram)) {
                newErrors.instagram = "Invalid URL format";
            }
        }

        if (pageCount === 4) {
            const currentUsername = formData.username || "";
            if (!currentUsername.trim()) {
                newErrors.username = "Username is required";
            } else if (currentUsername.length < 3) {
                newErrors.username = "Must be at least 3 characters";
            }
        }

        setErrors(newErrors);
        
        // Return true ONLY if there are exactly 0 errors
        return Object.keys(newErrors).length === 0; 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");
        
        console.log("1. Submit Button Clicked!");
        
        try {
            const isValid = validateStep();
            console.log("2. Validation Passed?", isValid);
            console.log("3. Current Errors:", errors);

            if (isValid) {
                console.log("4. Sending Data to Database:", formData);
                saveProfileMutation.mutate(formData);
            } else {
                console.warn("Validation failed on step 4. Check the UI for red text.");
            }
        } catch (err) {
            console.error("FATAL ERROR IN SUBMIT:", err);
            setServerError("A local application error occurred. Please check console.");
        }
    };

    const handleNext = () => {
        if (validateStep()) {
            setPageCount(prev => Math.min(prev + 1, TOTAL_STEPS));
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleBack = () => {
        setPageCount(prev => Math.max(prev - 1, 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Helper for beautiful inputs
    const InputWrapper = ({ label, error, children }) => (
        <div className="w-full flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
                <label className="text-[10px] uppercase tracking-widest opacity-60 font-bold">{label}</label>
                {error && <span className="text-red-500 text-[10px] uppercase tracking-widest font-bold">{error}</span>}
            </div>
            {children}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F2F2EE] text-[#1E1E1C] flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-[700px] bg-white border border-black/10 rounded-2xl p-8 md:p-14 shadow-2xl relative overflow-hidden">
                
                {/* Visual Flair */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-neutral-200 via-black to-neutral-200 opacity-20"></div>

                <div className="mb-12 text-center">
                    <h1 className="text-4xl md:text-5xl font-serif tracking-tight mb-4">The Final Details</h1>
                    <p className="text-sm opacity-60 leading-relaxed max-w-[400px] mx-auto">
                        Establish your presence on the network. Connect with agencies, bookers, and other creatives.
                    </p>
                </div>

                {/* PROGRESS INDICATOR */}
                <div className="mb-12">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold opacity-40 mb-3">
                        <span>Step {pageCount} of {TOTAL_STEPS}</span>
                        <span>{Math.round((pageCount / TOTAL_STEPS) * 100)}%</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-1">
                        <div 
                            className="bg-black h-1 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${(pageCount / TOTAL_STEPS) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* SERVER ERROR DISPLAY */}
                {serverError && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center font-medium">
                        {serverError}
                    </div>
                )}

                {/* STEP 1: BASICS */}
                {pageCount === 1 && (
                    <div className="flex flex-col gap-8 animate-fade-in">
                        <div className="flex flex-col md:flex-row gap-6">
                            <InputWrapper label="First Name" error={errors.firstName}>
                                <input type="text" name="firstName" placeholder="Jane" value={formData.firstName} onChange={handleBasicChanges} className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg" />
                            </InputWrapper>
                            <InputWrapper label="Last Name" error={errors.lastName}>
                                <input type="text" name="lastName" placeholder="Doe" value={formData.lastName} onChange={handleBasicChanges} className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg" />
                            </InputWrapper>
                        </div>

                        <InputWrapper label="Primary Category" error={errors.category}>
                            <select name="category" value={formData.category} onChange={handleBasicChanges} className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg appearance-none cursor-pointer">
                                <option value="" disabled>Select your focus</option>
                                <option value="Fitness">Fitness</option>
                                <option value="Fashion">Fashion / Editorial</option>
                                <option value="Commercial">Commercial</option>
                                <option value="Runway">Runway</option>
                            </select>
                        </InputWrapper>

                        <div className="flex flex-col md:flex-row gap-6">
                            <InputWrapper label="City" error={errors.city}>
                                <input type="text" name="city" placeholder="New York" value={formData.location.city} onChange={(e) => handleNestedChanges("location", e)} className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg" />
                            </InputWrapper>
                            <InputWrapper label="Country" error={errors.country}>
                                <input type="text" name="country" placeholder="USA" value={formData.location.country} onChange={(e) => handleNestedChanges("location", e)} className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg" />
                            </InputWrapper>
                        </div>
                    </div>
                )}

                {/* STEP 2: STATS */}
                {pageCount === 2 && (
                    <div className="flex flex-col gap-8 animate-fade-in">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                            {['height', 'chest', 'waist', 'hips', 'shoe'].map((field) => (
                                <InputWrapper key={field} label={`${field} ${field === 'shoe' ? '(EU)' : '(CM)'}`} error={errors[field]}>
                                    <input 
                                        type="number" 
                                        name={field} 
                                        placeholder="0" 
                                        value={formData.stats[field]} 
                                        onChange={(e) => handleNestedChanges("stats", e)} 
                                        className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg" 
                                    />
                                </InputWrapper>
                            ))}
                        </div>

                        <InputWrapper label={`Age Range: ${currentMinAge}–${currentMinAge + 5} years`}>
                            <input 
                                type="range" 
                                min="16" max="60" 
                                name="ageRange"
                                value={currentMinAge}
                                onChange={(e) => {
                                    const newMin = Number(e.target.value);
                                    handleNestedChanges("stats", { target: { name: "ageRange", value: `${newMin}-${newMin + 5}` } });
                                }}
                                className="w-full h-2 mt-4 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                            />
                        </InputWrapper>
                    </div>
                )}

                {/* STEP 3: SOCIALS & BIO */}
                {pageCount === 3 && (
                    <div className="flex flex-col gap-8 animate-fade-in">
                        <InputWrapper label="Biography" error={errors.bio}>
                            <textarea 
                                name="bio" 
                                rows="4"
                                placeholder="Tell your story. What makes your look unique?" 
                                value={formData.bio} 
                                onChange={handleBasicChanges} 
                                className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg resize-none" 
                            />
                        </InputWrapper>

                        <InputWrapper label="Instagram Handle (Optional)" error={errors.instagram}>
                            <input 
                                type="url" 
                                name="instagram" 
                                placeholder="https://instagram.com/..." 
                                value={formData.instagram} 
                                onChange={handleBasicChanges} 
                                className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg" 
                            />
                        </InputWrapper>
                    </div>
                )}

                {/* STEP 4: IDENTITY */}
                {pageCount === 4 && (
                    <div className="flex flex-col gap-8 animate-fade-in">
                        <InputWrapper label="Network Username (Unique)" error={errors.username}>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 font-serif text-xl">@</span>
                                <input 
                                    type="text" 
                                    name="username"
                                    placeholder="gigihadid"
                                    value={formData.username}
                                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg"
                                />
                            </div>
                            <p className="text-[10px] opacity-40 mt-2">Only lowercase letters, numbers, and underscores.</p>
                        </InputWrapper>

                        <InputWrapper label="Mother Agency (Optional)">
                            <input 
                                type="text" 
                                name="agency"
                                placeholder="IMG Models, Elite, or Freelance"
                                value={formData.agency}
                                onChange={(e) => setFormData({...formData, agency: e.target.value})}
                                className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl focus:outline-none focus:border-black transition text-lg"
                            />
                        </InputWrapper>
                    </div>
                )}

                {/* NAVIGATION BUTTONS */}
                <div className="flex gap-4 mt-12 pt-8 border-t border-black/5">
                    {pageCount > 1 && (
                        <button 
                            type="button"
                            className="flex-1 py-4 px-6 border border-black/20 text-black text-xs uppercase tracking-widest font-bold rounded-full hover:bg-black/5 transition-colors" 
                            onClick={handleBack}
                            disabled={saveProfileMutation.isPending}
                        >
                            Back
                        </button>
                    )}
                    
                    {pageCount < TOTAL_STEPS ? (
                        <button 
                            type="button"
                            className="flex-1 py-4 px-6 bg-[#1E1E1C] text-[#F2F2EE] text-xs uppercase tracking-widest font-bold rounded-full hover:bg-black transition-colors" 
                            onClick={handleNext}
                        >
                            Continue
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit} 
                            disabled={saveProfileMutation.isPending} 
                            className="flex-1 py-4 px-6 bg-blue-600 text-white text-xs uppercase tracking-widest font-bold rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saveProfileMutation.isPending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : "Complete Profile"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}