import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {

    interface Session {
        user: {
            id: string
            name: string
        } & DefaultSession["user"];
    }
}