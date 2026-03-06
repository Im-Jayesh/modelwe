import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import Post from "@/models/Post";
import Follow from "@/models/Follow";
import PostLike from "@/models/PostLike";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import mongoose from "mongoose";

const getUserId = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        return decoded.userId || decoded.id || decoded._id;
    } catch { return null; }
};

export async function GET(request) {
    try {
        await dbConnect();
        const currentUserId = await getUserId();
        
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // 1. Get the list of people the user follows for priority boosting
        let followingIds = [];
        if (currentUserId) {
            const follows = await Follow.find({ followerId: currentUserId }).lean();
            followingIds = follows.map(f => new mongoose.Types.ObjectId(f.followingId));
        }

        // 2. THE ALGORITHM: MongoDB Aggregation Pipeline
        const posts = await Post.aggregate([
            // Join user details (so we have profilePic and username)
            {
                $lookup: {
                    from: "profiles", // Name of your Profile collection
                    localField: "userId",
                    foreignField: "userId",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            
            // Calculate the Algorithm Variables
            {
                $addFields: {
                    // Check if current user follows them
                    isFollowedByMe: { $in: ["$userId", followingIds] },
                    // Calculate Age in Hours
                    ageInHours: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60] },
                    // Base Engagement (Likes * 2, Comments * 5)
                    engagementScore: { $add: [{ $multiply: [{ $ifNull: ["$likesCount", 0] }, 2] }, { $multiply: [{ $ifNull: ["$commentsCount", 0] }, 5] }] }
                }
            },

            // Calculate Final Score
            {
                $addFields: {
                    finalScore: {
                        $add: [
                            "$engagementScore",
                            { $cond: ["$isFollowedByMe", 100, 0] }, // The Following Boost
                            { $multiply: [{ $rand: {} }, 20] },     // The Randomness Factor (0-20)
                            { $multiply: ["$ageInHours", -2] }      // Time Decay (older = lower score)
                        ]
                    }
                }
            },

            // Sort by highest score, paginate!
            { $sort: { finalScore: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        // 3. The Real-Time Redis Merge & Like Status (Just like the profile!)
        const pendingLikes = await redis.hgetall("post:likes:queue") || {};
        let myLikedPostIds = new Set();
        
        if (currentUserId) {
            const postIds = posts.map(p => p._id);
            const myLikes = await PostLike.find({ userId: currentUserId, postId: { $in: postIds } }).lean();
            myLikes.forEach(l => myLikedPostIds.add(l.postId.toString()));
        }

        const enrichedPosts = posts.map(post => {
            const stringId = post._id.toString();
            const pending = parseInt(pendingLikes[stringId] || "0", 10);
            return {
                ...post,
                likesCount: Math.max(0, (post.likesCount || 0) + pending),
                isLikedByMe: myLikedPostIds.has(stringId)
            };
        });

        return NextResponse.json({ 
            posts: enrichedPosts,
            nextPage: posts.length === limit ? page + 1 : null
        }, { status: 200 });

    } catch (error) {
        console.error("Explore API Error:", error);
        return NextResponse.json({ error: "Failed to fetch explore feed" }, { status: 500 });
    }
}