'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Heart, 
  Share2, 
  Download, 
  ArrowLeft, 
  Home, 
  ChevronRight,
  Eye,
  Calendar,
  Tag,
  User
} from 'lucide-react';
import { IImage } from '@/models/Image';
import { useNotification } from '@/app/components/Notification';

const ImageDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const [image, setImage] = useState<IImage | null>(null);
  const [otherImages, setOtherImages] = useState<IImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const fetchImage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/images/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setImage(data.data);
        setIsLiked(false); // This should be determined by current user session
      } else {
        throw new Error(data.error || 'Failed to fetch image');
      }
    } catch (err) {
      console.error('Error fetching image:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch image');
      showNotification('Failed to load image', 'error');
    } finally {
      setLoading(false);
    }
  }, [params.id, showNotification]);

  const fetchOtherImages = useCallback(async () => {
    try {
      const response = await fetch('/api/image?limit=20&sortBy=createdAt&sortOrder=desc');
      const data = await response.json();

      if (data.success) {
        // Filter out current image
        const filteredImages = data.data.filter((img: IImage) => img._id !== params.id);
        setOtherImages(filteredImages.slice(0, 12));
      }
    } catch (err) {
      console.error('Error fetching other images:', err);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchImage();
      fetchOtherImages();
    }
  }, [params.id, fetchImage, fetchOtherImages]);

  const handleLike = useCallback(async () => {
    if (!image || isLiking) return;

    setIsLiking(true);
    try {
      const response = await fetch(`/api/images/${image._id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setIsLiked(data.isLiked);
        setImage(prev => prev ? {
          ...prev,
          likes: data.isLiked ? prev.likes + 1 : prev.likes - 1,
          likedBy: data.isLiked 
            ? [...prev.likedBy, image._id]
            : prev.likedBy.filter(id => id.toString() !== image._id)
        } as IImage : null);
        showNotification(
          data.isLiked ? 'Image liked!' : 'Image unliked!',
          'success'
        );
      } else {
        showNotification(data.error || 'Failed to like image', 'error');
      }
    } catch (err) {
      console.error('Error liking image:', err);
      showNotification('Failed to like image', 'error');
    } finally {
      setIsLiking(false);
    }
  }, [image, isLiking, showNotification]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: image?.title || '',
          text: image?.description || '',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showNotification('Link copied to clipboard!', 'success');
      }
    } catch (err) {
      console.error('Error sharing image:', err);
      showNotification('Failed to share image', 'error');
    }
  }, [image, showNotification]);

  const handleDownload = useCallback(async () => {
    if (!image) return;

    try {
      const link = document.createElement('a');
      link.href = image.imageUrl;
      link.download = `${image.title}.${image.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification('Image download started!', 'success');
    } catch (err) {
      console.error('Error downloading image:', err);
      showNotification('Failed to download image', 'error');
    }
  }, [image, showNotification]);

  const navigateToImage = useCallback((imageId: string) => {
    router.push(`/images/${imageId}`);
  }, [router]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading image...</p>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Image not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main Container */}
      <div 
        className="h-screen flex"
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
      >
        {/* Main Image Area - Instagram-style */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Top Controls */}
          <div className={`absolute top-4 left-4 right-4 z-10 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                >
                  <Home className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownload}
                  className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Image Container */}
          <div 
            ref={imageRef}
            className="relative max-w-4xl w-full mx-auto"
            style={{
              aspectRatio: `${image.dimensions.width} / ${image.dimensions.height}`,
              maxHeight: 'calc(100vh - 64px)'
            }}
          >
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            <Image
              src={image.imageUrl}
              alt={image.title}
              fill
              className="object-contain"
              onLoad={handleImageLoad}
              priority
            />
          </div>

          {/* Bottom Info Overlay */}
          <div className={`absolute bottom-4 left-4 right-4 z-10 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
              <h1 className="text-xl font-bold mb-2">{image.title}</h1>
              {image.description && (
                <p className="text-gray-300 mb-3">{image.description}</p>
              )}
              
              {/* Tags */}
              {image.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {image.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-600 text-white text-sm rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{image.uploaderName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {new Date(image.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{image.views}</span>
                  </div>
                  <button
                    onClick={handleLike}
                    disabled={isLiking}
                    className={`flex items-center space-x-1 transition-colors ${
                      isLiked 
                        ? 'text-red-500 hover:text-red-400' 
                        : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{image.likes}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Other Images */}
        <div className="hidden lg:block w-80 bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
              <h3 className="text-lg font-bold">More Images</h3>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            
            <div className="flex-1 overflow-y-auto sidebar-scroll flex flex-col gap-2 p-2 min-h-0">
              {otherImages.length > 0 ? (
                otherImages.map((img) => (
                  <div
                    key={img._id?.toString()}
                    onClick={() => navigateToImage(img._id!.toString())}
                    className="cursor-pointer group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-200 flex h-24 flex-shrink-0"
                  >
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <Image
                        src={img.thumbnailUrl || img.imageUrl}
                        alt={img.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <h4 className="font-medium text-white text-sm line-clamp-2 mb-1">
                        {img.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{img.uploaderName}</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Heart className="w-3 h-3" />
                            <span>{img.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>{img.views}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-400 text-center">No other images available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageDetailPage;
