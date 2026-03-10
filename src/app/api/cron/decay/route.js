import { NextResponse } from "next/server";
import { runInterestDecay } from "@/lib/cron/decayInterests";

export async function GET(request) {
    // Basic Security: Check for a Cron Secret Header 
    // so random people can't trigger your decay logic
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.CRON_SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }

    console.log("CRON: decay triggered at", new Date().toISOString());

    try {
        await runInterestDecay();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}