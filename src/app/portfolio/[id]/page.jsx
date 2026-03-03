import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/dbConfig/dbConnect";
import Profile from "@/models/Profile";
import PortfolioClientView from "@/components/PortfolioClientView";
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
    title: `${fullName} | ModelWE Portfolio`,
    description: profile.bio || `View ${fullName}'s official modeling portfolio and comp card.`,
    openGraph: {
      title: `${fullName} | ModelWE`,
      description: profile.bio || `View ${fullName}'s official modeling portfolio.`,
      url: `https://yourdomain.com/portfolio/${id}`,
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
      description: profile.bio || `View ${fullName}'s official modeling portfolio.`,
      images: [heroImage || 'https://yourdomain.com/default-og.jpg'],
    },
  };
}

// 2. THE MAIN SERVER COMPONENT
export default async function PublicPortfolioPage({ params }) {
  // NEXT.JS 15+ FIX: Await the params object first!
  const resolvedParams = await params;
  const { id } = resolvedParams;

  try {
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for") || "127.0.0.1";
    const redisKey = `portfolio:views:${id}`;

    console.log("Attempting Redis Log for:", redisKey, "from IP:", ip);

    // Change this to 'await' JUST for testing so we can see the error
    const result = await redis.pfadd(redisKey, ip);
    
    console.log("Redis Result:", result); // Should print 1 or 0
  } catch (error) {
    console.error("REDIS CONNECTION CRASHED:", error.message);
  }

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
  console.log("Is Owner?", isOwner);
  // Pass the data down to the Client UI component!
  return <PortfolioClientView id={id} isOwner={isOwner} />;
}