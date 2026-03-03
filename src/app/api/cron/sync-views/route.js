import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import Profile from "@/models/Profile";
import { redis } from "@/lib/redis";

export async function GET(request) {
    // SECURITY: Ensure only your Vercel Cron Job can trigger this!
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        await dbConnect();
        
        // 1. Get all user profiles from MongoDB
        const profiles = await Profile.find({}, 'userId').lean();

        // 2. Loop through them and grab their exact Redis view count
        for (const profile of profiles) {
            const redisViews = await redis.pfcount(`portfolio:views:${profile.userId}`);
            
            // 3. Update MongoDB with the permanent count
            if (redisViews > 0) {
                await Profile.updateOne(
                    { userId: profile.userId },
                    { $set: { "stats.views": redisViews } }
                );
            }
        }

        console.log(`Successfully synced views for ${profiles.length} profiles.`);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Cron Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}