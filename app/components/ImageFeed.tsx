'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ImageComponent from './ImageComponent';
import { IImage } from '@/models/Image';
import { useNotification } from './Notification';

interface ImageFeedProps {
  limit?: number;
  category?: string;
  showPagination?: boolean;
  className?: string;
}

const ImageFeed: React.FC<ImageFeedProps> = ({
  limit = 20,
  category,
  showPagination = true,
  className = ''
}) => {
  const [images, setImages] = useState<IImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { showNotification } = useNotification();

  const fetchImages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: limit.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`/api/image?${params}`);
      const data = await response.json();

      if (data.success) {
        if (append) {
          setImages(prev => [...prev, ...data.data]);
        } else {
          setImages(data.data);
        }
        setHasMore(data.pagination.hasNext);
      } else {
        throw new Error(data.error || 'Failed to fetch images');
      }
    } catch (err) {
      console.error('Error fetching images:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch images');
      showNotification('Failed to load images', 'error');
    } finally {
      setLoading(false);
    }
  }, [limit, category, showNotification]);

  useEffect(() => {
    fetchImages(1, false);
  }, [fetchImages]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchImages(nextPage, true);
    }
  };

  const handleLike = useCallback((imageId: string) => {
    setImages(prev => prev.map(image => 
      image._id === imageId 
        ? { ...image, likes: image.likes + (image.likedBy.some(id => id.toString() === imageId) ? -1 : 1) }
        : image
    ));
  }, []);

  const handleShare = useCallback((imageId: string) => {
    showNotification('Share link copied to clipboard!', 'success');
  }, [showNotification]);

  const handleView = useCallback((imageId: string) => {
    window.location.href = `/images/${imageId}`;
  }, []);

  if (loading && images.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading images...</p>
        </div>
      </div>
    );
  }

  if (error && images.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchImages(1, false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Images Found</h3>
          <p className="text-gray-400">
            {category ? `No images found in ${category} category` : 'No images have been uploaded yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Images Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image) => (
          <ImageComponent
            key={image._id}
            image={image}
            onLike={handleLike}
            onShare={handleShare}
            onView={handleView}
            aspectRatio="auto"
            size="md"
          />
        ))}
      </div>

      {/* Load More Button */}
      {showPagination && hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Load More Images'}
          </button>
        </div>
      )}

      {/* Loading Indicator for Load More */}
      {loading && images.length > 0 && (
        <div className="flex justify-center mt-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default ImageFeed;
