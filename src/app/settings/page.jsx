"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const fetchMyProfile = async () => {
  const res = await fetch("/api/users/profile");
  if (!res.ok) throw new Error("Failed to fetch profile");
  const data = await res.json();
  return data.profile;
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ username: "", agency: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: fetchMyProfile,
  });

  useEffect(() => {
    if (profile) {
      setFormData({ 
        username: profile.username || "", 
        agency: profile.agency || "Freelance" 
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (updatedData) => {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update settings");
      return data;
    },
    onSuccess: () => {
      setErrorMsg("");
      setSuccessMsg("Settings saved successfully.");
      queryClient.invalidateQueries(["myProfile"]);
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err) => {
      setSuccessMsg("");
      setErrorMsg(err.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) return <div className="min-h-screen bg-[#F2F2EE] flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#F2F2EE] text-[#1E1E1C] pt-24 pb-32">
      <div className="max-w-[600px] mx-auto px-6">
        <h1 className="text-3xl font-serif mb-8">Account Settings</h1>

        {errorMsg && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-6">{errorMsg}</div>}
        {successMsg && <div className="bg-green-100 text-green-800 p-3 rounded-lg text-sm mb-6">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label className="block text-xs uppercase tracking-widest opacity-60 mb-2 font-semibold">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 font-medium">@</span>
              <input 
                type="text" 
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                className="w-full pl-8 pr-4 py-3 bg-white border border-black/10 rounded-lg focus:outline-none focus:border-black transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest opacity-60 mb-2 font-semibold">Agency</label>
            <input 
              type="text" 
              value={formData.agency}
              onChange={(e) => setFormData({...formData, agency: e.target.value})}
              className="w-full px-4 py-3 bg-white border border-black/10 rounded-lg focus:outline-none focus:border-black transition"
            />
          </div>

          <button 
            type="submit" 
            disabled={saveMutation.isPending}
            className="mt-4 w-full bg-[#1E1E1C] text-[#F2F2EE] py-4 rounded-full text-xs uppercase tracking-widest font-semibold hover:bg-black transition disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}