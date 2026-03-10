import dbConnect from "@/dbConfig/dbConnect";
import Post from "@/models/Post";
import Profile from "@/models/Profile";
import PostLike from "@/models/PostLike";
import PostCard from "@/components/PostCard";
import { notFound } from "next/navigation";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { redis } from "@/lib/redis"; // <-- IMPORT REDIS

export default async function SinglePostPage({ params }) {
  const { id } = await params; 

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return notFound();
  }

  await dbConnect();

  const post = await Post.findById(id).lean();
  if (!post) return notFound(); 

  const author = await Profile.findOne({ userId: post.userId }).lean();

  let currentUserId = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token) {
      const decoded = jwt.verify(token, process.env.SECRET);
      currentUserId = decoded?.userId || decoded?.id || null; 
    }
  } catch (error) {
    // Fails silently for guests
  }

  let isLikedByMe = false;
  
  if (currentUserId) {
    const existingLike = await PostLike.findOne({
      postId: post._id,
      userId: { $in: [currentUserId, new mongoose.Types.ObjectId(currentUserId)] }
    }).lean();
    
    if (existingLike) {
      isLikedByMe = true;
    }
  }

  // --- NEW: FETCH REDIS QUEUE TO GET REAL-TIME LIKES ---
  const stringId = post._id.toString();
  const pendingLikesStr = await redis.hget("post:likes:queue", stringId);
  const pendingLikes = parseInt(pendingLikesStr || "0", 10);
  
  // Calculate the final count just like your API does
  const finalLikesCount = Math.max(0, (post.likesCount || 0) + pendingLikes);
  // -----------------------------------------------------

  const serializedPost = {
    ...JSON.parse(JSON.stringify(post)),
    isLikedByMe: isLikedByMe,
    likesCount: finalLikesCount // <-- Inject the accurate count here!
  };
  
  const serializedAuthor = author ? JSON.parse(JSON.stringify(author)) : null;

  return (
    <main className="min-h-screen bg-[#F2F2EE] flex items-center justify-center pt-24 sm:p-8">
      <div className="max-w-[400px] w-full text-black">
        <PostCard 
          post={serializedPost} 
          author={serializedAuthor} 
          currentUserId={currentUserId} 
        />
      </div>
    </main>
  );
}