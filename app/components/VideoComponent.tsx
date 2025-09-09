import { Video } from "@imagekit/next";
import Link from "next/link";
import { IVideo } from "@/models/Video";
import { Play, Heart, Share2, MoreVertical, User } from "lucide-react";
import { useState, useRef, useCallback, memo, useEffect } from "react";
import { useSession } from "next-auth/react";

const VideoComponent = memo(function VideoComponent({ video }: { video: IVideo }) {
  // Fixed debounced functions issue
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(video.likes || 0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!session?.user || isLiking) return;
    
    // Optimistic update
    const previousLiked = isLiked;
    const previousLikes = likes;
    
    setIsLiked(!isLiked);
    setLikes(prev => isLiked ? prev - 1 : prev + 1);
    setIsLiking(true);
    
    try {
      const response = await fetch(`/api/video/${video._id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      
      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked);
        setLikes(data.likes);
      } else {
        // Revert optimistic update on failure
        setIsLiked(previousLiked);
        setLikes(previousLikes);
        console.error('Failed to like video');
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousLiked);
      setLikes(previousLikes);
      console.error('Error liking video:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // No hover effects to avoid cache issues

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
  };

  // Check if current user has liked this video
  useEffect(() => {
    if (session?.user && video.likedBy) {
      const userId = session.user.id;
      setIsLiked(video.likedBy.some(id => id.toString() === userId));
    }
  }, [session?.user, video.likedBy]);


  return (
    <div 
      className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:scale-[1.02]"
    >
      {/* Video Thumbnail */}
      <div className="relative aspect-[9/16] overflow-hidden">
        <Link href={`/videos/${video._id}`} className="block w-full h-full" prefetch={false}>
          <div className="relative w-full h-full">
            <Video
              ref={videoRef}
              src={video.videoUrl}
              transformation={[
                {
                  height: "1920",
                  width: "1080",
                },
              ]}
              controls={false}
              muted
              loop
              playsInline
              onLoadedData={handleVideoLoad}
              className="w-full h-full object-cover"
            />
            
            {/* Loading State */}
            {!isVideoLoaded && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
            
            {/* Play Button */}
            <div className="absolute inset-0 flex items-center justify-center transition-all duration-300">
              <div className="w-16 h-16 bg-white/90 dark:bg-slate-800/90 rounded-full flex items-center justify-center shadow-lg">
                <Play className="w-6 h-6 text-gray-900 dark:text-white ml-1" fill="currentColor" />
              </div>
            </div>


            {/* Duration Badge */}
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 text-white text-sm font-medium opacity-80">
              2:34
            </div>
          </div>
        </Link>
      </div>

      {/* Video Info */}
      <div className="p-4">
        <Link
          href={`/videos/${video._id}`}
          className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
        >
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:underline">
            {video.title}
          </h3>
        </Link>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {video.description}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={!session?.user || isLiking}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 ${
                !session?.user 
                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                  : isLiked 
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''} ${isLiking ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium">{likes}</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 transition-colors">
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>

          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Creator Info */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {video.uploaderName || video.uploaderEmail?.split('@')[0] || 'Unknown User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Recently'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoComponent;
