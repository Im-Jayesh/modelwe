import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import PostLike from "@/models/PostLike"; // <-- 1. WE NEED THIS TO CHECK YOUR LIKES!
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import { v2 as cloudinary } from "cloudinary";

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

        // 🔥 DETECTIVE MODE: What is Redis holding right now?
        const pendingLikes = await redis.hgetall("post:likes:queue") || {};
        console.log("🗄️ REDIS PENDING LIKES QUEUE:", pendingLikes);

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
            // Ensure we safely parse the Redis value, falling back to 0
            const pending = parseInt(pendingLikes[stringId] || "0", 10);
            const finalCount = Math.max(0, (post.likesCount || 0) + pending);

            // 🔥 LOG THE MATH FOR THE FIRST POST
            if (posts.indexOf(post) === 0) {
                console.log(`🧮 MATH FOR POST 1: DB(${post.likesCount || 0}) + Redis(${pending}) = ${finalCount}`);
            }
            
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

// ... (KEEP YOUR POST, PUT, DELETE FUNCTIONS EXACTLY AS THEY ARE BELOW THIS!) ...

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
            const matches = caption.match(/#[\w]+/g);
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

        return NextResponse.json({ message: "Post created", post: newPost }, { status: 201 });
    } catch (error) {
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
            const matches = caption.match(/#[\w]+/g);
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
        // Fallback to getUserId if you have it defined at the top of the file
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        let currentUserId = null;
        try {
            const decoded = jwt.verify(token, process.env.SECRET);
            currentUserId = decoded.userId || decoded.id || decoded._id;
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const postId = searchParams.get("id");

        if (!postId) return NextResponse.json({ error: "Post ID is required" }, { status: 400 });

        const deletedPost = await Post.findOneAndDelete({ _id: postId, userId: currentUserId });
        if (!deletedPost) return NextResponse.json({ error: "Post not found or unauthorized" }, { status: 404 });

        // 🛡️ THE FIX: Mapping your exact environment variables!
        if (deletedPost.imageUrl && process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
            cloudinary.config({
                cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY, // <-- MATCHES YOUR .ENV
                api_secret: process.env.CLOUDINARY_API_SECRET,       // <-- MATCHES YOUR .ENV
            });

            const publicId = extractCloudinaryPublicId(deletedPost.imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId).catch(err => console.error("Cloudinary deletion failed:", err));
            }
        } else if (deletedPost.imageUrl) {
            console.warn("⚠️ Cloudinary keys missing from .env! Post deleted from DB, but image remains on Cloudinary.");
        }

        // Database Cleanup
        await Promise.all([
            Comment.deleteMany({ postId: postId }),
            PostLike.deleteMany({ postId: postId }),
            redis.hdel("post:likes:queue", postId) 
        ]);

        return NextResponse.json({ message: "Post and associated data deleted" }, { status: 200 });
    } catch (error) {
        console.error("Delete Post Error:", error);
        return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }
}
