// app/api/cron/sync-likes/route.js  (GET - protected by CRON_SECRET)
import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import Post from "@/models/Post";
import mongoose from "mongoose";
import { redis } from "@/lib/redis";

const QUEUE_KEY = "post:likes:queue";

function chunkArray(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export async function GET(request) {
  // basic protection
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("CRON sync-likes triggered at", new Date().toISOString());

  try {
    await dbConnect();

    // 1) check existence quickly
    const exists = await redis.exists(QUEUE_KEY);
    if (!exists) {
      return NextResponse.json({ message: "No likes to sync" }, { status: 200 });
    }

    // 2) atomically rename the queue to a processing key
    const processingKey = `${QUEUE_KEY}:processing:${Date.now()}:${Math.random().toString(36).slice(2,8)}`;

    // RENAME is atomic. If rename fails because queue doesn't exist, we can return.
    try {
      await redis.rename(QUEUE_KEY, processingKey);
    } catch (renameErr) {
      // If rename failed because QUEUE_KEY doesn't exist anymore, nothing to do.
      const stillExists = await redis.exists(QUEUE_KEY);
      if (!stillExists) {
        return NextResponse.json({ message: "No likes to sync" }, { status: 200 });
      }
      // otherwise log and fail
      console.error("Failed to rename queue to processing key:", renameErr);
      return NextResponse.json({ error: "Failed to atomically snapshot queue" }, { status: 500 });
    }

    // 3) fetch snapshot from processingKey
    const queuedLikes = await redis.hgetall(processingKey); // returns object of field->value strings
    if (!queuedLikes || Object.keys(queuedLikes).length === 0) {
      // nothing to do — remove processingKey and return
      await redis.del(processingKey);
      return NextResponse.json({ message: "No likes to sync (empty snapshot)" }, { status: 200 });
    }

    // 4) prepare bulk operations in batches
    const entries = Object.entries(queuedLikes);
    // Convert increments to numbers and skip zeros
    const ops = entries
      .map(([postId, incrementStr]) => {
        const inc = parseInt(incrementStr, 10) || 0;
        if (inc === 0) return null;
        // ensure we try to cast to ObjectId for filter (Mongoose will cast too, but be explicit)
        let oid;
        try {
          oid = new mongoose.Types.ObjectId(postId);
        } catch (e) {
          // invalid id, skip
          console.warn("Skipping invalid postId in likes queue:", postId);
          return null;
        }
        return {
          updateOne: {
            filter: { _id: oid },
            update: { $inc: { likesCount: inc } }
          }
        };
      })
      .filter(Boolean);

    if (ops.length === 0) {
      // nothing to update - cleanup and return
      await redis.del(processingKey);
      return NextResponse.json({ message: "No valid increments to sync" }, { status: 200 });
    }

    // Process in chunks to avoid huge single bulkWrite payloads
    const BATCH_SIZE = 1000;
    const chunks = chunkArray(ops, BATCH_SIZE);

    let postsUpdated = 0;
    try {
      for (const chunk of chunks) {
        const result = await Post.bulkWrite(chunk, { ordered: false });
        // result.nModified may be undefined depending on driver version; best effort:
        postsUpdated += (result.modifiedCount || result.nModified || 0);
      }
      // If we reached here, writes succeeded — delete the processing key
      await redis.del(processingKey);
    } catch (bulkErr) {
      console.error("Bulk write error while syncing likes:", bulkErr);
      // SAFETY: try to restore queue so the next cron can retry
      try {
        // If original queue key does not exist, rename processing key back
        const originalExists = await redis.exists(QUEUE_KEY);
        if (!originalExists) {
          await redis.rename(processingKey, QUEUE_KEY);
        } else {
          // original exists (edge case) - merge processing back into queue:
          // iterate entries and HINCRBY back into QUEUE_KEY, then delete processingKey
          const restoreEntries = Object.entries(queuedLikes);
          for (const [pId, deltaStr] of restoreEntries) {
            const delta = parseInt(deltaStr, 10) || 0;
            if (delta === 0) continue;
            await redis.hincrby(QUEUE_KEY, pId, delta);
          }
          await redis.del(processingKey);
        }
      } catch (restoreErr) {
        console.error("Failed to restore processing key back to queue after bulk err:", restoreErr);
        // At this point, manual intervention required. Keep processingKey for analysis.
      }

      return NextResponse.json({ error: "Failed to persist likes; queue restored or left for retry" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Sync complete",
      postsTouched: ops.length,
      postsUpdated
    }, { status: 200 });

  } catch (error) {
    console.error("Cron Sync Error:", error);
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}