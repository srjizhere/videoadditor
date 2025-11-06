'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Video, Image as ImageIcon, Eye, Download, Share2, Edit3, Trash2 } from 'lucide-react';
import { useNotification } from '../layout/Notification';

interface MediaPreviewProps {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  className?: string;
}

export default function MediaPreview({
  type,
  url,
  thumbnailUrl,
  title,
  description,
  onEdit,
  onDelete,
  onShare,
  onDownload,
  className = ''
}: MediaPreviewProps) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showNotification } = useNotification();

  // Reset error state when thumbnailUrl changes
  useEffect(() => {
    setThumbnailError(false);
    setThumbnailLoading(true);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [thumbnailUrl]);

  // Cleanup retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title || 'Media',
        text: description || '',
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      showNotification('Link copied to clipboard!', 'success');
    }
    onShare?.();
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title || `media.${type === 'image' ? 'jpg' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onDownload?.();
  };

  return (
    <div className={`bg-base-100 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {type === 'image' ? (
                <ImageIcon className="w-5 h-5 text-primary" />
              ) : (
                <Video className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-base-content">
                {title || `Uploaded ${type === 'image' ? 'Image' : 'Video'}`}
              </h3>
              <p className="text-sm text-base-content/70">
                {type === 'image' ? 'Image' : 'Video'} uploaded successfully
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="btn btn-ghost btn-sm"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="btn btn-ghost btn-sm"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="btn btn-ghost btn-sm"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Media Preview */}
      <div className="relative">
        {type === 'image' ? (
          <div className="relative w-full h-64 bg-base-200 flex items-center justify-center">
            <Image
              src={url}
              alt={title || 'Uploaded image'}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div className="relative w-full h-64 bg-base-200 flex items-center justify-center">
            {thumbnailUrl && !thumbnailError ? (
              <>
                <Image
                  src={thumbnailUrl}
                  alt={title || 'Video thumbnail'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized={thumbnailUrl.includes('ik-thumbnail.jpg') || thumbnailUrl.includes('?tr=')} // Don't optimize ImageKit URLs
                  onLoad={() => {
                    setThumbnailLoading(false);
                    setThumbnailError(false);
                  }}
                  onError={(e) => {
                    // ImageKit may need time to process the video - this is expected
                    setThumbnailError(true);
                    setThumbnailLoading(false);
                    
                    // Only log in development mode to reduce noise
                    if (process.env.NODE_ENV === 'development') {
                      console.warn('Thumbnail not available yet:', thumbnailUrl);
                      console.warn('ImageKit may need 10-30 seconds to process the video after upload.');
                    }
                    
                    // Clear any existing retry timeout
                    if (retryTimeoutRef.current) {
                      clearTimeout(retryTimeoutRef.current);
                    }
                    
                    // Retry loading after a delay (ImageKit may have finished processing)
                    retryTimeoutRef.current = setTimeout(() => {
                      setThumbnailError(false);
                      setThumbnailLoading(true);
                      // Force image reload
                      const img = e.target as HTMLImageElement;
                      if (img && thumbnailUrl) {
                        const currentSrc = img.src;
                        img.src = '';
                        setTimeout(() => {
                          img.src = currentSrc;
                        }, 100);
                      }
                    }, 10000); // Retry after 10 seconds
                  }}
                />
                {thumbnailLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-base-200/80 backdrop-blur-sm z-10">
                    <div className="text-center p-4">
                      <div className="loading loading-spinner loading-md mb-2"></div>
                      <p className="text-xs text-base-content/70">Loading thumbnail...</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-base-content/50">
                <Video className="w-12 h-12" />
                <span className="text-sm">Video Preview</span>
                {thumbnailUrl && thumbnailError && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-base-content/60">
                      Thumbnail processing...
                    </p>
                    <p className="text-xs text-base-content/40 mt-1">
                      ImageKit is generating thumbnail (may take 10-30 seconds)
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
                <Video className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="p-4 border-t border-base-300">
          <p className="text-sm text-base-content/80 line-clamp-3">
            {description}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 bg-base-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-base-content/70">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>Ready to publish</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="btn btn-primary btn-sm"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handleDownload}
              className="btn btn-outline btn-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Convenience components for specific media types
export function ImagePreview(props: Omit<MediaPreviewProps, 'type'>) {
  return <MediaPreview {...props} type="image" />;
}

export function VideoPreview(props: Omit<MediaPreviewProps, 'type'>) {
  return <MediaPreview {...props} type="video" />;
}
