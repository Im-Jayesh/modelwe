import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/dbConfig/dbConnect";
import Profile from "@/models/Profile";
import ProfilePage from "@/components/Profile";
import { redis } from "@/lib/redis";
import {getOptimizedUrl} from "@/lib/optimizeImage"

// 1. DYNAMIC SEO & OPENGRAPH METADATA
export async function generateMetadata({ params }) {
  const { id } = await params;
  await dbConnect();
  const profile = await Profile.findOne({ userId: id }).lean();

  if (!profile) return { title: "Portfolio Not Found" };

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  const heroImage = profile.images?.find(img => img.cover)?.url || profile.images?.[0]?.url;

  return {
    // 1. ADD THIS LINE (use your actual production domain)
    metadataBase: new URL('https://modelwe.vercel.app'), 
    
    title: `${fullName} | ModelWE Profile`,
    description: profile.bio || `View ${fullName}'s official modeling profile.`,
    openGraph: {
      title: `${fullName} | ModelWE`,
      description: profile.bio || `View ${fullName}'s official modeling profile.`,
      url: `/profile/${id}`, // Next.js will now prefix this with metadataBase
      siteName: 'ModelWE',
      images: [
        {
          url: getOptimizedUrl(heroImage, 900), // Cloudinary URL is fine here
          width: 1200,    // Standard OG landscape width
          height: 630,    // Standard OG landscape height
          alt: `${fullName}'s Profile Photo`,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${fullName} | ModelWE`,
      description: profile.bio || `View ${fullName}'s official modeling profile.`,
      images: [heroImage], // Twitter is usually more forgiving with Cloudinary
    },
  };
}

// 2. THE MAIN SERVER COMPONENT
export default async function PublicPortfolioPage({ params }) {
  // NEXT.JS 15+ FIX: Await the params object first!
  const resolvedParams = await params;
  const { id } = resolvedParams;

  let isOwner = false;
  
  // NEXT.JS 15+ FIX: Await the cookies() function!
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.SECRET);
      if (decoded.userId === id) {
        isOwner = true;
      }
    } catch (error) {
      // Invalid or expired token
    }
  }
  // Pass the data down to the Client UI component!
  return <ProfilePage id={id} isOwner={isOwner} />;
}