// models/Post.js
import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imageUrl: { type: String, required: true },
    caption: { type: String, maxLength: 2200, trim: true },
    
    // THE INVISIBLE ENGINE: Auto-populated by the server based on the caption
    tags: [{ type: String, index: true }], 
    
    // Counters
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
}, { timestamps: true });

postSchema.index({ createdAt: -1, _id: -1 });

export default mongoose.models.Post || mongoose.model('Post', postSchema);