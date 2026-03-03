import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/dbConfig/dbConnect";
import Profile from "@/models/Profile";
import ProfilePage from "@/components/Profile";
import { redis } from "@/lib/redis";

// 1. DYNAMIC SEO & OPENGRAPH METADATA
export async function generateMetadata({ params }) {
  // NEXT.JS 15+ FIX: Await the params object first!
  const resolvedParams = await params;
  const { id } = resolvedParams;

  await dbConnect();
  const profile = await Profile.findOne({ userId: id }).lean();

  if (!profile) return { title: "Portfolio Not Found" };

  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  const heroImage = profile.images?.find(img => img.cover)?.url || profile.images?.[0]?.url;

  return {
    title: `${fullName} | ModelWE Profile`,
    description: profile.bio || `View ${fullName}'s official modeling profile.`,
    openGraph: {
      title: `${fullName} | ModelWE`,
      description: profile.bio || `View ${fullName}'s official modeling profile.`,
      url: `https://yourdomain.com/profile/${id}`,
      siteName: 'ModelWE',
      images: [
        {
          url: heroImage || 'https://yourdomain.com/default-og.jpg',
          width: 800,
          height: 1200,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${fullName} | ModelWE`,
      description: profile.bio || `View ${fullName}'s official modeling profile.`,
      images: [heroImage || 'https://yourdomain.com/default-og.jpg'],
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