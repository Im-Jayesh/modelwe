import { NextResponse } from "next/server";
import dbConnect from "@/dbConfig/dbConnect";
import PortfolioSettings from "@/models/PortfolioSettings";
import jwt from "jsonwebtoken";

// --- HELPER: Get User ID from Secure Cookie ---
const getDataFromToken = (request) => {
    try {
        const token = request.cookies.get("token")?.value || '';
        if (!token) return null;
        const decodedToken = jwt.verify(token, process.env.SECRET);
        return decodedToken.userId || decodedToken.id; 
    } catch (error) {
        return null; 
    }
};

// ==========================================
// GET: Fetch the user's UI preferences
// ==========================================
export async function GET(request) {
    try {
        await dbConnect();
        
        // 1. Look for an ID in the URL first (for the public /portfolio/[id] page)
        const url = new URL(request.url);
        const queryId = url.searchParams.get("id");
        
        // 2. If no URL ID, grab it from the secure token (for the /portfolio/edit page)
        const targetUserId = queryId || getDataFromToken(request);

        if (!targetUserId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // 3. Search the database
        const settings = await PortfolioSettings.findOne({ userId: targetUserId });

        // 4. THE FIX: The Empty State Safety Net
        // If MongoDB returns null (because they haven't saved a color yet),
        // we safely return the defaults without crashing the server!
        if (!settings) {
            return NextResponse.json({ 
                message: "Using default settings", 
                settings: { theme: 'first', backgroundColor: '#483e3b' } 
            }, { status: 200 });
        }

        // 5. If they DO have custom settings, return them!
        return NextResponse.json({ message: "Settings retrieved", settings }, { status: 200 });

    } catch (error) {
        // This will print the exact reason for any future 500 errors in your terminal!
        console.error("Settings GET Error:", error); 
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// ==========================================
// POST: Create or Update UI preferences
// ==========================================
export async function POST(request) {
    try {
        await dbConnect();
        
        // POST routes only ever use the logged-in token (Nobody else can edit!)
        const userId = getDataFromToken(request);
        if (!userId) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const reqBody = await request.json();

        // 6. The Upsert: Updates existing settings OR creates a brand new document!
        const updatedSettings = await PortfolioSettings.findOneAndUpdate(
            { userId: userId },
            { 
                ...reqBody,
                userId: userId // Hardcode this so hackers can't change the ID
            },
            { 
                new: true, 
                upsert: true, // This creates the document if it doesn't exist yet
                runValidators: true 
            }
        );

        return NextResponse.json({ 
            message: "Settings saved successfully", 
            settings: updatedSettings 
        }, { status: 200 });

    } catch (error) {
        console.error("Settings POST Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}