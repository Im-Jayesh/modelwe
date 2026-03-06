import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/dbConfig/dbConnect";
import Follow from "@/models/Follow";
import Profile from "@/models/Profile";

export async function POST(req) {
    try {
        console.log("1. Follow API hit!");
        await dbConnect();

        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        if (!token) {
            console.log("Auth Error: No token found");
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decoded = jwt.verify(token, process.env.SECRET);
        const myUserId = decoded.userId;
        
        const body = await req.json();
        const targetUserId = body.targetUserId;
        
        console.log(`2. User ${myUserId} is trying to follow ${targetUserId}`);

        if (myUserId === targetUserId) {
             return Response.json({ error: "Cannot follow yourself" }, { status: 400 });
        }

        const existingFollow = await Follow.findOne({ 
            followerId: myUserId, 
            followingId: targetUserId 
        });

        if (existingFollow) {
            console.log("3. Relationship exists. UNFOLLOWING...");
            await Promise.all([
                Follow.findByIdAndDelete(existingFollow._id),
                Profile.findOneAndUpdate({ userId: targetUserId }, { $inc: { followersCount: -1 } }),
                Profile.findOneAndUpdate({ userId: myUserId }, { $inc: { followingCount: -1 } })
            ]);
            console.log("4. Unfollow successful.");
            return Response.json({ isFollowing: false });
        } else {
            console.log("3. No relationship. FOLLOWING...");
            await Promise.all([
                Follow.create({ followerId: myUserId, followingId: targetUserId }),
                Profile.findOneAndUpdate({ userId: targetUserId }, { $inc: { followersCount: 1 } }),
                Profile.findOneAndUpdate({ userId: myUserId }, { $inc: { followingCount: 1 } })
            ]);
            console.log("4. Follow successful.");
            return Response.json({ isFollowing: true });
        }
    } catch (error) {
        console.error("FATAL FOLLOW ERROR:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}