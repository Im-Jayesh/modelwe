// models/Comment.js

import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
{
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  text: {
    type: String,
    required: true,
    maxLength: 500,
    trim: true
  },

  // SNAPSHOT OF PROFILE (DENORMALIZED)
  username: {
    type: String,
    required: true
  },

  firstName: {
    type: String
  },

  profilePic: {
    type: String
  }

},
{ timestamps: true }
);

// For fast comment loading
commentSchema.index({ postId: 1, createdAt: -1 });

export default mongoose.models.Comment || mongoose.model("Comment", commentSchema);