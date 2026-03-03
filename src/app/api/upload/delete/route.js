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
        // 1. Security Check: Only logged-in users can delete photos
        const token = request.cookies.get("token")?.value || '';
        if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        jwt.verify(token, process.env.SECRET);

        const { url } = await request.json();

        // 2. Validate that it's actually a Cloudinary URL
        if (!url || !url.includes("res.cloudinary.com")) {
             return NextResponse.json({ message: "Invalid URL or local blob" }, { status: 400 });
        }

        // 3. Extract the exact "public_id" from the URL
        // Example URL: https://res.cloudinary.com/.../upload/v123456/portfolio_gallery/xyz.jpg
        const splitUrl = url.split('/upload/');
        const pathAfterUpload = splitUrl[1]; 
        
        // Remove the version number (e.g., "v123456/")
        const cleanPath = pathAfterUpload.replace(/v\d+\//, ''); 
        
        // Remove the file extension (e.g., ".jpg")
        const publicId = cleanPath.substring(0, cleanPath.lastIndexOf('.'));

        // 4. Destroy it permanently on Cloudinary
        await cloudinary.uploader.destroy(publicId);

        return NextResponse.json({ message: "Image destroyed completely" }, { status: 200 });

    } catch (error) {
        console.error("Cloudinary Deletion Error:", error);
        return NextResponse.json({ message: "Deletion failed" }, { status: 500 });
    }
}