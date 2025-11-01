import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("📝 Registration API called");
    const { email, password } = await request.json();
    console.log("📧 Email:", email);

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("🔌 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected");

    console.log("👤 Checking for existing user...");
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("❌ User already exists:", email);
      return NextResponse.json(
        { error: "User already registered" },
        { status: 400 }
      );
    }

    console.log("✅ No existing user found, creating new user...");
    const newUser = await User.create({
      email,
      password,
    });
    console.log("✅ User created successfully:", newUser.email);

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Registration error", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}
