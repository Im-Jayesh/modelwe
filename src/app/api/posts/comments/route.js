import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import Comment from "@/models/Comment";
import Post from "@/models/Post";
import Profile from "@/models/Profile";
import { updateUserAffinity } from "@/lib/affinityWorker";
import { sendNotification } from "@/lib/notify"; // <-- ADDED: Notification helper

export const dynamic = "force-dynamic";

const getUserId = async () => {
  const jwt = await import("jsonwebtoken");
  const { cookies } = await import("next/headers");

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const decoded = jwt.default.verify(token, process.env.SECRET);
    return decoded.userId || decoded.id || decoded._id;
  } catch {
    return null;
  }
};

/* -----------------------
   GET COMMENTS (Untouched)
----------------------- */
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = 10;

    if (!postId) return NextResponse.json({ error: "Post ID required" }, { status: 400 });

    const skip = (page - 1) * limit;
    const comments = await Comment.find({ postId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ comments, nextPage: comments.length === limit ? page + 1 : null });
  } catch (error) {
    console.error("Fetch Comments Error:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

/* -----------------------
   POST COMMENT (Updated with Notifications)
----------------------- */
export async function POST(request) {
  try {
    await dbConnect();
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { postId, text } = await request.json();
    if (!text || text.trim() === "") return NextResponse.json({ error: "Comment text required" }, { status: 400 });

    const profile = await Profile.findOne({ userId }).lean();

    const newComment = await Comment.create({
      postId,
      userId,
      text,
      username: profile?.username || profile?.firstName || "Model",
      firstName: profile?.firstName || "Model",
      profilePic: profile?.profilePic || null
    });

    updateUserAffinity(userId, postId, 3).catch(e => console.error(e));

    const targetPost = await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    // --- NEW: FIRE NOTIFICATIONS (Comment + Mentions) ---
    if (targetPost) {
        // 1. Notify the post owner about the new comment
        sendNotification({
            recipientId: targetPost.userId,
            senderId: userId,
            type: "COMMENT",
            postId: postId
        }).catch(err => console.error(err));

        // 2. Extract and notify anyone mentioned inside the comment text!
        const mentionRegex = /@\[.*?\]\((.*?)\)/g;
        let match;
        const mentionedIds = new Set();
        while ((match = mentionRegex.exec(text)) !== null) {
            mentionedIds.add(match[1]); 
        }

        if (mentionedIds.size > 0) {
            const notifyPromises = Array.from(mentionedIds).map((recipientId) => 
                sendNotification({
                    recipientId: recipientId,
                    senderId: userId,
                    type: "MENTION", // Still a mention, even though it's in a comment
                    postId: postId
                })
            );
            await Promise.allSettled(notifyPromises);
        }
    }
    // ----------------------------------------------------

    return NextResponse.json({ message: "Comment added", comment: newComment }, { status: 201 });

  } catch (error) {
    console.error("Create Comment Error:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

/* -----------------------
   DELETE COMMENT (Untouched)
----------------------- */
export async function DELETE(request) {
  try {
    await dbConnect();
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    const comment = await Comment.findById(commentId);
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    if (comment.userId.toString() !== userId.toString()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await Comment.findByIdAndDelete(commentId);

    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });

    return NextResponse.json({ message: "Comment deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}