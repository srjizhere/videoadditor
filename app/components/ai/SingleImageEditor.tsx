'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import { 
  Zap, Download, RotateCcw, Eye, EyeOff, Loader2, Settings, 
  Sparkles, Wand2, Undo2, Redo2, RefreshCw, CheckCircle, ImageIcon,
  RotateCw, FlipHorizontal, FlipVertical, Crop
} from 'lucide-react';
import Image from 'next/image';
import { useNotification } from '../layout/Notification';
import { safeFetchJson } from '@/lib/fetch-utils';
import ProgressiveImageLoader from './ProgressiveImageLoader';
import SimpleProgressiveImage from './SimpleProgressiveImage';
import ImageProcessingStatus from './ImageProcessingStatus';

interface SingleImageEditorProps {
  imageUrl: string;
  onImageProcessed: (processedUrl: string) => void;
  onReset: () => void;
  className?: string;
}

interface TransformationState {
  id: string;
  type: 'enhancement' | 'background-removal' | 'quality' | 'format' | 'rotate' | 'crop' | 'flip';
  name: string;
  applied: boolean;
  processing: boolean;
  completed: boolean;
  url?: string;
  timestamp: number;
  params?: {
    rotation?: number;
    flip?: 'v' | 'h';
    width?: number;
    height?: number;
    aspectRatio?: string;
  };
}

// Transformation history reducer for better state management
type TransformationAction =
  | { type: 'ADD'; transformation: TransformationState }
  | { type: 'UPDATE'; id: string; updates: Partial<TransformationState> }
  | { type: 'RESET' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

interface TransformationHistoryState {
  history: TransformationState[];
  index: number;
}

function transformationReducer(
  state: TransformationHistoryState,
  action: TransformationAction
): TransformationHistoryState {
  switch (action.type) {
    case 'ADD':
      const newHistory = [...state.history.slice(0, state.index + 1), action.transformation];
      return { history: newHistory, index: newHistory.length - 1 };
    case 'UPDATE':
      return {
        ...state,
        history: state.history.map(t =>
          t.id === action.id ? { ...t, ...action.updates } : t
        )
      };
    case 'RESET':
      return { history: [], index: -1 };
    case 'UNDO':
      return { ...state, index: Math.max(-1, state.index - 1) };
    case 'REDO':
      return { ...state, index: Math.min(state.history.length - 1, state.index + 1) };
    default:
      return state;
  }
}

// Memoized URL parsing utility
const extractOriginalUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  
  try {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const urlObj = new URL(imageUrl);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/').filter(part => part && part.length > 0);
      
      if (parts.length > 0) {
        parts.shift(); // Remove ImageKit ID
      }
      
      const pathWithoutTransforms = parts.filter(part => !part.startsWith('tr:'));
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const imagekitId = urlObj.pathname.split('/')[1];
      const originalPath = pathWithoutTransforms.join('/');
      
      return `${baseUrl}/${imagekitId}/${originalPath}`;
    }
    
    return imageUrl;
  } catch (error) {
    console.error('Error extracting original URL:', error);
    return imageUrl;
  }
};

const extractFilename = (url: string): string => {
  const parts = url.split('/').filter(part => part && !part.startsWith('tr:'));
  return parts[parts.length - 1] || '';
};

