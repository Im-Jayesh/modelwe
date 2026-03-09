import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import mongoose from "mongoose";
import PostLike from "@/models/PostLike";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import { updateUserAffinity } from "@/lib/affinityWorker"; // The engine

const getUserId = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        return decoded.userId || decoded.id || decoded._id;
    } catch { return null; }
};

async function redisIncrWithRetry(key, field, delta, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
        try {
            await redis.hincrby(key, field, delta);
            return;
        } catch (err) {
            if (i === attempts - 1) throw err;
            await new Promise((r) => setTimeout(r, 100 * (i + 1)));
        }
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const userId = await getUserId();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { postId } = await request.json();
        if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

        // Ensure userId is a string for the query to be safe
        const userIdStr = userId.toString();

        const existing = await PostLike.findOne({ 
            postId, 
            userId: { $in: [userIdStr, new mongoose.Types.ObjectId(userIdStr)] } 
        }).lean();

        if (existing) {
            // UNLIKE path
            await PostLike.deleteOne({ _id: existing._id });
            try {
                await redisIncrWithRetry("post:likes:queue", postId, -1);
                // Background Affinity: Decrement
                updateUserAffinity(userIdStr, postId, -1).catch(e => console.error(e));
            } catch (redisErr) { console.error(redisErr); }
            return NextResponse.json({ isLiked: false });
        }

        // LIKE path
        try {
            await PostLike.create({ postId, userId: userIdStr });
            try {
                await redisIncrWithRetry("post:likes:queue", postId, 1);
                // Background Affinity: Increment
                updateUserAffinity(userIdStr, postId, 1).catch(e => console.error(e));
            } catch (redisErr) { console.error(redisErr); }
            return NextResponse.json({ isLiked: true });
        } catch (err) {
            // Duplicate key race condition
            if (err && (err.code === 11000 || err.message?.includes("duplicate key"))) {
                await redisIncrWithRetry("post:likes:queue", postId, 1).catch(() => {});
                updateUserAffinity(userIdStr, postId, 1).catch(() => {});
                return NextResponse.json({ isLiked: true });
            }
            throw err;
        }
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
