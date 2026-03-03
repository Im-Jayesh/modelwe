import dbConnect from "@/dbConfig/dbConnect";
import { NextResponse } from "next/server";
import User from "@/models/User";
import bcrypt from 'bcryptjs'

export async function POST(request) {
    await dbConnect();

    const body = await request.json();
    const {email} = body

    try {

        const existingUser = await User.findOne({email: email})

        if (existingUser) {
            return NextResponse.json({message: "User Already Exists."}, {status: 400})
        }

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(body.password, salt);

        const newUser = await User.create({
            email: email,
            password: hashedPassword,
            role: body.role
        });

        return NextResponse.json({message: "User Created", userId: newUser._id}, {status: 201});

    } catch (err) {
        return NextResponse.json({message: err}, {status: 500})
    }
}