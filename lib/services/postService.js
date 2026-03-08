import { v2 as cloudinary } from 'cloudinary';
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import PostLike from "@/models/PostLike";
import { redis } from "@/lib/redis"; // Adjust path to your redis setup

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

export async function deletePostAndCleanup(postDocument) {
    // 1. Delete from Cloudinary
    if (postDocument.imageUrl && process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY) {
        cloudinary.config({
            cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY, 
            api_secret: process.env.CLOUDINARY_API_SECRET,       
        });

        const publicId = extractCloudinaryPublicId(postDocument.imageUrl);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId).catch(err => console.error("Cloudinary deletion failed:", err));
        }
    }

    // 2. Delete the actual post from DB
    await Post.findByIdAndDelete(postDocument._id);

    // 3. Database & Redis Cleanup
    await Promise.all([
        Comment.deleteMany({ postId: postDocument._id }),
        PostLike.deleteMany({ postId: postDocument._id }),
        redis.hdel("post:likes:queue", postDocument._id.toString()) 
    ]);

    return true;
}