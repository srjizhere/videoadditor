'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import NextImage from 'next/image';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProgressiveImageLoaderProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
  quality?: number;
}

interface ImageState {
  status: 'loading' | 'loaded' | 'error';
  currentSrc: string;
  isProgressive: boolean;
  loadTime: number;
}

const ProgressiveImageLoader: React.FC<ProgressiveImageLoaderProps> = ({
  src,
  alt,
  width = 400,
  height = 320,
  className = '',
  placeholder,
  onLoad,
  onError,
  priority = false,
  quality = 75
}) => {
  const [imageState, setImageState] = useState<ImageState>({
    status: 'loading',
    currentSrc: '',
    isProgressive: false,
    loadTime: 0
  });
  
  const [showBlur, setShowBlur] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const loadStartTime = useRef<number>(Date.now());
  const retryCount = useRef<number>(0);
  const maxRetries = 3;

  // Generate blur placeholder URL
  const generateBlurPlaceholder = useCallback((originalSrc: string): string => {
    try {
      const url = new URL(originalSrc);
      
      // Add blur and low quality for placeholder
      const blurParams = [
        'w-50', // Small width for fast loading
        'h-50', // Small height for fast loading
        'bl-20', // Heavy blur
        'q-10', // Very low quality
        'f-jpg', // JPEG for smaller size
        'pr-true' // Progressive loading
      ];
      
      url.searchParams.set('tr', blurParams.join(','));
      return url.toString();
    } catch (error) {
      console.error('Error generating blur placeholder:', error);
      return originalSrc;
    }
  }, []);

  // Generate progressive image URL
  const generateProgressiveUrl = useCallback((originalSrc: string): string => {
    try {
      const url = new URL(originalSrc);
      
      // Add progressive loading parameters
      const progressiveParams = [
        `w-${width}`,
        `h-${height}`,
        `q-${quality}`,
        'pr-true', // Progressive loading
        'f-auto' // Auto format selection
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
  }, [width, height, quality]);

  // Load image with retry logic
  const loadImage = useCallback(async (imageSrc: string, isRetry: boolean = false): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      
      
      // Set timeout for image load
      const timeout = setTimeout(() => {
        console.error(`Image load timeout: ${imageSrc}`);
        img.onerror = null;
        img.onload = null;
        
        if (retryCount.current < maxRetries && !isRetry) {
          retryCount.current++;
          loadImage(imageSrc, true);
        } else {
          setImageState(prev => ({
            ...prev,
            status: 'error',
            currentSrc: imageSrc
          }));
          onError?.();
        }
      }, 15000); // 15 second timeout
      
      const handleLoad = () => {
        clearTimeout(timeout);
        const loadTime = Date.now() - loadStartTime.current;
        setImageState(prev => ({
          ...prev,
          status: 'loaded',
          currentSrc: imageSrc,
          isProgressive: true,
          loadTime
        }));
        
        if (!isRetry) {
          onLoad?.();
        }
        
        resolve(true);
      };
      
      const handleError = () => {
        clearTimeout(timeout);
        console.error(`Image load failed: ${imageSrc}`);
        
        if (retryCount.current < maxRetries && !isRetry) {
          retryCount.current++;
          console.log(`Retrying image load (attempt ${retryCount.current}/${maxRetries})`);
          
          // Exponential backoff
          const delay = Math.pow(2, retryCount.current) * 1000;
          setTimeout(() => {
            loadImage(imageSrc, true);
          }, delay);
        } else {
          setImageState(prev => ({
            ...prev,
            status: 'error',
            currentSrc: imageSrc
          }));
          onError?.();
        }
        
        resolve(false);
      };
      
      img.onload = handleLoad;
      img.onerror = handleError;
      
      img.src = imageSrc;
    });
  }, [onLoad, onError]);

  // Load blur placeholder first
  useEffect(() => {
    if (!src) return;
    
    loadStartTime.current = Date.now();
    retryCount.current = 0;
    
    const blurSrc = generateBlurPlaceholder(src);
    const progressiveSrc = generateProgressiveUrl(src);
    
    // Load blur placeholder first
    loadImage(blurSrc).then((blurLoaded) => {
      if (blurLoaded) {
        // Start loading progressive image
        loadImage(progressiveSrc).then((progressiveLoaded) => {
          if (progressiveLoaded) {
            // Smooth transition from blur to sharp
            setIsTransitioning(true);
            setTimeout(() => {
              setShowBlur(false);
              setIsTransitioning(false);
            }, 100);
          }
        });
      }
    });
  }, [src, loadImage, generateBlurPlaceholder, generateProgressiveUrl]);

  // Handle image load completion
  useEffect(() => {
    if (imageState.status === 'loaded' && !showBlur) {
      // Image is fully loaded and transitioned
      console.log(`Image loaded in ${imageState.loadTime}ms`);
    }
  }, [imageState, showBlur]);

  // Render loading state
  if (imageState.status === 'loading' && !imageState.currentSrc) {
    return (
      <div 
        className={`relative bg-gray-200 animate-pulse rounded-lg flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="text-xs text-gray-500">Loading image...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (imageState.status === 'error') {
    return (
      <div 
        className={`relative bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="w-6 h-6 text-gray-400" />
          <span className="text-xs text-gray-500">Failed to load image</span>
          <button 
            onClick={() => {
              retryCount.current = 0;
              setImageState({ status: 'loading', currentSrc: '', isProgressive: false, loadTime: 0 });
            }}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render image with progressive loading
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ width, height }}>
      {/* Blur placeholder */}
      {showBlur && imageState.currentSrc && (
        <div className="absolute inset-0">
          <NextImage
            ref={imgRef}
            src={imageState.currentSrc}
            alt={`${alt} (loading)`}
            width={width}
            height={height}
            className={`object-cover transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
            priority={priority}
            quality={10}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
          />
        </div>
      )}
      
      {/* Progressive image */}
      {imageState.status === 'loaded' && (
        <div className={`absolute inset-0 transition-opacity duration-500 ${
          showBlur ? 'opacity-0' : 'opacity-100'
        }`}>
          <NextImage
            src={imageState.currentSrc}
            alt={alt}
            width={width}
            height={height}
            className="object-cover"
            priority={priority}
            quality={quality}
            onLoad={() => {
              console.log('Progressive image loaded');
            }}
          />
        </div>
      )}
      
      {/* Loading indicator overlay */}
      {imageState.status === 'loading' && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
          </div>
        </div>
      )}
      
      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && imageState.loadTime > 0 && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {imageState.loadTime}ms
        </div>
      )}
    </div>
  );
};

export default ProgressiveImageLoader;
