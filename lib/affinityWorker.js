// lib/affinityWorker.js
import Profile from "@/models/Profile";
import Post from "@/models/Post";
import mongoose from "mongoose";

export async function updateUserAffinity(userId, postId, weight = 1) {
    try {
        // 1. Get post data to see who made it and what it's about
        const post = await Post.findById(postId).select("userId tags").lean();
        if (!post) return;

        const authorId = post.userId;
        const tags = post.tags || [];

        // 2. Map interest updates (e.g., { "interestTags.gym": 1 })
        const tagUpdates = {};
        tags.forEach(tag => {
            const cleanTag = tag.toLowerCase().trim();
            if (cleanTag) {
                tagUpdates[`interestTags.${cleanTag}`] = weight; 
            }
        });

        // 3. Update the Profile document
        // interactionScore is boosted by 5 on like, decreased by 5 on unlike
        const scoreChange = weight * 5;

        const profile = await Profile.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(userId) },
            { 
                $inc: { ...tagUpdates, "affinityUsers.$[elem].interactionScore": scoreChange },
                $set: { "affinityUsers.$[elem].lastInteracted": new Date() }
            },
            {
                arrayFilters: [{ "elem.userId": authorId }],
                new: true,
                upsert: false 
            }
        );

        // 4. Handle First-Time Interaction
        const exists = profile?.affinityUsers?.some(a => a.userId.toString() === authorId.toString());
        
        if (!exists && weight > 0) {
            await Profile.updateOne(
                { userId: new mongoose.Types.ObjectId(userId) },
                { 
                    $push: { 
                        affinityUsers: { 
                            $each: [{ userId: authorId, interactionScore: 5 }],
                            $slice: -50, 
                            $sort: { interactionScore: -1 }
                        } 
                    } 
                }
            );
        }
    } catch (error) {
        console.error("Affinity Background Task Failed:", error);
    }
}