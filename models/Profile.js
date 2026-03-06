import mongoose from 'mongoose';

// 1. Define the Image Subdocument
// We use a subdocument so Mongoose can validate the data inside the array
const imageSchema = new mongoose.Schema({
    url: { type: String, required: true },
    order: { type: Number, default: 1 },
    cover: { type: Boolean, default: false }
}, { _id: true }); // Keeps a unique ID for each image so you can easily delete/update specific photos

// 2. Define the Main Profile Schema
const profileSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    
    // INDEXED: Agencies will definitely filter by category
    category: { type: String, required: true, index: true }, 
    
    location: {
        // INDEXED: Searching for models in specific cities is a core feature
        city: { type: String, required: true, trim: true, index: true },
        country: { type: String, required: true, trim: true }
    },
    
    experienceLevel: { type: String, default: 'Beginner' },
    bio: { type: String, trim: true, maxLength: 500 },
    
    stats: {
        height: { type: Number, min: 50, max: 250 },
        chest: { type: Number, min: 30, max: 200 },
        waist: { type: Number, min: 30, max: 200 },
        hips: { type: Number, min: 30, max: 200 },
        shoe: { type: Number },
        ageRange: { type: String },
        views: { type: Number, default: 0 }
    },
    
    images: [imageSchema], // Embedding the images!
    
    instagram: { type: String, trim: true },
    
    // INDEXED: Super important for filtering out inactive models
    openToWorkNow: { type: Boolean, default: true, index: true },

    heading1: { type: String, trim: true, maxLength: 100, default: "THE BUTTERLY EFFECT" },
    heading2: { type: String, trim: true, maxLength: 100, default: "GLOBAL STYLE ICONS" },

    // A reference back to the User account (from the Signup page)
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
        unique: true // A user can only have one profile
    },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 }, // Denormalized following count for quick access
    // Add this inside your existing ProfileSchema definition
username: {
    type: String,
    unique: true,
    sparse: true, // Allows nulls if they haven't set it yet
    trim: true,
    lowercase: true,
},
profilePic: {
    type: String,
    default: "",
},
agency: {
    type: String,
    default: "Freelance",
},
isVerified: {
    type: Boolean,
    default: false,
},
}, { timestamps: true });

// 3. COMPOUND INDEX (The secret to handling millions of operations)
// If an agency searches: "Show me Fitness models in Mumbai who are Open to Work"
// This compound index handles that exact query at lightning speed.
profileSchema.index({ category: 1, 'location.city': 1, openToWorkNow: 1 });

const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema);

export default Profile;