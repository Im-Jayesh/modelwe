import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import Post from "@/models/Post";
import PostLike from "@/models/PostLike";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import { enqueueJob } from "@/lib/queue";
import { deletePostAndCleanup } from "@/lib/services/postService";
import { extractRobustTags } from "@/lib/tagEngine";
import { sendNotification } from "@/lib/notify"; // <-- NEW: Import your notification helper

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

// ==========================================
// GET: Fetch Posts for a specific user
// ==========================================
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const currentUserId = await getUserId(); 

        if (!userId) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

        const posts = await Post.find({ userId })
            .sort({ createdAt: -1 })
            .populate("userId", "username profilePic") 
            .lean();

        const pendingLikes = await redis.hgetall("post:likes:queue") || {};

        let myLikedPostIds = new Set();
        if (currentUserId) {
            const postIds = posts.map(p => p._id);
            const myLikes = await PostLike.find({ 
                userId: currentUserId, 
                postId: { $in: postIds } 
            }).lean();
            myLikes.forEach(like => myLikedPostIds.add(like.postId.toString()));
        }

        const postsWithRealTimeLikes = posts.map(post => {
            const stringId = post._id.toString();
            const pending = parseInt(pendingLikes[stringId] || "0", 10);
            const finalCount = Math.max(0, (post.likesCount || 0) + pending);

            return {
                ...post,
                likesCount: finalCount,
                isLikedByMe: myLikedPostIds.has(stringId) 
            };
        });

        return NextResponse.json({ posts: postsWithRealTimeLikes }, { status: 200 });
    } catch (error) {
        console.error("Fetch Posts Error:", error);
        return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }
}

// ==========================================
// POST: Create a new Post
// ==========================================
export async function POST(request) {
    try {
        await dbConnect();
        const userId = await getUserId();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { imageUrl, caption } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: "Image is required" }, { status: 400 });
        }

        let extractedTags = [];
        if (caption) {
            const matches = extractRobustTags(caption);
            if (matches) {
                extractedTags = matches.map(tag => tag.replace('#', '').toLowerCase());
            }
        }

        const newPost = await Post.create({
            userId,
            imageUrl,
            caption,
            tags: extractedTags
        });

        // 🔥 NEW: EXTRACT MENTIONS AND SEND NOTIFICATIONS
        if (caption) {
            const mentionRegex = /@\[.*?\]\((.*?)\)/g;
            let match;
            const mentionedIds = new Set();

            while ((match = mentionRegex.exec(caption)) !== null) {
                mentionedIds.add(match[1]); // match[1] is the captured ID
            }

            if (mentionedIds.size > 0) {
                const notifyPromises = Array.from(mentionedIds).map((recipientId) => 
                    sendNotification({
                        recipientId,
                        senderId: userId,
                        type: "MENTION",
                        postId: newPost._id.toString()
                    })
                );
                // Fire and forget: run them without blocking the frontend response
                await Promise.allSettled(notifyPromises);
            }
        }

        await enqueueJob("MODERATE_POST", { postId: newPost._id.toString(), imageUrl, caption });

        return NextResponse.json({ message: "Post created", post: newPost }, { status: 201 });
    } catch (error) {
        console.error("Post creation error:", error);
        return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }
}

// ==========================================
// PUT: Edit Caption
// ==========================================
export async function PUT(request) {
    try {
        await dbConnect();
        const userId = await getUserId();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { postId, caption } = await request.json();

        let extractedTags = [];
        if (caption) {
            const matches = extractRobustTags(caption); // Swapped to use your new tagEngine
            if (matches) {
                extractedTags = matches.map(tag => tag.replace('#', '').toLowerCase());
            }
        }

        const updatedPost = await Post.findOneAndUpdate(
            { _id: postId, userId: userId },
            { caption, tags: extractedTags },
            { new: true }
        );

        if (!updatedPost) return NextResponse.json({ error: "Post not found or unauthorized" }, { status: 404 });

        // Note: If you want notifications to trigger when someone edits a post and tags someone new, 
        // you would add the mention extraction logic here too. For now, it just triggers on creation.

        return NextResponse.json({ message: "Post updated", post: updatedPost }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }
}

// ==========================================
// DELETE: Remove a Post & Cleanup Data
// ==========================================
const extractCloudinaryPublicId = (url) => {
    try {
        const uploadIndex = url.indexOf('/upload/');
        if (uploadIndex === -1) return null;
        let path = url.substring(uploadIndex + 8); 
        if (path.match(/^v\d+\//)) path = path.replace(/^v\d+\//, ''); 
        const lastDotIndex = path.lastIndexOf('.');
        return lastDotIndex !== -1 ? path.substring(0, lastDotIndex) : path;
    } catch (e) {
        return null;
    }
};

export async function DELETE(request) {
    try {
        await dbConnect();
        const currentUserId = await getUserId();
        if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const postId = searchParams.get("id");
        if (!postId) return NextResponse.json({ error: "Post ID is required" }, { status: 400 });

        const postToDelete = await Post.findOne({ _id: postId, userId: currentUserId });
        if (!postToDelete) return NextResponse.json({ error: "Post not found or unauthorized" }, { status: 404 });

        await deletePostAndCleanup(postToDelete);

        return NextResponse.json({ message: "Post and associated data deleted" }, { status: 200 });
    } catch (error) {
        console.error("Delete Post Error:", error);
        return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }
}