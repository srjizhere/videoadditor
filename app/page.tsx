"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Play, Upload, Sparkles, Users, Zap, Shield, Video, Image as ImageIcon, Eye } from "lucide-react";
import { Header } from "./components/layout";
import VideoFeed from "./components/features/VideoFeed";
import ImageFeed from "./components/features/ImageFeed";
import { useEffect, useState, useCallback } from "react";
import { IVideo } from "@/models/Video";
import { IImage } from "@/models/Image";
import { MediaType } from "@/types/media";
import { DaisyUISkeleton, LoadingState } from "./components/ui/DaisyUIProgress";
import { EnhancedStats } from "./components/ui/DaisyUIDataDisplay";

// Custom hook to handle hydration
function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    setHydrated(true);
  }, []);
  
  return hydrated;
}

export default function Home() {
  const { data: session } = useSession();
  const [videos, setVideos] = useState<IVideo[]>([]);
  const [images, setImages] = useState<IImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MediaType>(MediaType.IMAGE);
  const hydrated = useHydrated();

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

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/image?limit=20");
      if (response.ok) {
        const data = await response.json();
        setImages(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMedia = useCallback(async (mediaType: MediaType) => {
    // Only fetch if we don't already have data for this media type
    if (mediaType === MediaType.VIDEO && videos.length === 0) {
      await fetchVideos();
    } else if (mediaType === MediaType.IMAGE && images.length === 0) {
      await fetchImages();
    } else {
      // Data already exists, just set loading to false
      setLoading(false);
    }
  }, [fetchVideos, fetchImages, videos.length, images.length]);

  useEffect(() => {
    if (hydrated) {
    fetchMedia(activeTab);
    }
  }, [fetchMedia, activeTab, hydrated]);

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
                    className="btn btn-primary btn-lg gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Get Started Free
                  </Link>
                  <Link
                    href="/login"
                    className="btn btn-outline btn-lg gap-2"
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
                  className="btn btn-primary btn-lg gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Upload New Video
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Media Feed Section - Show to all users */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">
                {session?.user ? "Your Media" : "Featured Media"}
              </h2>
              {session?.user && (
                <Link
                  href="/upload"
                  className="btn btn-primary gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload New
                </Link>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-8 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab(MediaType.IMAGE)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  hydrated && activeTab === MediaType.IMAGE
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Images
                {hydrated && images.length > 0 && (
                  <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                    {images.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab(MediaType.VIDEO)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  hydrated && activeTab === MediaType.VIDEO
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Video className="w-4 h-4" />
                Videos
                {hydrated && videos.length > 0 && (
                  <span className="bg-white/20 text-xs px-2 py-1 rounded-full">
                    {videos.length}
                  </span>
                )}
              </button>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="card bg-base-100 shadow-lg overflow-hidden">
                    <DaisyUISkeleton 
                      height={activeTab === MediaType.VIDEO ? 300 : 200}
                      className="w-full"
                    />
                    <div className="card-body">
                      <DaisyUISkeleton height={20} className="mb-2" />
                      <DaisyUISkeleton height={16} width="75%" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {hydrated && activeTab === MediaType.VIDEO ? (
                  <VideoFeed videos={videos} />
                ) : hydrated && activeTab === MediaType.IMAGE ? (
                  <ImageFeed images={images} limit={20} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="card bg-base-100 shadow-lg overflow-hidden animate-pulse">
                        <div className="aspect-square bg-base-300"></div>
                        <div className="card-body">
                          <div className="h-4 bg-base-300 rounded mb-2"></div>
                          <div className="h-3 bg-base-300 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Stats Section - Show to all users */}
        <section className="py-16 bg-base-200">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-base-content mb-4">
                Platform Statistics
              </h2>
              <p className="text-lg text-base-content/70">
                Join thousands of creators who trust MediaEditor Pro
              </p>
            </div>
            <EnhancedStats 
              stats={[
                {
                  label: 'Total Videos',
                  value: videos.length.toLocaleString(),
                  change: 12.5,
                  changeType: 'increase',
                  icon: <Video className="w-6 h-6" />,
                  color: 'primary',
                  description: 'Videos uploaded this month'
                },
                {
                  label: 'Total Images',
                  value: images.length.toLocaleString(),
                  change: 8.2,
                  changeType: 'increase',
                  icon: <ImageIcon className="w-6 h-6" />,
                  color: 'secondary',
                  description: 'Images processed'
                },
                {
                  label: 'Active Users',
                  value: '2.5K',
                  change: 15.3,
                  changeType: 'increase',
                  icon: <Users className="w-6 h-6" />,
                  color: 'accent',
                  description: 'Monthly active users'
                },
                {
                  label: 'Total Views',
                  value: '1.2M',
                  change: 22.1,
                  changeType: 'increase',
                  icon: <Eye className="w-6 h-6" />,
                  color: 'success',
                  description: 'Content views this month'
                }
              ]}
              layout="horizontal"
            />
          </div>
        </section>

        {/* Features Section - Only show to non-logged in users */}
        {!session?.user && (
          <>
            <section className="py-20 bg-white dark:bg-slate-800">
              <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold mb-4">Why Choose MediaEditor Pro?</h2>
                  <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    Powerful features designed for creators, professionals, and everyone in between.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <div className="card-body text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="card-title justify-center mb-2">Easy Upload</h3>
                      <p className="text-base-content/70">
                        Drag and drop your videos or images. Support for all major formats with automatic optimization.
                      </p>
                    </div>
                  </div>

                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <div className="card-body text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="card-title justify-center mb-2">AI-Powered</h3>
                      <p className="text-base-content/70">
                        Smart editing tools powered by AI to enhance your videos and images automatically.
                      </p>
                    </div>
                  </div>

                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <div className="card-body text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="card-title justify-center mb-2">Share & Collaborate</h3>
                      <p className="text-base-content/70">
                        Share your creations with the world or collaborate with your team in real-time.
                      </p>
                    </div>
                  </div>
                </div>
        </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="container mx-auto px-4 text-center">
                <h2 className="text-4xl font-bold mb-4">Ready to Create?</h2>
                <p className="text-xl mb-8 max-w-2xl mx-auto">
                  Join thousands of creators who trust MediaEditor Pro for their media needs.
                </p>
                <Link
                  href="/register"
                  className="btn btn-primary btn-lg gap-2"
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
