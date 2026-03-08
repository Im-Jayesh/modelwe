import { NextResponse } from "next/server";
import { runInterestDecay } from "@/lib/cron/decayInterests";

export async function GET(request) {
    // Basic Security: Check for a Cron Secret Header 
    // so random people can't trigger your decay logic
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        await runInterestDecay();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}