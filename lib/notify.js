import dbConnect from "@/dbConfig/dbConnect";
import Notification from "@/models/Notification";

export async function sendNotification({ recipientId, senderId, type, postId = null }) {
  if (String(recipientId) === String(senderId)) return; // Prevent self-notifications
  await dbConnect();
  
  await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    post: postId,
  });
}