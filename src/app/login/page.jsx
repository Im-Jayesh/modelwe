"use client";
import Link from "next/link";
import { useState } from 'react';
import { useRouter } from "next/navigation";
 
export default function LoginPage() {
    const router = useRouter();
    const [user, setUser] = useState({
        email: "",
        password: ""
    })

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const {name, value} = e.target;
        setUser((prev) => ({
            ...prev,
            [name]: value
        }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await fetch("/api/users/login", {
                method: "POST",
                headers: {  "Content-Type": "application/json" },
                body: JSON.stringify(user)
            });
            const data = await response.json();
            if (response.ok) {
                // router.push("/login");
                setUser({ email: "", password: "" }); // Reset form
                setLoading(false);

                if (data.isProfileComplete) {
                    router.push("/dashboard");
                } else {
                    router.push("/complete-profile");
                }

            } else {
                setError(data.message || "Login failed. Please try again.");
            }
        } catch (error) {
            console.error("Login error:", error);
            alert("An error occurred. Please try again. " + error.message);
        } 
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-[#D3C7C4]">
           
            {error && <p className="mb-4 text-red-500 h-6 w-fit p-2 bg-white">{error}</p>}
            <div className="flex flex-col gap-6 p-8 border rounded-md md:w-1/3 w-2/3 bg-[#2C2726] border-black">
                <h1 className="text-2xl font-bold mb-4" >Login</h1>

                <label htmlFor="email" className="w-full flex flex-col gap-1">
                    Email
                    <input 
                        type="text" 
                        placeholder="Email Address" 
                        name="email"
                        value={user.email}
                        onChange={handleChange}
                        className="w-full p-3 rounded-md bg-[#2C2726] border border-white focus:outline-none focus:ring-2 focus:ring-[#E8C7A0]"
                    />
                </label>

                <label htmlFor="email" className="w-full flex flex-col gap-1">
                    Password
                    <input 
                        type="password" 
                        placeholder="Password" 
                        name="password"
                        value={user.password}
                        onChange={handleChange}
                        className="w-full p-3 rounded-md bg-[#2C2726] border border-white focus:outline-none focus:ring-2 focus:ring-[#E8C7A0]"
                    />
                </label>
                <button 
                className="w-full py-3 bg-[#57684d] text-[#2C2726] font-bold rounded-full hover:bg-[#94ad86] transition-colors duration-300"
                onClick={handleSubmit}>
                    {loading ? "Login in..." : "Login"}
                </button>
                <p>Don't have an account. create one <Link href="/signup" className="underline">here</Link> </p>
            </div>
        </div>
    )
}