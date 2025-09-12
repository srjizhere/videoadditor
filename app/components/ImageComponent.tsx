'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Heart, Share2, Eye, Download, MoreHorizontal } from 'lucide-react';
import { IImage } from '@/models/Image';
import { useNotification } from './Notification';

interface ImageComponentProps {
  image: IImage;
  onLike?: (imageId: string) => void;
  onShare?: (imageId: string) => void;
  onView?: (imageId: string) => void;
  showActions?: boolean;
  className?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'auto';
  size?: 'sm' | 'md' | 'lg';
}

const ImageComponent: React.FC<ImageComponentProps> = ({
  image,
  onLike,
  onShare,
  onView,
  showActions = true,
  className = '',
  aspectRatio = 'auto',
  size = 'md'
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    // Initialize like state based on current user
    // This would need to be passed as a prop or fetched from context
    setIsLiked(false);
  }, [image._id]);

  const handleLike = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
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
        onLike?.(image._id);
        showNotification(
          data.isLiked ? 'Image liked!' : 'Image unliked!',
          'success'
        );
      } else {
        showNotification(data.error || 'Failed to like image', 'error');
      }
    } catch (error) {
      console.error('Error liking image:', error);
      showNotification('Failed to like image', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [image._id, isLiked, isLoading, onLike, showNotification]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: image.title,
          text: image.description || '',
          url: `${window.location.origin}/images/${image._id}`,
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/images/${image._id}`);
        showNotification('Link copied to clipboard!', 'success');
      }
      onShare?.(image._id);
    } catch (error) {
      console.error('Error sharing image:', error);
      showNotification('Failed to share image', 'error');
    }
  }, [image, onShare, showNotification]);

  const handleView = useCallback(() => {
    onView?.(image._id);
  }, [image._id, onView]);

  const handleDownload = useCallback(async () => {
    try {
      const link = document.createElement('a');
      link.href = image.imageUrl;
      link.download = `${image.title}.${image.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Increment download count
      await fetch(`/api/images/${image._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ downloads: image.downloads + 1 }),
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      showNotification('Failed to download image', 'error');
    }
  }, [image, showNotification]);

  // Calculate aspect ratio class
  const getAspectRatioClass = () => {
    if (aspectRatio === 'auto') {
      const ratio = image.dimensions.width / image.dimensions.height;
      if (ratio > 1.2) return 'aspect-video';
      if (ratio < 0.8) return 'aspect-[4/5]';
      return 'aspect-square';
    }
    
    switch (aspectRatio) {
      case 'square': return 'aspect-square';
      case 'portrait': return 'aspect-[4/5]';
      case 'landscape': return 'aspect-video';
      default: return 'aspect-square';
    }
  };

  // Calculate size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-32';
      case 'md': return 'h-48';
      case 'lg': return 'h-64';
      default: return 'h-48';
    }
  };

  return (
    <div className={`group relative bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      {/* Image Container */}
      <div 
        className={`relative ${getSizeClasses()} ${getAspectRatioClass()} cursor-pointer`}
        onClick={handleView}
      >
        <Image
          src={image.thumbnailUrl || image.imageUrl}
          alt={image.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
        
        {/* Category Badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 text-xs font-medium bg-black/50 text-white rounded-full backdrop-blur-sm">
            {image.category}
          </span>
        </div>

        {/* Actions Overlay */}
        {showActions && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleView();
                }}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                title="View image"
              >
                <Eye className="w-4 h-4 text-white" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                title="Download image"
              >
                <Download className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">
          {image.title}
        </h3>
        
        {image.description && (
          <p className="text-gray-400 text-xs line-clamp-2 mb-2">
            {image.description}
          </p>
        )}

        {/* Tags */}
        {image.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {image.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {image.tags.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
                +{image.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLike}
                disabled={isLoading}
                className={`flex items-center space-x-1 text-xs transition-colors ${
                  isLiked 
                    ? 'text-red-500 hover:text-red-400' 
                    : 'text-gray-400 hover:text-red-500'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{image.likes}</span>
              </button>
              
              <div className="flex items-center space-x-1 text-xs text-gray-400">
                <Eye className="w-4 h-4" />
                <span>{image.views}</span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleShare}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Share image"
              >
                <Share2 className="w-4 h-4" />
              </button>
              
              <button
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Uploader Info */}
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {image.uploaderName.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-gray-400">{image.uploaderName}</span>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(image.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageComponent;
