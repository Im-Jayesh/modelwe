import { NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import bcript from 'bcryptjs'
import dbConnect from "@/dbConfig/dbConnect";
import User from "@/models/User";

export async function POST(request) {
    await dbConnect();
    
    const body = await request.json()

    try {
        const user = await User.findOne({email: body.email})

        if(!user) {
            return NextResponse.json({message: "User does not exist!"}, {status: 404})
        }

        const verified = await bcript.compare(body.password, user.password)

        if(!verified) {
            return NextResponse.json({message: "Auth Failed"}, {status: 500})
        }

        const token = sign({
            userId: user._id,
            isProfileComplete: user.isProfileComplete
        }, process.env.SECRET, { expiresIn: '7d' })

        const response = NextResponse.json({message: "Login successful", token: token, isProfileComplete: user.isProfileComplete}, {status: 200});

            response.cookies.set("token", token, {
                httpOnly: true,  
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict", 
                path: "/", 
                maxAge: 60 * 60 * 24 * 7, 
            });

            response.cookies.set("isProfileComplete", user.isProfileComplete, {
                httpOnly: true,  
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict", 
                path: "/", 
                maxAge: 60 * 60 * 24 * 7, 
            });

            return response;

    } catch (err) {
        return NextResponse.json({message: err}, {status: 500})
    }
}