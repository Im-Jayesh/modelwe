import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";

// Configure Cloudinary with your secure environment variables
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function POST(request) {
    try {
        // 1. Security Check: Only logged-in users get to upload!
        const token = request.cookies.get("token")?.value || '';
        if (!token) {
            return NextResponse.json({ message: "Unauthorized to upload" }, { status: 401 });
        }
        
        // Verify the token 
        jwt.verify(token, process.env.SECRET);

        // 2. Read the requested folder name from the frontend (e.g., "hero_images" or "gallery")
        const body = await request.json();
        const folder = body.folder || "portfolio_uploads";

        // 3. Generate a timestamp (Cloudinary requires this to prevent replay attacks)
        const timestamp = Math.round(new Date().getTime() / 1000);

        // 4. Generate the cryptographic signature using your HIDDEN secret
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                folder: folder,
            },
            process.env.CLOUDINARY_API_SECRET
        );

        // 5. Send the permission slip back to the React frontend
        return NextResponse.json({ 
            timestamp, 
            signature, 
            folder,
            apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        }, { status: 200 });

    } catch (error) {
        console.error("Cloudinary Signature Error:", error);
        return NextResponse.json({ message: "Failed to generate signature" }, { status: 500 });
    }
}