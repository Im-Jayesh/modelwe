import dbConnect from "@/dbConfig/dbConnect";
import Post from "@/models/Post";
import Profile from "@/models/Profile";
import PostLike from "@/models/PostLike"; // <-- IMPORT YOUR LIKE MODEL
import PostCard from "@/components/PostCard";
import { notFound } from "next/navigation";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";

export default async function SinglePostPage({ params }) {
  // 1. Await params and validate ID
  const { id } = await params; 

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return notFound();
  }

  await dbConnect();

  // 2. Fetch Post & Author
  const post = await Post.findById(id).lean();
  if (!post) return notFound(); 

  const author = await Profile.findOne({ userId: post.userId }).lean();

  // 3. Get Current User ID safely
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

  // --- 4. THE FIX: Check the PostLike collection ---
  let isLikedByMe = false;
  
  if (currentUserId) {
    // I am using the exact same robust query logic you used in your API!
    const existingLike = await PostLike.findOne({
      postId: post._id,
      userId: { $in: [currentUserId, new mongoose.Types.ObjectId(currentUserId)] }
    }).lean();
    
    if (existingLike) {
      isLikedByMe = true;
    }
  }

  // 5. Inject the true like status into the post object
  const serializedPost = {
    ...JSON.parse(JSON.stringify(post)),
    isLikedByMe: isLikedByMe 
  };
  
  const serializedAuthor = author ? JSON.parse(JSON.stringify(author)) : null;

  return (
    // 1. flex, items-center, and justify-center perfectly center it vertically and horizontally
    <main className="min-h-screen bg-[#F2F2EE] flex items-center justify-center pt-24 sm:p-8">
      
      {/* 2. Shrunk max-w-[470px] to max-w-[400px] so it isn't so massive */}
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