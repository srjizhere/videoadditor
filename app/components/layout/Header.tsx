"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Home, User, Video, Image as ImageIcon, Menu, X } from "lucide-react";
import { useNotification } from "./Notification";
import { UserAvatar } from "../ui/DaisyUIAvatar";
import { NotificationBadge } from "../ui/DaisyUIBadge";
import DaisyUIThemeController from "../ui/DaisyUIThemeController";

export default function Header() {
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const handleSignOut = async () => {
    try {
      await signOut();
      showNotification("Signed out successfully", "success");
    } catch {
      showNotification("Failed to sign out", "error");
    }
  };

  return (
    <div className="navbar bg-base-100 shadow-lg sticky top-0 z-50">
      <div className="navbar-start">
        {/* Mobile menu button */}
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <Menu className="w-5 h-5" />
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li>
              <Link href="/" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Home
              </Link>
            </li>
            {session?.user && (
              <>
                <li>
                  <Link href="/upload" className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Upload Video
                  </Link>
                </li>
                <li>
                  <Link href="/upload?type=image" className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Upload Image
                  </Link>
                </li>
              </>
            )}
            {!session?.user && (
              <>
                <li>
                  <Link href="/login">Sign In</Link>
                </li>
                <li>
                  <Link href="/register">Get Started</Link>
                </li>
              </>
            )}
          </ul>
        </div>
        
        {/* Logo */}
        <Link
          href="/"
          className="btn btn-ghost text-xl"
          onClick={() => showNotification("Welcome to VideoEditor Pro", "info")}
        >
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-bold">
            MediaEditor Pro
          </span>
        </Link>
      </div>
      
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link href="/" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Home
            </Link>
          </li>
          {session?.user && (
            <>
              <li>
                <Link
                  href="/upload"
                  className="flex items-center gap-2"
                  onClick={() => showNotification("Welcome to Upload Center", "info")}
                >
                  <Video className="w-4 h-4" />
                  Upload Video
                </Link>
              </li>
              <li>
                <Link
                  href="/upload?type=image"
                  className="flex items-center gap-2"
                  onClick={() => showNotification("Welcome to Image Upload", "info")}
                >
                  <ImageIcon className="w-4 h-4" />
                  Upload Image
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
      
      <div className="navbar-end">
        {/* Theme Controller */}
        <DaisyUIThemeController className="mr-2" />
        
        {session?.user ? (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <UserAvatar 
                user={{
                  name: session.user?.name ?? undefined,
                  email: session.user?.email ?? undefined,
                  image: session.user?.image ?? undefined,
                  status: 'online'
                }}
                size="sm"
                showStatus={true}
              />
              <NotificationBadge count={3} />
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
              <li>
                <div className="flex items-center gap-3 p-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {session.user?.email?.split("@")[0]}
                    </p>
                    <p className="text-xs opacity-70">
                      {session.user?.email}
                    </p>
                  </div>
                </div>
              </li>
              <div className="divider my-1"></div>
              <li>
                <Link
                  href="/upload"
                  className="flex items-center gap-3"
                  onClick={() => {
                    showNotification("Welcome to Upload Center", "info");
                  }}
                >
                  <Video className="w-4 h-4" />
                  Upload Video
                </Link>
              </li>
              <li>
                <Link
                  href="/upload?type=image"
                  className="flex items-center gap-3"
                  onClick={() => {
                    showNotification("Welcome to Image Upload", "info");
                  }}
                >
                  <ImageIcon className="w-4 h-4" />
                  Upload Image
                </Link>
              </li>
              <div className="divider my-1"></div>
              <li>
                <button
                  onClick={handleSignOut}
                  className="text-error hover:bg-error hover:text-error-content"
                >
                  <User className="w-4 h-4" />
                  Sign Out
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="btn btn-ghost"
              onClick={() => showNotification("Please sign in to continue", "info")}
            >
              Sign In
            </Link>
            <Link href="/register" className="btn btn-primary">
              <User className="w-4 h-4" />
              Get Started
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
