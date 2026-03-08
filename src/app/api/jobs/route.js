import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";

// Import all your specific job handlers here
import { handleModeratePost } from "@/lib/jobs/moderatePost";
// import { handleWelcomeEmail } from "@/lib/jobs/welcomeEmail"; 

async function handler(req) {
  try {
    const body = await req.json();
    const { jobName, payload } = body;

    console.log(`[QUEUE] Starting background job: ${jobName}`);

    // The Switchboard: Route the job to the correct function
    switch (jobName) {
      case "MODERATE_POST":
        await handleModeratePost(payload);
        break;
        
      case "SEND_WELCOME_EMAIL":
        // await handleWelcomeEmail(payload);
        break;

      default:
        console.warn(`[QUEUE] Unknown job type received: ${jobName}`);
        return NextResponse.json({ error: "Unknown job" }, { status: 400 });
    }

    // Tell QStash it was a success!
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[QUEUE] Job failed:", error);
    // Returning a 500 tells QStash to retry this job automatically
    return NextResponse.json({ error: "Job Failed" }, { status: 500 });
  }
}

// Secure the route so ONLY Upstash can trigger it
export const POST = verifySignatureAppRouter(handler);