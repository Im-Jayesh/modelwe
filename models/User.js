import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true, // <-- Automatically creates a unique index!
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['model', 'agency'],
        required: true,
        index: true // <-- ADDED: Speeds up finding all models or all agencies
    },
    isProfileComplete: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps: true
});

// ADDED: A compound index for sorting a specific role by newest first
// Example query this speeds up: User.find({ role: 'model' }).sort({ createdAt: -1 })
userSchema.index({ role: 1, createdAt: -1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;