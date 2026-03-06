import mongoose from 'mongoose';

const postLikeSchema = new mongoose.Schema({
    postId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post', 
        required: true, 
        index: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
}, { timestamps: true });

// COMPOUND INDEX: This physically prevents a user from double-liking a post at the database level!
postLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export default mongoose.models.PostLike || mongoose.model('PostLike', postLikeSchema);