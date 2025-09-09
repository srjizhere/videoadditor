"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Play, Upload, Sparkles, Users, Zap, Shield } from "lucide-react";
import Header from "./components/Header";
import VideoFeed from "./components/VideoFeed";
import { useEffect, useState, useCallback, memo } from "react";
import { IVideo } from "@/models/Video";

export default function Home() {
  const { data: session } = useSession();
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/video?limit=20");
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return (
    <>
      <Header />
      <div className="flex-1">
        {/* Hero Section - Show different content based on login status */}
        {!session?.user ? (
          <section className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative container mx-auto px-4 py-24 lg:py-32">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Create Amazing Videos
                </h1>
                <p className="text-xl lg:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
                  Professional video editing and sharing platform with AI-powered features. 
                  Transform your ideas into stunning visual stories.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    Get Started Free
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
                  >
                    <Play className="w-5 h-5" />
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl font-bold mb-4">
                  Welcome back, {session.user?.email?.split("@")[0]}! 👋
                </h1>
                <p className="text-xl mb-8">
                  Ready to create your next amazing video?
                </p>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <Upload className="w-5 h-5" />
                  Upload New Video
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Video Feed Section - Show to all users */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">
                {session?.user ? "Your Videos" : "Featured Videos"}
              </h2>
              {session?.user && (
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload New
                </Link>
              )}
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden animate-pulse">
                    <div className="aspect-[9/16] bg-gray-300 dark:bg-gray-700"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <VideoFeed videos={videos} />
            )}
          </div>
        </section>

        {/* Features Section - Only show to non-logged in users */}
        {!session?.user && (
          <>
            <section className="py-20 bg-white dark:bg-slate-800">
              <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold mb-4">Why Choose VideoEditor Pro?</h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    Powerful features designed for creators, professionals, and everyone in between.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 hover:shadow-lg transition-all duration-300">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Easy Upload</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Drag and drop your videos or images. Support for all major formats with automatic optimization.
                    </p>
                  </div>

                  <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:shadow-lg transition-all duration-300">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Smart editing tools powered by AI to enhance your videos automatically.
                    </p>
                  </div>

                  <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 hover:shadow-lg transition-all duration-300">
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Share & Collaborate</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Share your creations with the world or collaborate with your team in real-time.
                    </p>
                  </div>
                </div>
        </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="container mx-auto px-4 text-center">
                <h2 className="text-4xl font-bold mb-4">Ready to Create?</h2>
                <p className="text-xl mb-8 max-w-2xl mx-auto">
                  Join thousands of creators who trust VideoEditor Pro for their video needs.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <Shield className="w-5 h-5" />
                  Start Creating Now
                </Link>
              </div>
            </section>
          </>
        )}
    </div>
    </>
  );
}
