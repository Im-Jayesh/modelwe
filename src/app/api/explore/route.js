import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import Post from "@/models/Post";
import Follow from "@/models/Follow";
import Profile from "@/models/Profile";
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
        const seed = parseFloat(searchParams.get("seed")) || 0.5;
        const limit = 10;
        const skip = (page - 1) * limit;

        // 1. PRE-FETCH USER CONTEXT
        let followingIds = [];
        let myInterests = {};
        let myLookalikes = [];

        if (currentUserId) {
            const userObjId = new mongoose.Types.ObjectId(currentUserId);
            
            const [userProfile, followDocs] = await Promise.all([
                Profile.findOne({ userId: userObjId }).lean(),
                Follow.find({ followerId: userObjId }).select('followingId').lean()
            ]);
            
            // Map followings as Strings for reliable $in matching
            followingIds = followDocs.map(f => f.followingId.toString());
            followingIds.push(currentUserId.toString()); // Include self for VIP delivery

            myInterests = userProfile?.interestTags || {};
            myLookalikes = (userProfile?.affinityUsers || []).map(a => a.userId.toString());
        }

        // 2. THE ALGORITHM PIPELINE
        const posts = await Post.aggregate([
            // STEP A: Initial Match (Last 30 days to ensure we find content)
            { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },

            // STEP B: Join Profiles
            {
                $lookup: {
                    from: "profiles", 
                    localField: "userId",
                    foreignField: "userId",
                    as: "userDetails"
                }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            
            // STEP C: Prepare Variables
            {
                $addFields: {
                    uIdStr: { $toString: "$userId" },
                    ageInHours: { $divide: [{ $subtract: [new Date(), "$createdAt"] }, 3600000] },
                }
            },

            // STEP D: Calculate Interest & Relationship Scores
            {
                $addFields: {
                    isFollowedByMe: { $in: ["$uIdStr", followingIds] },
                    isLookalike: { $in: ["$uIdStr", myLookalikes] },
                    interestScore: {
                        $reduce: {
                            input: { $ifNull: ["$tags", []] },
                            initialValue: 0,
                            in: { $add: ["$$value", { $ifNull: [{ $getField: { field: "$$this", input: myInterests } }, 0] }] }
                        }
                    }
                }
            },

            // STEP E: Final Rank Calculation (Deterministic Randomness)
            {
                $addFields: {
                    isVip: { $cond: [{ $and: ["$isFollowedByMe", { $lte: ["$ageInHours", 48] }] }, 1, 0] },
                    finalRank: {
                        $add: [
                            { $multiply: [{ $ifNull: ["$likesCount", 0] }, 2] },
                            { $multiply: ["$interestScore", 1.5] },
                            { $subtract: [100, { $multiply: ["$ageInHours", 0.5] }] }, // Freshness
                            { $cond: ["$isLookalike", 40, 0] },
                            // Deterministic Randomness using createdAt timestamp to avoid ObjectId error
                            { $multiply: [{ $abs: { $sin: { $add: [{ $toLong: "$createdAt" }, seed] } } }, 15] }
                        ]
                    }
                }
            },

            // STEP F: Sort & Paginate
            { $sort: { isVip: -1, finalRank: -1, createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        console.log(`>>> FEED: Found ${posts.length} posts for user ${currentUserId}`);

        // 3. REAL-TIME REDIS MERGE & LIKE STATUS
        const pendingLikes = await redis.hgetall("post:likes:queue") || {};
        let myLikedPostIds = new Set();
        
        if (currentUserId) {
            const postIds = posts.map(p => p._id);
            const myLikes = await PostLike.find({ 
                userId: new mongoose.Types.ObjectId(currentUserId), 
                postId: { $in: postIds } 
            }).lean();
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
        console.error("CRITICAL ALGO ERROR:", error);
        return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
    }
}