import mongoose from 'mongoose';

const followSchema = new mongoose.Schema({
    followerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },
    followingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true
    }
}, { timestamps: true });

// COMPOUND INDEX: 
// 1. Prevents a user from following the same person twice.
// 2. Makes looking up "Is User A following User B?" incredibly fast.
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export default mongoose.models.Follow || mongoose.model('Follow', followSchema);