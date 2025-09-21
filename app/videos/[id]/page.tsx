"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Video } from "@imagekit/next";
import Header from "../../components/Header";
import { IVideo } from "@/models/Video";
import {
  ArrowLeft,
  Home,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Heart,
  Share2,
  MoreVertical,
  Eye,
  Clock,
  User,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useNotification } from "../../components/Notification";
import Link from "next/link";

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showNotification } = useNotification();

  const [currentVideo, setCurrentVideo] = useState<IVideo | null>(null);
  const [allVideos, setAllVideos] = useState<IVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [views, setViews] = useState(0);
  const [showControls, setShowControls] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized video fetching with caching
  const fetchVideo = useCallback(
    async (videoId: string) => {
      try {
        setLoading(true);
        setVideoLoading(true);

        const response = await fetch(`/api/videos/${videoId}`);
        if (!response.ok) {
          if (response.status === 404) {
            showNotification("Video not found", "error");
            router.push("/");
            return;
          }
          throw new Error("Failed to fetch video");
        }

        const data = await response.json();
        setCurrentVideo(data.video);
        setLikes(data.video.likes || 0);
        setViews(data.video.views || 0);
        setIsLiked(
          data.video.likedBy?.some(
            (id: unknown) => (id as string).toString() === data.video.uploader?.toString()
          ) || false
        );
      } catch (error) {
        console.error("Error fetching video:", error);
        showNotification("Failed to load video", "error");
        router.push("/");
      } finally {
        setLoading(false);
      }
    },
    [router, showNotification]
  );

  // Fetch all videos for sidebar (cached)
  const fetchAllVideos = useCallback(async () => {
    try {
      const response = await fetch("/api/video?limit=12");
      if (response.ok) {
        const data = await response.json();
        setAllVideos(data.videos || []);
      }
    } catch (error) {
      console.error("Error fetching all videos:", error);
    }
  }, []);

  useEffect(() => {
    if (params.id) {
      fetchVideo(params.id as string);
      fetchAllVideos();
    }
  }, [params.id, fetchVideo, fetchAllVideos]);

  // Video controls
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Optimized like handling with API call
  const handleLike = useCallback(async () => {
    if (!currentVideo) return;

    const previousLiked = isLiked;
    const previousLikes = likes;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikes((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      const response = await fetch(`/api/video/${currentVideo._id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked);
        setLikes(data.likes);
      } else {
        // Revert on failure
        setIsLiked(previousLiked);
        setLikes(previousLikes);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousLiked);
      setLikes(previousLikes);
      console.error("Error liking video:", error);
    }
  }, [currentVideo, isLiked, likes]);

  const handleShare = useCallback(async () => {
    if (!currentVideo) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: currentVideo.title,
          text: currentVideo.description,
          url: window.location.href,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotification("Link copied to clipboard", "success");
    }
  }, [currentVideo, showNotification]);

  // Smooth navigation
  const navigateToVideo = useCallback(
    (videoId: string) => {
      router.push(`/videos/${videoId}`);
    },
    [router]
  );

  // Mouse controls
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Get other videos (excluding current)
  const otherVideos = allVideos.filter((video) => video._id !== params.id);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
            <p className="text-lg">Loading video...</p>
          </div>
        </div>
      </>
    );
  }

  if (!currentVideo) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <p className="text-lg mb-4">Video not found</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="h-screen bg-black text-white overflow-hidden">
        {/* Subtract navbar height only once */}
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
          {/* Main Video Area - Reels Style */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {/* Video Player - Vertical Reels Style */}
            <div
              className="relative bg-black group max-w-sm lg:max-w-md"
              style={{
                width: "min(100vw, 384px)", // max-w-sm equivalent
                height:
                  "min(calc(100vh - 64px), calc(min(100vw, 384px) * 16 / 9))", // 9:16 aspect ratio minus header
                maxWidth: "448px", // lg:max-w-md equivalent
                maxHeight: "calc(100vh - 64px)",
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setShowControls(false)}
              onTouchStart={handleMouseMove}
              onTouchEnd={() => setShowControls(false)}
            >
              <div className="relative w-full h-full">
                <Video
                  ref={videoRef}
                  src={currentVideo.videoUrl}
                  transformation={[
                    {
                      height: "1920",
                      width: "1080",
                    },
                  ]}
                  controls={false}
                  muted={isMuted}
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onLoadedData={() => setVideoLoading(false)}
                />

                {/* Video Loading */}
                {videoLoading && (
                  <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                  </div>
                )}

                {/* Video Overlay Controls */}
                <div
                  className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${
                    showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={togglePlayPause}
                      className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-200 transform hover:scale-110"
                    >
                      {isPlaying ? (
                        <Pause className="w-8 h-8 text-white" />
                      ) : (
                        <Play
                          className="w-8 h-8 text-white ml-1"
                          fill="currentColor"
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Top Controls - Navigation + Video Controls */}
                <div
                  className={`absolute top-4 left-4 right-4 flex justify-between items-center transition-opacity duration-300 ${
                    showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {/* Navigation Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.back()}
                      className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <Link
                      href="/"
                      className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                    >
                      <Home className="w-5 h-5 text-white" />
                    </Link>
                  </div>

                  {/* Video Controls */}
                  <div className="flex gap-2">
                    <button
                      onClick={toggleMute}
                      className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <button className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors">
                      <Maximize className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Reels Style Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  {/* Video Title and Description */}
                  <div className="mb-4">
                    <h1 className="text-white text-lg font-semibold mb-2 line-clamp-2">
                      {currentVideo.title}
                    </h1>
                    <p className="text-gray-200 text-sm line-clamp-2">
                      {currentVideo.description}
                    </p>
                  </div>

                  {/* Creator Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {currentVideo.uploaderName ||
                          currentVideo.uploaderEmail?.split("@")[0] ||
                          "Unknown User"}
                      </p>
                      <p className="text-gray-300 text-xs">
                        {currentVideo.uploaderEmail}
                      </p>
                    </div>
                  </div>

                  {/* Video Stats */}
                  <div className="flex items-center gap-4 text-white text-sm">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>2:34</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>
                        {currentVideo.createdAt
                          ? new Date(
                              currentVideo.createdAt
                            ).toLocaleDateString()
                          : "Recently"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side Action Buttons - Reels Style */}
                <div className="absolute right-4 bottom-20 flex flex-col gap-4">
                  <button
                    onClick={handleLike}
                    className={`flex flex-col items-center gap-1 p-3 rounded-full transition-all duration-200 ${
                      isLiked
                        ? "bg-red-500 text-white"
                        : "bg-black/50 text-white hover:bg-black/70"
                    }`}
                  >
                    <Heart
                      className={`w-6 h-6 ${isLiked ? "fill-current" : ""}`}
                    />
                    <span className="text-xs font-medium">{likes}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex flex-col items-center gap-1 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all duration-200"
                  >
                    <Share2 className="w-6 h-6" />
                    <span className="text-xs font-medium">Share</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all duration-200">
                    <MoreVertical className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Other Videos */}
          <div className="hidden lg:block w-80 bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                <h3 className="text-lg font-bold">More Videos</h3>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
               {/* scroll only inside sidebar */}
               <div className="flex-1 overflow-y-auto sidebar-scroll flex flex-col gap-2 p-2 min-h-0">
                 {otherVideos.length > 0 ? (
                   otherVideos.slice(0, 20).map((video) => (
                     <div
                       key={video._id?.toString()}
                       onClick={() => navigateToVideo(video._id!.toString())}
                       className="cursor-pointer group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-200 flex h-24 flex-shrink-0"
                     >
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Video
                          src={video.videoUrl}
                          transformation={[
                            {
                              height: "80",
                              width: "80",
                            },
                          ]}
                          controls={false}
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                          2:34
                        </div>
                      </div>
                      <div className="flex-1 p-2 min-w-0">
                        <h4 className="font-semibold text-xs mb-1 line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {video.title}
                        </h4>
                        <p className="text-gray-400 text-xs line-clamp-1">
                          {video.description}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Eye className="w-3 h-3" />
                          <span>{video.views || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No other videos
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
