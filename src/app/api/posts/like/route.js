import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import PostLike from "@/models/PostLike";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import { updateUserAffinity } from "@/lib/affinityWorker"; // <-- NEW IMPORT

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

        const existing = await PostLike.findOne({ postId, userId }).lean();

        // --- UNLIKE PATH ---
        if (existing) {
            await PostLike.deleteOne({ _id: existing._id });

            try {
                await redisIncrWithRetry("post:likes:queue", postId, -1);
                
                // BACKGROUND: Reduce affinity (optional: passing -1 or just let it stay)
                // We trigger it without 'await' to keep the response fast
                updateUserAffinity(userId, postId, -1).catch(e => console.error("Affinity Error:", e));
                
            } catch (redisErr) {
                console.error("Redis decrement failed for unlike:", redisErr);
            }

            return NextResponse.json({ isLiked: false });
        }

        // --- LIKE PATH ---
        try {
            await PostLike.create({ postId, userId });

            try {
                await redisIncrWithRetry("post:likes:queue", postId, 1);
                
                // BACKGROUND: Boost affinity (Positive reinforcement)
                updateUserAffinity(userId, postId, 1).catch(e => console.error("Affinity Error:", e));
                
            } catch (redisErr) {
                console.error("Redis increment failed for like:", redisErr);
            }

            return NextResponse.json({ isLiked: true });

        } catch (err) {
            if (err && (err.code === 11000 || (err.message && err.message.includes("duplicate key")))) {
                try {
                    await redisIncrWithRetry("post:likes:queue", postId, 1);
                    // Still trigger affinity even on duplicate race condition
                    updateUserAffinity(userId, postId, 1).catch(e => console.error("Affinity Error:", e));
                } catch (redisErr) {
                    console.error("Redis increment failed after duplicate key:", redisErr);
                }
                return NextResponse.json({ isLiked: true });
            }
            throw err;
        }
    } catch (error) {
        console.error("Like Toggle Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}