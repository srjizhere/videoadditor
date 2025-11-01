'use client';
import { ImageKitProvider } from "@imagekit/next";
import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "./Notification";
import { ThemeProvider } from "./ThemeProvider";

const urlEndPoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/default';

// Ensure urlEndPoint is never undefined
if (!urlEndPoint) {
  console.warn('NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is not set. Using default endpoint.');
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60}>
      <ImageKitProvider urlEndpoint={urlEndPoint}>
        <ThemeProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ThemeProvider>
      </ImageKitProvider>
    </SessionProvider>
  );
}
