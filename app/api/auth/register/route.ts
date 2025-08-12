import User from "@/app/models/User";
import { connectToDateBase } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";



export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and Password are required!" },
                { status: 400 }
            )
        }
        await connectToDateBase();
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                {
                    error: "User already registerd!"
                },
                { status: 400 }
            )
        }
        await User.create({
            email, password
        })

        return NextResponse.json(
            {
                message: "User registered successfully!"
            },
            { status: 201 }
        )

    } catch (error) {
        console.error("register error", error)
        return NextResponse.json(
            {
                errro: "Failed to register user"
            },
            { status: 201 }
        )
    }
}