import dbConnect from "@/dbConfig/dbConnect";
import Notification from "@/models/Notification";
import Profile from "@/models/Profile"; // <-- We import Profile here now!
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET(req) {
  let userId = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (token) {
      const decoded = jwt.verify(token, process.env.SECRET);
      userId = decoded?.userId || decoded?.id || null; 
    }
  } catch (error) {
    // Fails silently for guests
  } 

  if (!userId) {
    return Response.json({ notifications: [], unreadCount: 0 });
  }

  await dbConnect();
  
  // 1. Fetch raw notifications (using .lean() so we can inject our own data into the object)
  const rawNotifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // 2. Loop through and attach the correct Profile data for each sender
  const notifications = await Promise.all(
    rawNotifications.map(async (notif) => {
      // Find the profile belonging to the senderId
      const senderProfile = await Profile.findOne({ userId: notif.sender }).lean();
      
      return {
        ...notif,
        sender: {
          _id: notif.sender, // Keep the original ID for routing
          username: senderProfile?.username || "model",
          profilePic: senderProfile?.profilePic || null,
        }
      };
    })
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return Response.json({ notifications, unreadCount });
}

export async function PATCH(req) {
  // TODO: Retrieve actual user ID from your auth session
  let userId =  null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("token")?.value;
      if (token) {
        const decoded = jwt.verify(token, process.env.SECRET);
        userId = decoded?.userId || decoded?.id || null; 
      }
    } catch (error) {
      // Fails silently for guests
    } 
  
  await dbConnect();
  await Notification.updateMany({ recipient: userId, read: false }, { read: true });
  
  return Response.json({ success: true });
}