'use client';

import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import { Loader2, AlertCircle } from 'lucide-react';

interface SimpleProgressiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
}

const SimpleProgressiveImage: React.FC<SimpleProgressiveImageProps> = ({
  src,
  alt,
  width = 400,
  height = 320,
  className = '',
  priority = false,
  quality = 75
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);

  // Generate progressive URL with ImageKit optimizations
  const generateProgressiveUrl = (originalSrc: string): string => {
    try {
      const url = new URL(originalSrc);
      
      // Add progressive loading and optimizations
      const progressiveParams = [
        `w-${width}`,
        `h-${height}`,
        `q-${quality}`,
        'pr-true', // Progressive loading
        'f-auto', // Auto format selection
        'di-default-placeholder.jpg' // Default image fallback
      ];
      
      // If there are existing transformations, preserve them
      const existingTr = url.searchParams.get('tr');
      if (existingTr) {
        progressiveParams.unshift(existingTr);
      }
      
      url.searchParams.set('tr', progressiveParams.join(','));
      return url.toString();
    } catch (error) {
      console.error('Error generating progressive URL:', error);
      return originalSrc;
    }
  };

  const progressiveSrc = generateProgressiveUrl(src);

  // Handle image load
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (process.env.NODE_ENV === 'development') {
      setLoadTime(Date.now());
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Reset state when src changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setLoadTime(null);
  }, [src]);

  // Loading state
  if (isLoading && !hasError) {
    return (
      <div 
        className={`relative bg-gray-200 animate-pulse rounded-lg flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div 
        className={`relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="w-6 h-6 text-gray-400" />
          <span className="text-xs text-gray-500">Failed to load</span>
        </div>
      </div>
    );
  }

  // Image with progressive loading
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ width, height }}>
      <NextImage
        src={progressiveSrc}
        alt={alt}
        width={width}
        height={height}
        className="object-cover transition-opacity duration-300"
        priority={priority}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
      />
      
      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && loadTime && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          Loaded
        </div>
      )}
    </div>
  );
};

export default SimpleProgressiveImage;
