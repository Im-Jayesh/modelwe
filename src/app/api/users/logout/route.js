import { NextResponse } from "next/server";

export async function GET(request) {

    try {

        const response = NextResponse.json({message: "Logout successful"}, {status: 200});

        response.cookies.set("token", "", { 
            httpOnly: true, 
            expires: new Date(0),
            path: '/' 
        });
        
        response.cookies.set("isProfileComplete", "", { 
            httpOnly: true, 
            expires: new Date(0),
            path: '/' 
        });

        return response;
    } catch (err) {
        return NextResponse.json({message: err}, {status: 500})
    }

}