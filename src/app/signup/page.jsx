"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const router = useRouter();

    const [user, setUser] = useState({
        email: "",
        password: "",
        role: "model" // Default to "model"
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUser(prevUser => ({
            ...prevUser,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await fetch("/api/users/signup", {
                method: "POST",
                headers: {  "Content-Type": "application/json" },
                body: JSON.stringify(user)
            });
            const data = await response.json();
            if (response.ok) {
                router.push("/login");
                setUser({ email: "", password: "", role: "model" }); // Reset form
                setLoading(false);
            } else {
                setError(data.message || "Signup failed. Please try again.");
            }
        } catch (error) {
            console.error("Signup error:", error);
            alert("An error occurred. Please try again.");
        } 
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-[#D3C7C4]">
            {error && <p className="mb-4 text-red-500 h-6 w-fit p-2 bg-white">{error}</p>}

            <div className="flex flex-col gap-6 p-8 border rounded-md md:w-1/3 w-2/3 bg-[#2C2726] border-black">
                <h1 className="text-2xl font-bold mb-4">Join the Network</h1>
                <p>Apply to connect with top agencies and models worldwide. Start your journey today.</p>


                <div className="flex flex-col items-start gap-2 accent-[#E8C7A0]">
                    <h4>I AM A</h4>
                    
                    <label className={`flex items-center gap-2 cursor-pointer w-full justify-between py-5 px-4 rounded-md hover:bg-neutral-700/50 border-2 ${user.role === "model" ? "border-[#E8C7A0] text-[#E8C7A0]" : ""}`}>
                        <input 
                            type="radio" 
                            name="role"
                            value="model" 
                            checked={user.role === "model"} 
                            onChange={handleChange}
                            className="w-4 h-4 cursor-pointer"
                        />
                        Model
                    </label>

                    {/* Radio Button 2: Agency */}
                    <label className={`flex items-center gap-2 cursor-pointer w-full justify-between py-5 px-4 rounded-md hover:bg-neutral-700/50 border-2 ${user.role === "agency" ? "border-[#E8C7A0] text-[#E8C7A0]" : ""}`}>
                        <input 
                            type="radio" 
                            name="role" 
                            value="agency" 
                            checked={user.role === "agency"}
                            onChange={handleChange}
                            className="w-4 h-4 cursor-pointer"
                        />
                        Agency
                    </label>
                        
                </div>

                <label htmlFor="email" className="w-full flex flex-col gap-1">
                    Email
                    <input 
                        type="text" 
                        placeholder="Email Address" 
                        name="email"
                        value={user.email}
                        onChange={handleChange}
                        className="w-full p-3 rounded-md bg-[#2C2726] border border-black focus:outline-none focus:ring-2 focus:ring-[#E8C7A0]"
                    />
                </label>
                <label htmlFor="password" className="w-full flex flex-col gap-1">
                    Password
                    <input 
                        type="password" 
                        placeholder="Password" 
                        name="password"
                        value={user.password}
                        onChange={handleChange}
                        className="w-full p-3 rounded-md bg-[#2C2726] border border-black focus:outline-none focus:ring-2 focus:ring-[#E8C7A0]"
                    />
                </label>

                <button 
                className="w-full py-3 bg-[#57684d] text-[#2C2726] font-bold rounded-full hover:bg-[#94ad86] transition-colors duration-300"
                onClick={handleSubmit}>
                    {loading ? "Creating Account..." : "Create Account"}
                </button>

                <p className="text-sm text-center">
                    Already have an account? <Link href="/login" className="text-[#E8C7A0] hover:underline">Log in</Link>.
                </p>
            </div>
        </div>
    );
}
