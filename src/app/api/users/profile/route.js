import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import Profile from "@/models/Profile";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { redis } from "@/lib/redis";
import { getOrSetCache } from "@/lib/cache";

// --- HELPER: Get User ID from the Secure Cookie ---
const getDataFromToken = (request) => {
    try {
        const token = request.cookies.get("token")?.value || '';
        if (!token) return null;
        
        const decodedToken = jwt.verify(token, process.env.SECRET);
        
        // Defensive check for multiple ID field names
        const actualId = decodedToken.id || decodedToken.userId || decodedToken._id;
        
        return actualId;
    } catch (error) {
        return null;
    }
};

// ==========================================
// GET: Fetch the user's current profile (Supports Public & Private)
// ==========================================
export async function GET(request) {
    try {
        await dbConnect();
        
        const url = new URL(request.url);
        const queryId = url.searchParams.get("id");
        
        // Priority: queryId (Public) > Token (Private/Dashboard)
        const userId = queryId || getDataFromToken(request);

        if (!userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const cacheKey = `profile:${userId}`;

        // 1. CACHE-ASIDE: Try Redis first, then fallback to MongoDB
        const profile = await getOrSetCache(cacheKey, async () => {
            const data = await Profile.findOne({ userId }).lean();
            return data;
        }, 3600); // 1-hour "Safety Net" TTL

        if (!profile) {
            return NextResponse.json({ message: "Profile not found", profile: null }, { status: 200 });
        }

        // 2. LIVE STATS: Always fetch views directly from Redis (Real-time)
        const uniqueViews = await redis.pfcount(`portfolio:views:${userId}`);

        // Merge live views into the cached profile object
        const profileWithStats = {
            ...profile,
            stats: {
                ...(profile.stats || {}),
                views: uniqueViews || 0
            }
        };

        return NextResponse.json({ message: "Profile found", profile: profileWithStats }, { status: 200 });

    } catch (error) {
        console.error("Profile GET Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// ==========================================
// POST: Create OR Update the profile (Strictly Private)
// ==========================================
export async function POST(request) {
    try {
        await dbConnect();

        const userId = getDataFromToken(request);
        if (!userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const reqBody = await request.json();

        // 1. DATABASE UPDATE (Upsert)
        const savedProfile = await Profile.findOneAndUpdate(
            { userId: userId }, 
            { 
                ...reqBody,     
                userId: userId  
            }, 
            { 
                new: true,      
                upsert: true,   
                runValidators: true 
            }
        ).lean();

        // 2. ACTIVE INVALIDATION: Kill the old cache so changes are instant
        await redis.del(`profile:${userId}`);

        // 3. Update User Status
        await User.findByIdAndUpdate(userId, { isProfileComplete: true });

        const response = NextResponse.json({ 
            message: "Profile saved successfully", 
            profile: savedProfile 
        }, { status: 200 });

        // Update the completion cookie
        response.cookies.set("isProfileComplete", "true", {
            httpOnly: true,  
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict", 
            path: "/", 
            maxAge: 60 * 60 * 24 * 7, 
        });

        return response;

    } catch (error) {
        if (error.code === 11000 && error.keyPattern?.username) {
            return NextResponse.json({ 
                message: "That username is already taken. Please choose another one." 
            }, { status: 400 });
        }
        
        console.error("Profile POST Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}