// lib/jobs/moderatePost.js
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import PostLike from "@/models/PostLike";
import { deletePostAndCleanup } from "../services/postService";

export async function handleModeratePost(payload) {
  const { postId, imageUrl, caption } = payload;
  let isFlagged = false;
  let flagReason = "";

// 1. Check Sightengine for TEXT moderation (No Credit Card Required!)
  if (caption) {
    // We use FormData for Sightengine text requests
    const formData = new FormData();
    formData.append('text', caption);
    formData.append('mode', 'standard');
    formData.append('lang', 'en');
    formData.append('api_user', process.env.SIGHTENGINE_USER);
    formData.append('api_secret', process.env.SIGHTENGINE_SECRET);

    const textRes = await fetch('https://api.sightengine.com/1.0/text/check.json', {
      method: 'POST',
      body: formData
    });
    
    const textData = await textRes.json();

    if (!textRes.ok || textData.status !== "success") {
      console.error("🚨 Sightengine Text Error:", textData);
      throw new Error("Sightengine Text Moderation failed.");
    }

    // Check if it flagged profanity, personal info, or extreme toxicity
    if (textData.profanity?.matches?.length > 0 || textData.moderation_classes?.discriminatory > 0.8) {
      isFlagged = true;
      flagReason = "Inappropriate caption detected by Sightengine.";
    }
  }

  // 2. Check Sightengine for image moderation
  if (imageUrl && !isFlagged) {
    const seUrl = `https://api.sightengine.com/1.0/check.json?url=${encodeURIComponent(imageUrl)}&models=nudity-2.0,offensive,gore&api_user=${process.env.SIGHTENGINE_USER}&api_secret=${process.env.SIGHTENGINE_SECRET}`;
    const seRes = await fetch(seUrl);
    const seData = await seRes.json();
    
    if (seData.status === "success" && (seData.nudity.safe < 0.5 || seData.offensive.prob > 0.8)) {
      isFlagged = true;
    }
  }

  // 3. Take Action
  if (isFlagged) {
    console.log(`🚨 Post ${postId} flagged. Deleting everything...`);
    try {
        // 1. Find the post
        const postToDelete = await Post.findById(postId);
        
        if (postToDelete) {
            // 2. Call the shared service
            await deletePostAndCleanup(postToDelete);
            console.log(`✅ AI successfully scrubbed post ${postId}.`);
        }
    } catch (error) {
        console.error(`❌ Failed to delete flagged post:`, error);
        throw error; // Tell QStash to retry!
    }
}
}