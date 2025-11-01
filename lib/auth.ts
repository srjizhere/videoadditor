import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "./db";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔐 Authentication attempt - Full credentials object:", JSON.stringify(credentials, null, 2));
        console.log("📧 Email:", credentials?.email);
        console.log("🔑 Password length:", credentials?.password?.length);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials - Email:", !!credentials?.email, "Password:", !!credentials?.password);
          throw new Error("Missing email or password");
        }

        try {
          console.log("🔌 Connecting to database...");
          await connectDB();
          console.log("✅ Database connected");
          
          console.log("👤 Looking for user:", credentials.email);
          const user = await User.findOne({ email: credentials.email });

          if (!user) {
            console.log("❌ User not found:", credentials.email);
            throw new Error("No user found with this email");
          }

          console.log("✅ User found:", user.email);
          console.log("🔒 Comparing passwords...");
          
          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            console.log("❌ Invalid password");
            throw new Error("invalid password");
          }

          console.log("✅ Authentication successful for:", user.email);
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.email.split('@')[0], // Use email prefix as name
          };
        } catch (error) {
          console.error("❌ Auth error: ", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log("🔄 JWT callback - User:", user, "Token:", token);
      if (user) {
        token.id = user.id;
        token.name = user.name;
        console.log("✅ JWT token updated with user data");
      }
      return token;
    },
    async session({ session, token }) {
      console.log("🔄 Session callback - Session:", session, "Token:", token);
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        console.log("✅ Session updated with user data");
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
