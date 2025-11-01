'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Heart, Share2, Eye, Download, MoreHorizontal } from 'lucide-react';
import { IImage } from '@/models/Image';
import { useNotification } from '../layout/Notification';
import { ImagePreviewModal } from '../ui/DaisyUIModal';
import { LikeBadge, ViewBadge, ShareBadge, DownloadBadge, TimeBadge } from '../ui/DaisyUIBadge';
import { UserAvatar } from '../ui/DaisyUIAvatar';

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
  const [isSharing, setIsSharing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { showNotification, showToast } = useNotification();

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
        showToast(
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
  }, [image._id, isLoading, onLike, showNotification, showToast]);

  const handleShare = useCallback(async () => {
    if (isSharing) return; // Prevent concurrent share operations
    
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: image.title,
          text: image.description || '',
          url: `${window.location.origin}/images/${image._id}`,
        });
        showToast('Shared successfully!', 'success');
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/images/${image._id}`);
        showToast('Link copied to clipboard!', 'success');
      }
      onShare?.(image._id);
    } catch (error) {
      console.error('Error sharing image:', error);
      // Check if it's the specific InvalidStateError for concurrent shares
      if (error instanceof Error && error.name === 'InvalidStateError') {
        showToast('Please wait for the previous share to complete', 'warning');
      } else if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled the share, don't show error
        console.log('Share cancelled by user');
      } else {
        showToast('Failed to share image', 'error');
      }
    } finally {
      setIsSharing(false);
    }
  }, [image, onShare, showToast, isSharing]);

  const handleView = useCallback(() => {
    setIsPreviewOpen(true);
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
      showToast('Failed to download image', 'error');
    }
  }, [image, showToast]);

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
    <div className={`card bg-base-100 shadow-lg overflow-hidden group ${className}`}>
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
      <div className="card-body p-3">
        <h3 className="card-title text-sm mb-1 line-clamp-2">
          {image.title}
        </h3>
        
        {image.description && (
          <p className="text-base-content/70 text-xs line-clamp-2 mb-2">
            {image.description}
          </p>
        )}

        {/* Tags */}
        {image.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {image.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="badge badge-sm badge-outline"
              >
                #{tag}
              </span>
            ))}
            {image.tags.length > 3 && (
              <span className="badge badge-sm badge-neutral">
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
                className="flex items-center space-x-1 text-xs transition-colors hover:bg-base-200 rounded p-1"
              >
                <LikeBadge count={image.likes} liked={isLiked} />
              </button>
              
              <div className="flex items-center space-x-1 text-xs text-base-content/70">
                <ViewBadge count={image.views} />
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleShare}
                disabled={isSharing}
                className={`p-1 transition-colors rounded hover:bg-base-200 ${
                  isSharing 
                    ? 'text-base-content/50 cursor-not-allowed' 
                    : 'text-base-content/70 hover:text-base-content'
                }`}
                title={isSharing ? "Sharing..." : "Share image"}
              >
                <ShareBadge count={0} />
              </button>
              
              <button
                className="p-1 text-base-content/70 hover:text-base-content transition-colors rounded hover:bg-base-200"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Uploader Info */}
        <div className="mt-2 pt-2 border-t border-base-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserAvatar 
                user={{
                  name: image.uploaderName,
                  email: image.uploaderEmail,
                  status: 'online'
                }}
                size="xs"
                showStatus={true}
              />
              <span className="text-xs text-base-content/70">{image.uploaderName}</span>
            </div>
            <TimeBadge time={image.createdAt} />
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={image.imageUrl}
        title={image.title}
        alt={image.title}
      />
    </div>
  );
};

export default ImageComponent;
