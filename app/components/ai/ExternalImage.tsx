'use client';

import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface ExternalImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
}

const ExternalImage: React.FC<ExternalImageProps> = ({
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

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

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

  // Regular img tag for external URLs (no Next.js optimization)
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ width, height }}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="object-cover transition-opacity duration-300"
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : 'lazy'}
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </div>
  );
};

export default ExternalImage;
