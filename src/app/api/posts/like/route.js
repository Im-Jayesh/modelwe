import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import PostLike from "@/models/PostLike";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis"; // <-- BRING IN THE REDIS!

const getUserId = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        return decoded.userId || decoded.id || decoded._id;
    } catch {
        return null;
    }
};

// tiny retry helper for Redis ops (optional but helpful for transient errors)
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

    // 1. Check if a like exists already
    const existing = await PostLike.findOne({ postId, userId }).lean();

    if (existing) {
      // UNLIKE path
      await PostLike.deleteOne({ _id: existing._id });

      // queue decrement in redis; reliable attempt
      try {
        await redisIncrWithRetry("post:likes:queue", postId, -1);
      } catch (redisErr) {
        console.error("Redis decrement failed for unlike:", redisErr);
        // we still succeed the request, but log for later reconciliation
      }

      return NextResponse.json({ isLiked: false });
    }

    // LIKE path
    try {
      // create a PostLike doc (unique index prevents duplicates)
      await PostLike.create({ postId, userId });

      // queue increment in redis
      try {
        await redisIncrWithRetry("post:likes:queue", postId, 1);
      } catch (redisErr) {
        console.error("Redis increment failed for like:", redisErr);
        // still succeed the request — cron will reconcile misses if needed
      }

      return NextResponse.json({ isLiked: true });
    } catch (err) {
      // If duplicate-key happens due to race, treat as "already liked"
      // Mongo duplicate key error code is 11000
      if (err && (err.code === 11000 || (err.message && err.message.includes("duplicate key")))) {
        // Try to ensure redis queue is incremented (idempotent-ish)
        try {
          await redisIncrWithRetry("post:likes:queue", postId, 1);
        } catch (redisErr) {
          console.error("Redis increment failed after duplicate key:", redisErr);
        }
        return NextResponse.json({ isLiked: true });
      }

      // Otherwise rethrow
      throw err;
    }
  } catch (error) {
    console.error("Like Toggle Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}