const SingleImageEditor: React.FC<SingleImageEditorProps> = ({
  imageUrl,
  onImageProcessed,
  onReset,
  className = ''
}) => {
  const { showNotification } = useNotification();
  
  // Core state management
  const [originalUrl, setOriginalUrl] = useState<string>(() => extractOriginalUrl(imageUrl));
  
  const [currentWorkingUrl, setCurrentWorkingUrl] = useState<string>(imageUrl || '');
  
  // Track if this is the first image load to preserve originalUrl
  const isFirstLoadRef = useRef(true);
  
  // Memoized filename extraction
  const currentFilename = useMemo(() => extractFilename(currentWorkingUrl), [currentWorkingUrl]);
  const newFilename = useMemo(() => extractFilename(imageUrl), [imageUrl]);
  
  // Update URLs when imageUrl prop changes (new upload or transformation)
  useEffect(() => {
    if (!imageUrl) return;
    
    // On first load, we already set originalUrl in useState initializer
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      setCurrentWorkingUrl(imageUrl);
      return;
    }
    
    // For subsequent changes, ONLY update currentWorkingUrl
    setCurrentWorkingUrl(imageUrl);
    
    // Only reset state if the actual filename changed (new upload)
    if (currentFilename && newFilename && currentFilename !== newFilename) {
      const newOriginalUrl = extractOriginalUrl(imageUrl);
      setOriginalUrl(newOriginalUrl);
      
      // Reset enhancement options for new image
      setEnhancementOptions({
        blur: 0,
        quality: 90,
        format: 'auto' as 'jpg' | 'png' | 'webp' | 'auto',
        brightness: 0,
        contrast: 0,
        saturation: 0,
        sharpen: 0
      });
    }
  }, [imageUrl, currentFilename, newFilename]);
  const [isOperationInProgress, setIsOperationInProgress] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  
  // Transformation history with useReducer for better performance
  const [transformationState, dispatch] = useReducer(transformationReducer, {
    history: [],
    index: -1
  });
  
  // Processing states
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<string>('');
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  
  // Use ref instead of state for cleanup function
  const activePollingCleanupRef = useRef<(() => void) | null>(null);
  
  // Enhancement settings
  const [enhancementOptions, setEnhancementOptions] = useState({
    blur: 0,
    quality: 90,
    format: 'auto' as 'jpg' | 'png' | 'webp' | 'auto',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpen: 0
  });
  
  // Rotate and crop settings
  const [currentRotation, setCurrentRotation] = useState(0);
  const [cropSettings, setCropSettings] = useState({
    aspectRatio: 'original' as 'original' | '1:1' | '4:3' | '16:9' | '9:16' | 'custom',
    width: 0,
    height: 0
  });

  // Timer for processing elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isOperationInProgress && processingStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOperationInProgress, processingStartTime]);

  // Cleanup polling on component unmount
  useEffect(() => {
    return () => {
      if (activePollingCleanupRef.current) {
        activePollingCleanupRef.current();
      }
    };
  }, []);

  // Memoized computed values
  const isAnyTransformationInProgress = useMemo(
    () => transformationState.history.some(t => t.processing),
    [transformationState.history]
  );
  
  const canPerformOperation = useMemo(
    () => !isOperationInProgress && !isAnyTransformationInProgress,
    [isOperationInProgress, isAnyTransformationInProgress]
  );

  // Add transformation to history
  const addTransformation = useCallback((transformation: Omit<TransformationState, 'id' | 'timestamp'>) => {
    const newTransformation: TransformationState = {
      ...transformation,
      id: `transformation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    dispatch({ type: 'ADD', transformation: newTransformation });
    return newTransformation;
  }, []);

  // Update transformation status
  const updateTransformation = useCallback((id: string, updates: Partial<TransformationState>) => {
    dispatch({ type: 'UPDATE', id, updates });
  }, []);

  // Build chained URL with all completed transformations
  const buildChainedUrl = useCallback((baseUrl: string, transformations: TransformationState[]): string => {
    const completedTransformations = transformations
      .filter(t => t.completed)
      .map(t => {
        switch (t.type) {
          case 'enhancement': return 'e-auto-enhance';
          case 'background-removal': return 'e-bgremove';
          case 'quality': return `q-${enhancementOptions.quality}`;
          case 'format': return `f-${enhancementOptions.format}`;
          case 'rotate': return t.params?.rotation ? `rt-${t.params.rotation}` : '';
          case 'flip': return t.params?.flip ? `fl-${t.params.flip}` : '';
          case 'crop': {
            if (t.params?.width && t.params?.height) {
              return [
                `w-${t.params.width}`,
                `h-${t.params.height}`,
                'c-force',
                'cm-extract',
                'fo-auto'
              ].join(',');
            }
            return '';
          }
          default: return '';
        }
      })
      .filter(Boolean);
    
    if (completedTransformations.length === 0) return baseUrl;
    
    const url = new URL(baseUrl);
    const transformationString = [
      ...completedTransformations,
      'pr-true',
      'di-default-placeholder.jpg'
    ].join(',');
    url.searchParams.set('tr', transformationString);
    return url.toString();
  }, [enhancementOptions.quality, enhancementOptions.format]);

  // Note: currentWorkingUrl is now managed directly by transformation completion
  // No automatic URL building needed as processed URLs are final

  // Handle enhancement
  const handleEnhancement = useCallback(async (autoEnhance: boolean = false) => {
    if (!canPerformOperation) {
      showNotification('Please wait for the current operation to complete', 'warning');
      return;
    }

    setIsOperationInProgress(true);
    setProcessingStartTime(Date.now());
    
    const transformation = addTransformation({
      type: 'enhancement',
      name: autoEnhance ? 'Auto Enhancement' : 'Manual Enhancement',
      applied: true,
      processing: true,
      completed: false
    });

    try {
      const result = await safeFetchJson('/api/ai/image-enhancement', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: currentWorkingUrl,
          options: autoEnhance ? {} : enhancementOptions,
          autoEnhance
        }),
      });

      if (result.success) {
        const data = result.data.data.data;
        const enhancedUrl = data.enhancedUrl;
        
        if (data.isAsync) {
          setProcessingStatus(data.status);
          setEstimatedTime(data.estimatedTime);
          showNotification(data.message, 'info');
          
          // Start polling for completion
          pollForCompletion(enhancedUrl, transformation.id).then(cleanup => {
            activePollingCleanupRef.current = cleanup;
          });
        } else {
          // Immediate processing
          updateTransformation(transformation.id, {
            processing: false,
            completed: true,
            url: enhancedUrl
          });
          // Update the current working URL to the processed URL
          setCurrentWorkingUrl(enhancedUrl);
          onImageProcessed(enhancedUrl);
          showNotification('Image enhanced successfully!', 'success');
        }
      } else {
        updateTransformation(transformation.id, {
          processing: false,
          applied: false
        });
        showNotification(result.error || 'Enhancement failed', 'error');
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      updateTransformation(transformation.id, {
        processing: false,
        applied: false
      });
      showNotification('Failed to enhance image', 'error');
    } finally {
      setIsOperationInProgress(false);
    }
  }, [canPerformOperation, currentWorkingUrl, enhancementOptions, addTransformation, updateTransformation, onImageProcessed, showNotification]);

  // Handle background removal
  const handleBackgroundRemoval = useCallback(async () => {
    if (!canPerformOperation) {
      showNotification('Please wait for the current operation to complete', 'warning');
      return;
    }

    setIsOperationInProgress(true);
    setProcessingStartTime(Date.now());
    
    const transformation = addTransformation({
      type: 'background-removal',
      name: 'Background Removal',
      applied: true,
      processing: true,
      completed: false
    });

    try {
      const result = await safeFetchJson('/api/ai/background-removal', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: currentWorkingUrl,
          options: {
            quality: 90,
            format: 'png',
            transparent: true
          }
        }),
      });

      if (result.success) {
        const data = result.data.data;
        
        if (data.isAsync) {
          setProcessingStatus(data.status);
          setEstimatedTime(data.estimatedTime);
          showNotification(data.message, 'info');
          
          // Start polling for completion
          pollForCompletion(data.processedUrl, transformation.id, 'background-removal').then(cleanup => {
            activePollingCleanupRef.current = cleanup;
          });
        } else {
          updateTransformation(transformation.id, {
            processing: false,
            completed: true,
            url: data.processedUrl
          });
          setCurrentWorkingUrl(data.processedUrl);
          onImageProcessed(data.processedUrl);
          showNotification('🎉 Background removed successfully!', 'success');
        }
      } else {
        updateTransformation(transformation.id, {
          processing: false,
          applied: false
        });
        showNotification(result.error || 'Background removal failed', 'error');
      }
    } catch (error) {
      console.error('Background removal error:', error);
      updateTransformation(transformation.id, {
        processing: false,
        applied: false
      });
      showNotification('Failed to remove background', 'error');
    } finally {
      setIsOperationInProgress(false);
    }
  }, [canPerformOperation, currentWorkingUrl, addTransformation, updateTransformation, onImageProcessed, showNotification]);

  // Handle rotation
  const handleRotate = useCallback((degrees: number) => {
    if (!canPerformOperation) {
      showNotification('Please wait for the current operation to complete', 'warning');
      return;
    }

    const newRotation = (currentRotation + degrees) % 360;
    setCurrentRotation(newRotation);
    
    // Build transformation URL with rotation, preserving existing transformations
    const url = new URL(currentWorkingUrl);
    const existingTransforms = url.searchParams.get('tr')?.split(',').filter(t => 
      !t.startsWith('rt-') && // Remove old rotation
      !t.startsWith('pr-') && // Remove progressive loading flags
      !t.startsWith('di-') // Remove default image
    ) || [];
    
    const transformationParams = [
      ...existingTransforms,
      `rt-${newRotation}`,
      'pr-true',
      'di-default-placeholder.jpg'
    ];
    url.searchParams.set('tr', transformationParams.join(','));
    const rotatedUrl = url.toString();
    
    const transformation = addTransformation({
      type: 'rotate',
      name: `Rotate ${degrees}°`,
      applied: true,
      processing: false,
      completed: true,
      url: rotatedUrl,
      params: { rotation: newRotation }
    });
    
    setCurrentWorkingUrl(rotatedUrl);
    onImageProcessed(rotatedUrl);
    showNotification(`Image rotated ${degrees}°`, 'success');
  }, [canPerformOperation, currentRotation, currentWorkingUrl, addTransformation, onImageProcessed, showNotification]);

  // Handle flip
  const handleFlip = useCallback((direction: 'v' | 'h') => {
    if (!canPerformOperation) {
      showNotification('Please wait for the current operation to complete', 'warning');
      return;
    }

    // Build transformation URL with flip, preserving existing transformations
    const url = new URL(currentWorkingUrl);
    const existingTransforms = url.searchParams.get('tr')?.split(',').filter(t => 
      !t.startsWith('fl-') && // Remove old flip
      !t.startsWith('pr-') && // Remove progressive loading flags
      !t.startsWith('di-') // Remove default image
    ) || [];
    
    const transformationParams = [
      ...existingTransforms,
      `fl-${direction}`,
      'pr-true',
      'di-default-placeholder.jpg'
    ];
    url.searchParams.set('tr', transformationParams.join(','));
    const flippedUrl = url.toString();
    
    const transformation = addTransformation({
      type: 'flip',
      name: direction === 'h' ? 'Flip Horizontal' : 'Flip Vertical',
      applied: true,
      processing: false,
      completed: true,
      url: flippedUrl,
      params: { flip: direction }
    });
    
    setCurrentWorkingUrl(flippedUrl);
    onImageProcessed(flippedUrl);
    showNotification(`Image flipped ${direction === 'h' ? 'horizontally' : 'vertically'}`, 'success');
  }, [canPerformOperation, currentWorkingUrl, addTransformation, onImageProcessed, showNotification]);

  // Handle crop
  const handleCrop = useCallback(() => {
    if (!canPerformOperation) {
      showNotification('Please wait for the current operation to complete', 'warning');
      return;
    }

    if (cropSettings.aspectRatio === 'original') {
      showNotification('Please select an aspect ratio to crop', 'warning');
      return;
    }

    // Calculate dimensions based on aspect ratio
    let width = cropSettings.width;
    let height = cropSettings.height;
    
    if (cropSettings.aspectRatio === '1:1') {
      width = height = Math.min(width || 800, height || 800);
    } else if (cropSettings.aspectRatio === '4:3') {
      width = width || 800;
      height = Math.round(width * 3 / 4);
    } else if (cropSettings.aspectRatio === '16:9') {
      width = width || 1600;
      height = Math.round(width * 9 / 16);
    } else if (cropSettings.aspectRatio === '9:16') {
      width = width || 900;
      height = Math.round(width * 16 / 9);
    }

    // Build transformation URL with crop, preserving existing transformations
    const url = new URL(currentWorkingUrl);
    const existingTransforms = url.searchParams.get('tr')?.split(',').filter(t => 
      !t.startsWith('w-') && // Remove old width
      !t.startsWith('h-') && // Remove old height
      !t.startsWith('c-') && // Remove old crop mode
      !t.startsWith('cm-') && // Remove old crop method
      !t.startsWith('fo-') && // Remove old focus
      !t.startsWith('pr-') && // Remove progressive loading flags
      !t.startsWith('di-') // Remove default image
    ) || [];
    
    const transformationParams = [
      ...existingTransforms,
      `w-${width}`,
      `h-${height}`,
      'c-force',
      'cm-extract',
      'fo-auto',
      'pr-true',
      'di-default-placeholder.jpg'
    ];
    url.searchParams.set('tr', transformationParams.join(','));
    const croppedUrl = url.toString();
    
    const transformation = addTransformation({
      type: 'crop',
      name: `Crop ${cropSettings.aspectRatio}`,
      applied: true,
      processing: false,
      completed: true,
      url: croppedUrl,
      params: { width, height, aspectRatio: cropSettings.aspectRatio }
    });
    
    setCurrentWorkingUrl(croppedUrl);
    onImageProcessed(croppedUrl);
    showNotification(`Image cropped to ${cropSettings.aspectRatio}`, 'success');
  }, [canPerformOperation, cropSettings, currentWorkingUrl, addTransformation, onImageProcessed, showNotification]);

  // Poll for completion
  const pollForCompletion = useCallback(async (url: string, transformationId: string, type: 'enhancement' | 'background-removal' = 'enhancement') => {
    const maxAttempts = 20;
    let attempts = 0;
    let intervalId: NodeJS.Timeout | null = null;
    
    const poll = async () => {
      try {
        const endpoint = type === 'background-removal' 
          ? `/api/ai/background-removal/status?processedUrl=${encodeURIComponent(url)}`
          : `/api/ai/image-enhancement/status?enhancedUrl=${encodeURIComponent(url)}`;
        
        const response = await fetch(endpoint);
        const data = await response.json();
        
        if (data.success && data.isReady) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          
          const finalProcessedUrl = data.processedUrl || url;
          
          updateTransformation(transformationId, {
            processing: false,
            completed: true,
            url: finalProcessedUrl
          });
          
          // Test if URL is accessible
          fetch(finalProcessedUrl, { method: 'HEAD' })
            .then(response => {
              if (response.ok) {
                setCurrentWorkingUrl(finalProcessedUrl);
                onImageProcessed(finalProcessedUrl);
                showNotification('🎉 Processing completed successfully!', 'success');
              } else {
                showNotification('Processed image is not accessible', 'error');
              }
            })
            .catch(() => {
              // Still try to set the URL in case it's a CORS issue
              setCurrentWorkingUrl(finalProcessedUrl);
              onImageProcessed(finalProcessedUrl);
              showNotification('🎉 Processing completed!', 'success');
            });
          return;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          updateTransformation(transformationId, {
            processing: false,
            applied: false
          });
          showNotification('Processing timeout. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Polling error:', error);
        attempts++;
        if (attempts >= maxAttempts) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          updateTransformation(transformationId, {
            processing: false,
            applied: false
          });
          showNotification('Failed to check processing status', 'error');
        }
      }
    };
    
    // Start polling immediately, then every 60 seconds
    poll();
    intervalId = setInterval(poll, 60000);
    
    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [updateTransformation, onImageProcessed, showNotification]);

  // Undo transformation
  const undoTransformation = useCallback(() => {
    if (transformationState.index >= 0) {
      dispatch({ type: 'UNDO' });
      const newIndex = transformationState.index - 1;
      
      if (newIndex >= 0) {
        // Use the URL from the transformation at the new index
        const targetTransformation = transformationState.history[newIndex];
        const newUrl = targetTransformation.url || originalUrl;
        setCurrentWorkingUrl(newUrl);
        showNotification('Transformation undone', 'success');
      } else {
        setCurrentWorkingUrl(originalUrl);
        showNotification('Reset to original image', 'success');
      }
    }
  }, [transformationState.index, transformationState.history, originalUrl, showNotification]);

  // Redo transformation
  const redoTransformation = useCallback(() => {
    if (transformationState.index < transformationState.history.length - 1) {
      dispatch({ type: 'REDO' });
      const newIndex = transformationState.index + 1;
      
      // Use the URL from the transformation at the new index
      const targetTransformation = transformationState.history[newIndex];
      const newUrl = targetTransformation.url || originalUrl;
      setCurrentWorkingUrl(newUrl);
      showNotification('Transformation redone', 'success');
    }
  }, [transformationState.index, transformationState.history, originalUrl, showNotification]);

  // Reset to original
  const handleReset = useCallback(() => {
    // Clean up any active polling
    if (activePollingCleanupRef.current) {
      activePollingCleanupRef.current();
      activePollingCleanupRef.current = null;
    }
    
    dispatch({ type: 'RESET' });
    setCurrentWorkingUrl(originalUrl);
    setShowComparison(false);
    setProcessingStatus('');
    setEstimatedTime('');
    setElapsedTime('');
    setProcessingStartTime(null);
    onReset();
    showNotification('Reset to original image', 'success');
  }, [originalUrl, onReset, showNotification]);

  // Toggle comparison
  const toggleComparison = useCallback(() => {
    setShowComparison(!showComparison);
  }, [showComparison]);

  // Download current image
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = currentWorkingUrl;
    link.download = 'processed-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Image downloaded!', 'success');
  }, [currentWorkingUrl, showNotification]);

  // Save processed image with transformations
  const handleSave = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: currentWorkingUrl,
          transformations: transformationState.history.filter(t => t.completed),
          metadata: {
            processingTime: Date.now() - (processingStartTime || Date.now()),
            transformationCount: transformationState.history.filter(t => t.completed).length,
            originalUrl: originalUrl
          }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        showNotification('🎉 Image saved successfully!', 'success');
        onImageProcessed(result.data.savedImage.savedUrl);
      } else {
        showNotification(result.error || 'Failed to save image', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('Failed to save image', 'error');
    }
  }, [currentWorkingUrl, transformationState.history, processingStartTime, originalUrl, onImageProcessed, showNotification]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-semibold text-white">Single Image Editor</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button
            type="button"
            onClick={undoTransformation}
            disabled={transformationState.index < 0 || !canPerformOperation}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
          
          <button
            type="button"
            onClick={redoTransformation}
            disabled={transformationState.index >= transformationState.history.length - 1 || !canPerformOperation}
            className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Redo2 className="w-4 h-4" />
            Redo
          </button>
          
          {/* Comparison Toggle */}
          <button
            type="button"
            onClick={toggleComparison}
            disabled={!canPerformOperation}
            className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {showComparison ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showComparison ? 'Hide' : 'Show'} Comparison
          </button>
          
          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canPerformOperation}
            className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          
          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canPerformOperation}
            className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Save
          </button>
          
          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            disabled={!canPerformOperation}
            className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Transformation History */}
      {transformationState.history.length > 0 && (
        <div className="p-4 bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Transformation History</h4>
          <div className="space-y-2">
            {transformationState.history.map((transformation, index) => (
              <div
                key={transformation.id}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  index <= transformationState.index ? 'bg-blue-600/20' : 'bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {transformation.processing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  ) : transformation.completed ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gray-500" />
                  )}
                  <span className="text-sm text-white">{transformation.name}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(transformation.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Display with Progressive Loading */}
      <div className="space-y-4">
        {!currentWorkingUrl ? (
          <div className="flex justify-center items-center h-96 bg-gray-800 rounded-lg border border-gray-600">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-400">No image loaded</p>
            </div>
          </div>
        ) : showComparison ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 text-center">Original</h4>
              <div className="relative max-w-full max-h-96 overflow-hidden rounded-lg border border-gray-600">
                {originalUrl ? (
                  <Image
                    src={originalUrl}
                    alt="Original"
                    width={400}
                    height={320}
                    className="max-w-full max-h-96 object-contain"
                    priority={true}
                    quality={85}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 bg-gray-800">
                    <p className="text-gray-400">No original image</p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 text-center">Processed</h4>
              <div className="relative max-w-full max-h-96 overflow-hidden rounded-lg border border-gray-600">
                {isOperationInProgress && transformationState.history.some(t => t.processing && (t.type === 'background-removal' || t.type === 'enhancement')) ? (
                  // Show loader while AI processing is in progress
                  <div className="flex flex-col items-center justify-center h-96 bg-gray-800 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <div className="text-center">
                      <p className="text-sm text-gray-300 mb-1">Processing...</p>
                      <p className="text-xs text-gray-500">
                        {transformationState.history.find(t => t.processing)?.type === 'background-removal' 
                          ? 'AI removing background' 
                          : 'AI enhancing image'
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                <Image
                  src={currentWorkingUrl}
                  alt="Processed"
                  width={400}
                  height={320}
                  className="max-w-full max-h-96 object-contain"
                  priority={true}
                  quality={90}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative max-w-full max-h-96 overflow-hidden rounded-lg border border-gray-600">
              {/* Main Image */}
              <Image
                src={currentWorkingUrl}
                alt="Current Image"
                width={400}
                height={320}
                className="max-w-full max-h-96 object-contain"
                priority={true}
                quality={90}
              />
              
              {/* Loading Overlay - Only shows when processing */}
              {isOperationInProgress && transformationState.history.some(t => t.processing && (t.type === 'background-removal' || t.type === 'enhancement')) && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center space-y-6 animate-fade-in z-10">
                  {/* Animated Loader */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-blue-400 animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Status Text */}
                  <div className="text-center px-6 max-w-md bg-gray-900/80 rounded-2xl p-6 border border-blue-500/30">
                    <h3 className="text-xl font-bold text-white mb-3">
                      {transformationState.history.find(t => t.processing)?.type === 'background-removal' 
                        ? '🎨 Removing Background' 
                        : '✨ Enhancing Image'
                      }
                    </h3>
                    <p className="text-sm text-blue-300 mb-2 font-medium">
                      {processingStatus || (transformationState.history.find(t => t.processing)?.type === 'background-removal' 
                        ? 'AI is carefully removing the background...' 
                        : 'AI is enhancing your image...'
                      )}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-4">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span>This may take 2-5 minutes</span>
                    </div>
                    {elapsedTime && (
                      <div className="mt-3 text-xs text-gray-500">
                        Elapsed: {elapsedTime}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transformation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Enhancement */}
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-medium text-white">Enhancement</h3>
          </div>
          
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => handleEnhancement(true)}
              disabled={!canPerformOperation}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
            >
              {isOperationInProgress ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Auto Enhance
                </>
              )}
            </button>
            
            {/* Manual Enhancement Controls */}
            <div className="space-y-4 p-4 bg-gray-600 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-yellow-400" />
                <h4 className="text-sm font-medium text-gray-200">Manual Enhancement</h4>
              </div>
              
              {/* Brightness Control */}
              <div className="space-y-2">
                <label className="flex justify-between items-center text-sm text-gray-300">
                  <span>Brightness</span>
                  <span className="text-yellow-400 font-mono">{enhancementOptions.brightness}</span>
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={enhancementOptions.brightness}
                  onChange={(e) => setEnhancementOptions(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                  disabled={!canPerformOperation}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #374151 0%, #374151 ${(enhancementOptions.brightness + 100) / 2}%, #6b7280 ${(enhancementOptions.brightness + 100) / 2}%, #6b7280 100%)`
                  }}
                />
              </div>
              
              {/* Contrast Control */}
              <div className="space-y-2">
                <label className="flex justify-between items-center text-sm text-gray-300">
                  <span>Contrast</span>
                  <span className="text-yellow-400 font-mono">{enhancementOptions.contrast}</span>
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={enhancementOptions.contrast}
                  onChange={(e) => setEnhancementOptions(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                  disabled={!canPerformOperation}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #374151 0%, #374151 ${(enhancementOptions.contrast + 100) / 2}%, #6b7280 ${(enhancementOptions.contrast + 100) / 2}%, #6b7280 100%)`
                  }}
                />
              </div>
              
              {/* Saturation Control */}
              <div className="space-y-2">
                <label className="flex justify-between items-center text-sm text-gray-300">
                  <span>Saturation</span>
                  <span className="text-yellow-400 font-mono">{enhancementOptions.saturation}</span>
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={enhancementOptions.saturation}
                  onChange={(e) => setEnhancementOptions(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                  disabled={!canPerformOperation}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #374151 0%, #374151 ${(enhancementOptions.saturation + 100) / 2}%, #6b7280 ${(enhancementOptions.saturation + 100) / 2}%, #6b7280 100%)`
                  }}
                />
              </div>
              
              {/* Sharpen Control */}
              <div className="space-y-2">
                <label className="flex justify-between items-center text-sm text-gray-300">
                  <span>Sharpen</span>
                  <span className="text-yellow-400 font-mono">{enhancementOptions.sharpen}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={enhancementOptions.sharpen}
                  onChange={(e) => setEnhancementOptions(prev => ({ ...prev, sharpen: parseInt(e.target.value) }))}
                  disabled={!canPerformOperation}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #374151 0%, #374151 ${enhancementOptions.sharpen}%, #6b7280 ${enhancementOptions.sharpen}%, #6b7280 100%)`
                  }}
                />
              </div>
              
              {/* Quality Control */}
              <div className="space-y-2">
                <label className="flex justify-between items-center text-sm text-gray-300">
                  <span>Quality</span>
                  <span className="text-yellow-400 font-mono">{enhancementOptions.quality}</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={enhancementOptions.quality}
                  onChange={(e) => setEnhancementOptions(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                  disabled={!canPerformOperation}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #374151 0%, #374151 ${enhancementOptions.quality}%, #6b7280 ${enhancementOptions.quality}%, #6b7280 100%)`
                  }}
                />
              </div>
              
              {/* Reset and Apply Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEnhancementOptions({
                    blur: 0,
                    quality: 90,
                    format: 'auto' as 'jpg' | 'png' | 'webp' | 'auto',
                    brightness: 0,
                    contrast: 0,
                    saturation: 0,
                    sharpen: 0
                  })}
                  disabled={!canPerformOperation}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
            </button>
            
            <button
              type="button"
              onClick={() => handleEnhancement(false)}
              disabled={!canPerformOperation}
                  className="flex-2 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
            >
              {isOperationInProgress ? (
                <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                      <Zap className="w-4 h-4" />
                      Apply
                </>
              )}
            </button>
              </div>
            </div>
          </div>
        </div>

        {/* Background Removal */}
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-medium text-white">Background Removal</h3>
          </div>
          
          <button
            type="button"
            onClick={handleBackgroundRemoval}
            disabled={!canPerformOperation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
          >
            {isOperationInProgress ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Remove Background
              </>
            )}
          </button>
        </div>
        
        {/* Rotate & Flip */}
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <RotateCw className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-medium text-white">Rotate & Flip</h3>
          </div>
          
          <div className="space-y-3">
            {/* Rotation Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRotate(90)}
                disabled={!canPerformOperation}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
              >
                <RotateCw className="w-5 h-5" />
                <span className="text-xs">90°</span>
              </button>
              <button
                type="button"
                onClick={() => handleRotate(180)}
                disabled={!canPerformOperation}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
              >
                <RotateCw className="w-5 h-5" />
                <span className="text-xs">180°</span>
              </button>
              <button
                type="button"
                onClick={() => handleRotate(270)}
                disabled={!canPerformOperation}
                className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="text-xs">270°</span>
              </button>
            </div>
            
            {/* Flip Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFlip('h')}
                disabled={!canPerformOperation}
                className="flex items-center justify-center gap-2 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
              >
                <FlipHorizontal className="w-5 h-5" />
                <span className="text-sm">Flip H</span>
              </button>
              <button
                type="button"
                onClick={() => handleFlip('v')}
                disabled={!canPerformOperation}
                className="flex items-center justify-center gap-2 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
              >
                <FlipVertical className="w-5 h-5" />
                <span className="text-sm">Flip V</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Crop */}
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Crop className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-medium text-white">Crop</h3>
          </div>
          
          <div className="space-y-3">
            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Aspect Ratio</label>
              <select
                value={cropSettings.aspectRatio}
                onChange={(e) => setCropSettings(prev => ({ 
                  ...prev, 
                  aspectRatio: e.target.value as typeof prev.aspectRatio 
                }))}
                disabled={!canPerformOperation}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="original">Select Aspect Ratio</option>
                <option value="1:1">Square (1:1)</option>
                <option value="4:3">Standard (4:3)</option>
                <option value="16:9">Widescreen (16:9)</option>
                <option value="9:16">Portrait (9:16)</option>
              </select>
            </div>
            
            {/* Dimensions */}
            {cropSettings.aspectRatio !== 'original' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Width (px)</label>
                  <input
                    type="number"
                    value={cropSettings.width || ''}
                    onChange={(e) => setCropSettings(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                    disabled={!canPerformOperation}
                    placeholder="Auto"
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Height (px)</label>
                  <input
                    type="number"
                    value={cropSettings.height || ''}
                    onChange={(e) => setCropSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                    disabled={!canPerformOperation}
                    placeholder="Auto"
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}
            
            {/* Apply Crop Button */}
            <button
              type="button"
              onClick={handleCrop}
              disabled={!canPerformOperation || cropSettings.aspectRatio === 'original'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
            >
              <Crop className="w-5 h-5" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Processing Status */}
      <ImageProcessingStatus
        isProcessing={isOperationInProgress}
        processingStatus={processingStatus}
        estimatedTime={estimatedTime}
        elapsedTime={elapsedTime}
        processingType={transformationState.history.find(t => t.processing)?.type === 'background-removal' ? 'background-removal' : 'enhancement'}
        onComplete={() => {
          showNotification('🎉 Image processing completed! You can now apply more transformations.', 'success');
        }}
        onError={() => {
          showNotification('❌ Image processing failed. Please try again.', 'error');
        }}
      />


      {/* Operation Blocking Notice */}
      {!canPerformOperation && !isOperationInProgress && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span className="text-red-800 font-medium">Operation Blocked</span>
          </div>
          <p className="text-sm text-red-700">
            A transformation is currently in progress. Please wait for it to complete before starting a new operation.
          </p>
        </div>
      )}
    </div>
  );
};

export default SingleImageEditor;
