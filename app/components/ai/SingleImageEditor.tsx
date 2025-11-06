'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import { flushSync } from 'react-dom';
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
import {
  extractTransformations,
  extractOriginalPath,
  extractBaseUrl,
  buildTransformationUrl,
  filterTransformations,
  deduplicateTransformations
} from '@/lib/imagekit/url-utils';

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
  | { type: 'CLEAR_ALL_PROCESSING' } // ✅ New action to clear all processing states
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
    case 'CLEAR_ALL_PROCESSING':
      // ✅ Clear all processing states for async operations (background-removal, enhancement)
      // Note: This should be called AFTER the current transformation is updated
      // It clears orphaned processing states, not the one that just completed
      return {
        ...state,
        history: state.history.map(t => {
          // Only clear transformations that are still marked as processing
          // If they were already updated to completed=true, leave them alone
          if (t.processing && (t.type === 'background-removal' || t.type === 'enhancement')) {
            console.warn(`⚠️ Clearing orphaned processing transformation: ${t.id}`);
            return { ...t, processing: false, completed: false, applied: false };
          }
          return t;
        })
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

// Extract original URL using utility functions (ensures consistency)
const extractOriginalUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  
  try {
    // Use the utility functions to properly extract original URL
    const baseUrl = extractBaseUrl(imageUrl);
    const originalPath = extractOriginalPath(imageUrl);
    
    if (!baseUrl || !originalPath) {
      // Fallback: if extraction fails, return the URL as-is (might be a non-ImageKit URL)
      return imageUrl;
    }
    
    // Build the original URL without transformations
    return `${baseUrl}/${originalPath}`;
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
  
  // Track the last imageUrl prop to detect actual changes (new uploads)
  const lastImageUrlPropRef = useRef<string>(imageUrl);
  
  // Memoized filename extraction
  const currentFilename = useMemo(() => extractFilename(currentWorkingUrl), [currentWorkingUrl]);
  const newFilename = useMemo(() => extractFilename(imageUrl), [imageUrl]);

  // Check if URL contains async operations (background removal) that need direct img tag
  // ✅ CRITICAL: Calculate inline instead of useMemo to avoid stale closures
  // This ensures it's always calculated with the latest currentWorkingUrl value
  const checkHasAsyncOperations = (url: string | null): boolean => {
    if (!url) return false;
    // Check for background removal parameters
    // Decode URL to handle encoded characters
    try {
      const decodedUrl = decodeURIComponent(url);
      const hasBgRemoval = decodedUrl.includes('e-bgremove') || 
                           /bg-(transparent|white|black|removed)/.test(decodedUrl) ||
                           url.includes('e-bgremove') ||
                           /bg-(transparent|white|black|removed)/.test(url);
      return hasBgRemoval;
    } catch (e) {
      // If decodeURIComponent fails, check original URL
      return url.includes('e-bgremove') || /bg-(transparent|white|black|removed)/.test(url);
    }
  };
  
  // Calculate inline for current render
  const hasAsyncOperations = checkHasAsyncOperations(currentWorkingUrl);
  
  // Debug log to verify detection
  if (currentWorkingUrl && currentWorkingUrl.includes('e-bgremove')) {
    console.log('🔍 Render-time hasAsyncOperations:', {
      currentWorkingUrl,
      hasAsyncOperations,
      urlIncludes: currentWorkingUrl.includes('e-bgremove')
    });
  }
  
  // Update URLs when imageUrl prop changes (new upload or transformation)
  useEffect(() => {
    if (!imageUrl) return;
    
    // ✅ CRITICAL FIX: Always extract and set originalUrl on first load
    // This ensures originalUrl is correctly set even if imageUrl has transformations
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      lastImageUrlPropRef.current = imageUrl;
      const extractedOriginal = extractOriginalUrl(imageUrl);
      setOriginalUrl(extractedOriginal);
      setCurrentWorkingUrl(imageUrl);
      // Reset image loading state for new image
      setImageLoadingState({
        isLoading: true,
        hasError: false,
        currentUrl: imageUrl,
        previousUrl: null
      });
      return;
    }
    
    // ✅ CRITICAL: Only reset if the imageUrl prop actually changed
    // Compare with the last prop value, not with currentWorkingUrl
    // This prevents resetting when internal state changes but prop stays the same
    const propChanged = lastImageUrlPropRef.current !== imageUrl;
    
    if (propChanged) {
      console.log('📁 New image detected (prop changed), resetting editor state', {
        old: lastImageUrlPropRef.current,
        new: imageUrl
      });
      lastImageUrlPropRef.current = imageUrl;
      
      const newOriginalUrl = extractOriginalUrl(imageUrl);
      setOriginalUrl(newOriginalUrl);
      setCurrentWorkingUrl(imageUrl);
      
      // Reset image loading state when URL changes
      setImageLoadingState(prev => ({
        isLoading: true,
        hasError: false,
        currentUrl: imageUrl,
        previousUrl: prev.currentUrl // Keep previous URL to show while loading
      }));
      
      // Reset transformation history for new image
      dispatch({ type: 'RESET' });
      
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
    } else {
      // ✅ Same imageUrl prop - don't reset anything
      // This preserves processed images after operations
      console.log('📸 Same imageUrl prop, preserving current state');
    }
  }, [imageUrl]);
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
  const activePollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activePollingAbortControllerRef = useRef<AbortController | null>(null);
  
  // ✅ CRITICAL FIX: Use state to track active processing transformation IDs
  // This ensures React re-renders when processing state changes
  const [activeProcessingTransformationIds, setActiveProcessingTransformationIds] = useState<Set<string>>(new Set());
  
  // ✅ CRITICAL: Track image loading state to show loader until image successfully loads
  const [imageLoadingState, setImageLoadingState] = useState<{
    isLoading: boolean;
    hasError: boolean;
    currentUrl: string | null;
    previousUrl: string | null; // Track previous URL to show while loading
  }>({
    isLoading: false,
    hasError: false,
    currentUrl: null,
    previousUrl: null
  });
  
  // ✅ Track if image is rendering (after API success, before browser loads it)
  const [isRenderingImage, setIsRenderingImage] = useState<boolean>(false);
  
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
  
  // Active operation tab
  const [activeOperationTab, setActiveOperationTab] = useState<'enhancement' | 'transform'>('enhancement');
  
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
      // Cleanup function
      if (activePollingCleanupRef.current) {
        activePollingCleanupRef.current();
        activePollingCleanupRef.current = null;
      }
      
      // Also clear interval directly (double safety)
      if (activePollingIntervalRef.current) {
        clearInterval(activePollingIntervalRef.current);
        activePollingIntervalRef.current = null;
      }
      
      // Cancel any in-flight requests
      if (activePollingAbortControllerRef.current) {
        activePollingAbortControllerRef.current.abort();
        activePollingAbortControllerRef.current = null;
      }
    };
  }, []);

  // Memoized computed values
  // ✅ CRITICAL: Include activeProcessingTransformationIds in the check
  // This ensures we catch processing state even if transformationState hasn't updated yet
  const isAnyTransformationInProgress = useMemo(
    () => {
      const historyProcessing = transformationState.history.some(t => t.processing);
      const activeIdsProcessing = activeProcessingTransformationIds.size > 0;
      const result = historyProcessing || activeIdsProcessing;
      
      // ✅ DEBUG: Log state to help diagnose blocking issues
      if (result) {
        console.log('🔍 DEBUG: Transformation still in progress:', {
          historyProcessing,
          activeIdsProcessing,
          activeIds: Array.from(activeProcessingTransformationIds),
          processingHistory: transformationState.history.filter(t => t.processing).map(t => ({ id: t.id, type: t.type, name: t.name }))
        });
      }
      
      return result;
    },
    [transformationState.history, activeProcessingTransformationIds]
  );
  
  // ✅ CRITICAL: canPerformOperation must check ALL blocking conditions
  // Operations are blocked if: isOperationInProgress OR any transformation is processing OR image is loading
  const canPerformOperation = useMemo(
    () => {
      const canPerform = !isOperationInProgress && !isAnyTransformationInProgress && !imageLoadingState.isLoading;
      
      // ✅ DEBUG: Log when operations are blocked
      if (!canPerform) {
        console.log('🔒 DEBUG: Operations blocked:', {
          isOperationInProgress,
          isAnyTransformationInProgress,
          isLoading: imageLoadingState.isLoading,
          activeProcessingIds: Array.from(activeProcessingTransformationIds),
          processingHistory: transformationState.history.filter(t => t.processing).map(t => ({ id: t.id, type: t.type }))
        });
      }
      
      return canPerform;
    },
    [isOperationInProgress, isAnyTransformationInProgress, imageLoadingState.isLoading, activeProcessingTransformationIds, transformationState.history]
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

  // Build chained URL with all completed transformations up to a specific index
  const buildChainedUrl = useCallback((baseUrl: string, transformations: TransformationState[], upToIndex?: number): string => {
    // If upToIndex is provided, only use transformations up to that index
    const transformationsToUse = upToIndex !== undefined 
      ? transformations.slice(0, upToIndex + 1)
      : transformations;
    
    const completedTransformations = transformationsToUse
      .filter(t => t.completed && t.url) // Only use completed transformations with URLs
      .map(t => {
        // For transformations with URLs, extract transformations from the URL
        // For transformations without URLs (synchronous), build from params
        if (t.url) {
          // Extract transformations from the URL
          const transforms = extractTransformations(t.url);
          // Remove metadata params (pr-*, di-*)
          return transforms.filter(tr => !tr.startsWith('pr-') && !tr.startsWith('di-'));
        }
        
        // Fallback: build from params (for synchronous transformations)
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
      .flat()
      .filter(Boolean);
    
    if (completedTransformations.length === 0) return baseUrl;
    
    // Deduplicate transformations to avoid conflicts
    const deduplicated = deduplicateTransformations([], completedTransformations);
    
    // Extract base URL and path
    const baseUrlObj = extractBaseUrl(baseUrl);
    const originalPath = extractOriginalPath(baseUrl);
    
    // Build PATH FORMAT URL (consistent with server)
    const finalParams = [
      ...deduplicated,
      'pr-true'
      // ✅ REMOVED: di-default-placeholder.jpg - Invalid format and can cause ImageKit errors
      // If default image is needed, use: di-<image-path> (without file extension or use full path)
    ];
    
    return buildTransformationUrl(baseUrlObj, originalPath, finalParams);
  }, [enhancementOptions.quality, enhancementOptions.format]);

  // Note: currentWorkingUrl is now managed directly by transformation completion
  // No automatic URL building needed as processed URLs are final

  // ✅ Ref to store pollForCompletion function (defined later)
  const pollForCompletionRef = useRef<((url: string, transformationId: string, type?: 'enhancement' | 'background-removal') => Promise<(() => void) | undefined>) | null>(null);

  // ✅ Helper function to check if URL needs async processing and start polling
  // Note: Uses pollForCompletionRef to avoid circular dependency
  const checkAndStartPollingIfNeeded = useCallback(async (url: string, transformationId?: string): Promise<boolean> => {
    // Check if URL has async operations
    if (!checkHasAsyncOperations(url)) {
      return false; // No async operations, no polling needed
    }
    
    // Check status via API to see if image is ready
    try {
      const endpoint = `/api/ai/background-removal/status?processedUrl=${encodeURIComponent(url)}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success && data.isReady) {
        // Image is ready, no need to poll
        return false;
      } else if (data.success && !data.isReady) {
        // Image is still processing, start polling
        console.log('🔄 URL has async operations and is still processing, starting poll:', url);
        
        // Create a temporary transformation for tracking if none exists
        if (!transformationId) {
          const tempTransformation = addTransformation({
            type: 'background-removal',
            name: 'Processing Image',
            applied: true,
            processing: true,
            completed: false
          });
          
          // Track as actively processing
          setActiveProcessingTransformationIds(prev => new Set(prev).add(tempTransformation.id));
          
          // Start polling with the temp transformation ID
          if (pollForCompletionRef.current) {
            pollForCompletionRef.current(url, tempTransformation.id, 'background-removal').then(cleanup => {
              if (cleanup) {
                activePollingCleanupRef.current = cleanup;
              }
            });
          }
          return true;
        } else {
          // Use existing transformation ID
          if (pollForCompletionRef.current) {
            pollForCompletionRef.current(url, transformationId, 'background-removal').then(cleanup => {
              activePollingCleanupRef.current = cleanup || null;
            });
          }
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking async operation status:', error);
      // If check fails, don't start polling (might be a real error)
      return false;
    }
    
    return false;
  }, [checkHasAsyncOperations, addTransformation, setActiveProcessingTransformationIds]);

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
    
    // ✅ Track this transformation as actively processing
    setActiveProcessingTransformationIds(prev => new Set(prev).add(transformation.id));

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
        // ✅ CRITICAL: Handle response structure safely
        // API returns: { success: true, data: { data: { ... } } }
        // safeFetchJson wraps: { success: true, data: <API_RESPONSE> }
        // So final structure: { success: true, data: { success: true, data: { data: { ... } } } }
        const responseData = result.data?.data?.data || result.data?.data;
        if (!responseData || !responseData.enhancedUrl) {
          throw new Error('Invalid response structure: missing enhancedUrl');
        }
        const data = responseData;
        const enhancedUrl = data.enhancedUrl;
        
        if (data.isAsync) {
          setProcessingStatus(data.status);
          setEstimatedTime(data.estimatedTime);
          showNotification(data.message, 'info');
          
          // Start polling for completion
          // ✅ Keep isOperationInProgress = true during polling
          // Polling will set it to false when complete or on error
          pollForCompletion(enhancedUrl, transformation.id).then(cleanup => {
            activePollingCleanupRef.current = cleanup;
          });
        } else {
          // ✅ Remove from active processing set
          setActiveProcessingTransformationIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(transformation.id);
            return newSet;
          });
          
          // Immediate processing - safe to reset immediately
          updateTransformation(transformation.id, {
            processing: false,
            completed: true,
            url: enhancedUrl
          });
          // Update the current working URL to the processed URL
          setCurrentWorkingUrl(enhancedUrl);
          onImageProcessed(enhancedUrl);
          showNotification('Image enhanced successfully!', 'success');
          setIsOperationInProgress(false);
        }
      } else {
        // ✅ Remove from active processing set
        setActiveProcessingTransformationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(transformation.id);
          return newSet;
        });
        
        updateTransformation(transformation.id, {
          processing: false,
          applied: false
        });
        showNotification(result.error || 'Enhancement failed', 'error');
        setIsOperationInProgress(false);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      // ✅ Remove from active processing set
      setActiveProcessingTransformationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(transformation.id);
        return newSet;
      });
      
      updateTransformation(transformation.id, {
        processing: false,
        applied: false
      });
      showNotification('Failed to enhance image', 'error');
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
    
    // ✅ Track this transformation as actively processing
    setActiveProcessingTransformationIds(prev => new Set(prev).add(transformation.id));

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
        // ✅ CRITICAL: Handle response structure safely
        // API returns: { success: true, data: { ... } }
        // safeFetchJson wraps: { success: true, data: <API_RESPONSE> }
        // So final structure: { success: true, data: { success: true, data: { ... } } }
        const responseData = result.data?.data || result.data;
        if (!responseData || !responseData.processedUrl) {
          throw new Error('Invalid response structure: missing processedUrl');
        }
        const data = responseData;
        
        if (data.isAsync) {
          setProcessingStatus(data.status);
          setEstimatedTime(data.estimatedTime);
          showNotification(data.message, 'info');
          
          // Start polling for completion
          // ✅ Keep isOperationInProgress = true during polling
          // Polling will set it to false when complete or on error
          pollForCompletion(data.processedUrl, transformation.id, 'background-removal').then(cleanup => {
            activePollingCleanupRef.current = cleanup;
          });
        } else {
          // ✅ Remove from active processing set
          setActiveProcessingTransformationIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(transformation.id);
            return newSet;
          });
          
          // Immediate processing - safe to reset immediately
          updateTransformation(transformation.id, {
            processing: false,
            completed: true,
            url: data.processedUrl
          });
          setCurrentWorkingUrl(data.processedUrl);
          onImageProcessed(data.processedUrl);
          showNotification('🎉 Background removed successfully!', 'success');
          setIsOperationInProgress(false);
        }
      } else {
        // ✅ Remove from active processing set
        setActiveProcessingTransformationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(transformation.id);
          return newSet;
        });
        
        updateTransformation(transformation.id, {
          processing: false,
          applied: false
        });
        showNotification(result.error || 'Background removal failed', 'error');
        setIsOperationInProgress(false);
      }
    } catch (error) {
      console.error('Background removal error:', error);
      // ✅ Remove from active processing set
      setActiveProcessingTransformationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(transformation.id);
        return newSet;
      });
      
      updateTransformation(transformation.id, {
        processing: false,
        applied: false
      });
      showNotification('Failed to remove background', 'error');
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
    
    // Extract existing transformations (handles both QUERY and PATH formats)
    const existingTransforms = extractTransformations(currentWorkingUrl);
    
    // ✅ Use deduplication to properly merge transformations
    // This ensures no duplicate parameters (e.g., multiple q-*, f-*, etc.)
    const transformationParams = deduplicateTransformations(
      existingTransforms,
      [
        `rt-${newRotation}`, // New rotation (will replace any existing rt-*)
        'pr-true'
        // ✅ REMOVED: di-default-placeholder.jpg - Invalid format
      ]
    );
    
    // Extract base URL and path
    const baseUrl = extractBaseUrl(currentWorkingUrl);
    const originalPath = extractOriginalPath(currentWorkingUrl);
    
    // Build PATH FORMAT URL (consistent with server)
    const rotatedUrl = buildTransformationUrl(baseUrl, originalPath, transformationParams);
    
    // ✅ CRITICAL: Set loading state FIRST to block operations and show loader
    // This must happen before URL is set to ensure loader shows
    const previousUrl = currentWorkingUrl;
    setImageLoadingState({
      isLoading: true,
      hasError: false,
      currentUrl: rotatedUrl, // The URL we're about to load
      previousUrl: previousUrl // Current URL to show while loading
    });
    
    const transformation = addTransformation({
      type: 'rotate',
      name: `Rotate ${degrees}°`,
      applied: true,
      processing: false,
      completed: true,
      url: rotatedUrl,
      params: { rotation: newRotation }
    });
    
    // ✅ Check if rotated URL has async operations and verify before setting
    const hasAsyncOps = checkHasAsyncOperations(rotatedUrl);
    if (hasAsyncOps) {
      // Check if image is ready before setting URL
      checkAndStartPollingIfNeeded(rotatedUrl, transformation.id).then(startedPolling => {
        if (!startedPolling) {
          // Image is ready, set URL immediately (loader will hide on image load)
          setCurrentWorkingUrl(rotatedUrl);
          onImageProcessed(rotatedUrl);
          showNotification(`Image rotated ${degrees}°`, 'success');
        } else {
          // Polling started, URL will be set when ready (loader stays until polling completes)
          showNotification(`Image rotated ${degrees}°. Processing...`, 'info');
        }
      });
    } else {
      // No async operations, set URL immediately (loader will hide on image load)
      setCurrentWorkingUrl(rotatedUrl);
      onImageProcessed(rotatedUrl);
      showNotification(`Image rotated ${degrees}°`, 'success');
    }
  }, [canPerformOperation, currentRotation, currentWorkingUrl, addTransformation, onImageProcessed, showNotification, checkHasAsyncOperations, checkAndStartPollingIfNeeded]);

  // Handle flip
  const handleFlip = useCallback((direction: 'v' | 'h') => {
    if (!canPerformOperation) {
      showNotification('Please wait for the current operation to complete', 'warning');
      return;
    }

    // Extract existing transformations (handles both QUERY and PATH formats)
    const existingTransforms = extractTransformations(currentWorkingUrl);
    
    // ✅ Use deduplication to properly merge transformations
    // This ensures no duplicate parameters (e.g., multiple q-*, f-*, etc.)
    const transformationParams = deduplicateTransformations(
      existingTransforms,
      [
        `fl-${direction}`, // New flip (will replace any existing fl-*)
        'pr-true'
        // ✅ REMOVED: di-default-placeholder.jpg - Invalid format
      ]
    );
    
    // Extract base URL and path
    const baseUrl = extractBaseUrl(currentWorkingUrl);
    const originalPath = extractOriginalPath(currentWorkingUrl);
    
    // Build PATH FORMAT URL (consistent with server)
    const flippedUrl = buildTransformationUrl(baseUrl, originalPath, transformationParams);
    
    // ✅ CRITICAL: Set loading state FIRST to block operations and show loader
    // This must happen before URL is set to ensure loader shows
    const previousUrl = currentWorkingUrl;
    setImageLoadingState({
      isLoading: true,
      hasError: false,
      currentUrl: flippedUrl, // The URL we're about to load
      previousUrl: previousUrl // Current URL to show while loading
    });
    
    const transformation = addTransformation({
      type: 'flip',
      name: direction === 'h' ? 'Flip Horizontal' : 'Flip Vertical',
      applied: true,
      processing: false,
      completed: true,
      url: flippedUrl,
      params: { flip: direction }
    });
    
    // ✅ Check if flipped URL has async operations and verify before setting
    const hasAsyncOps = checkHasAsyncOperations(flippedUrl);
    if (hasAsyncOps) {
      // Check if image is ready before setting URL
      checkAndStartPollingIfNeeded(flippedUrl, transformation.id).then(startedPolling => {
        if (!startedPolling) {
          // Image is ready, set URL immediately (loader will hide on image load)
          setCurrentWorkingUrl(flippedUrl);
          onImageProcessed(flippedUrl);
          showNotification(`Image flipped ${direction === 'h' ? 'horizontally' : 'vertically'}`, 'success');
        } else {
          // Polling started, URL will be set when ready (loader stays until polling completes)
          showNotification(`Image flipped ${direction === 'h' ? 'horizontally' : 'vertically'}. Processing...`, 'info');
        }
      });
    } else {
      // No async operations, set URL immediately (loader will hide on image load)
      setCurrentWorkingUrl(flippedUrl);
      onImageProcessed(flippedUrl);
      showNotification(`Image flipped ${direction === 'h' ? 'horizontally' : 'vertically'}`, 'success');
    }
  }, [canPerformOperation, currentWorkingUrl, addTransformation, onImageProcessed, showNotification, checkHasAsyncOperations, checkAndStartPollingIfNeeded]);

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
    
    if (cropSettings.aspectRatio === 'custom') {
      // ✅ For custom aspect ratio, use user-provided dimensions
      if (!width || !height || width <= 0 || height <= 0) {
        showNotification('Please enter valid width and height for custom crop', 'warning');
        return;
      }
      // Use user-provided dimensions as-is
    } else if (cropSettings.aspectRatio === '1:1') {
      // ✅ Square: Use the larger of width/height, or default to 800
      const base = Math.max(width || 800, height || 800);
      width = height = base;
    } else if (cropSettings.aspectRatio === '4:3') {
      // ✅ 4:3 aspect ratio (landscape)
      width = width || 800;
      height = Math.round(width * 3 / 4);
    } else if (cropSettings.aspectRatio === '16:9') {
      // ✅ 16:9 aspect ratio (widescreen landscape)
      width = width || 1600;
      height = Math.round(width * 9 / 16);
    } else if (cropSettings.aspectRatio === '9:16') {
      // ✅ 9:16 aspect ratio (portrait) - width is 9 parts, height is 16 parts
      // For portrait, we should use height as base if provided, otherwise use width
      if (height && height > 0) {
        // User provided height, calculate width from height
        width = Math.round(height * 9 / 16);
      } else {
        // Use width as base, calculate height
      width = width || 900;
      height = Math.round(width * 16 / 9);
      }
    }
    
    // ✅ Validate calculated dimensions
    if (width <= 0 || height <= 0) {
      showNotification('Invalid crop dimensions. Please check your settings.', 'error');
      return;
    }

    // Extract existing transformations (handles both QUERY and PATH formats)
    const existingTransforms = extractTransformations(currentWorkingUrl);
    
    // ✅ Use deduplication to properly merge transformations
    // This ensures no duplicate parameters (e.g., multiple q-*, f-*, w-*, h-*, etc.)
    const transformationParams = deduplicateTransformations(
      existingTransforms,
      [
        `w-${width}`,      // New width (will replace any existing w-*)
        `h-${height}`,     // New height (will replace any existing h-*)
        'c-force',         // Crop mode (will replace any existing c-*)
        'cm-extract',      // Crop method (will replace any existing cm-*)
        'fo-auto',         // Focus (will replace any existing fo-*)
        'pr-true'
        // ✅ REMOVED: di-default-placeholder.jpg - Invalid format and can cause ImageKit "UNIDENTIFIED" errors
      ]
    );
    
    // Extract base URL and path
    const baseUrl = extractBaseUrl(currentWorkingUrl);
    const originalPath = extractOriginalPath(currentWorkingUrl);
    
    // Build PATH FORMAT URL (consistent with server)
    const croppedUrl = buildTransformationUrl(baseUrl, originalPath, transformationParams);
    
    // ✅ CRITICAL: Set loading state FIRST to block operations and show loader
    // This must happen before URL is set to ensure loader shows
    const previousUrl = currentWorkingUrl;
    setImageLoadingState({
      isLoading: true,
      hasError: false,
      currentUrl: croppedUrl, // The URL we're about to load
      previousUrl: previousUrl // Current URL to show while loading
    });
    
    const transformation = addTransformation({
      type: 'crop',
      name: cropSettings.aspectRatio === 'custom' 
        ? `Custom Crop (${width}×${height}px)` 
        : `Crop ${cropSettings.aspectRatio} (${width}×${height}px)`,
      applied: true,
      processing: false,
      completed: true,
      url: croppedUrl,
      params: { width, height, aspectRatio: cropSettings.aspectRatio }
    });
    
    // ✅ Check if cropped URL has async operations and verify before setting
    const hasAsyncOps = checkHasAsyncOperations(croppedUrl);
    if (hasAsyncOps) {
      // Check if image is ready before setting URL
      checkAndStartPollingIfNeeded(croppedUrl, transformation.id).then(startedPolling => {
        if (!startedPolling) {
          // Image is ready, set URL immediately (loader will hide on image load)
          setCurrentWorkingUrl(croppedUrl);
          onImageProcessed(croppedUrl);
          showNotification(
            cropSettings.aspectRatio === 'custom' 
              ? `Image cropped to custom size: ${width}×${height}px` 
              : `Image cropped to ${cropSettings.aspectRatio} (${width}×${height}px)`, 
            'success'
          );
        } else {
          // Polling started, URL will be set when ready (loader stays until polling completes)
          showNotification(
            cropSettings.aspectRatio === 'custom' 
              ? `Image cropped to custom size: ${width}×${height}px. Processing...` 
              : `Image cropped to ${cropSettings.aspectRatio} (${width}×${height}px). Processing...`, 
            'info'
          );
        }
      });
    } else {
      // No async operations, set URL immediately (loader will hide on image load)
      setCurrentWorkingUrl(croppedUrl);
      onImageProcessed(croppedUrl);
      showNotification(
        cropSettings.aspectRatio === 'custom' 
          ? `Image cropped to custom size: ${width}×${height}px` 
          : `Image cropped to ${cropSettings.aspectRatio} (${width}×${height}px)`, 
        'success'
      );
    }
  }, [canPerformOperation, cropSettings, currentWorkingUrl, addTransformation, onImageProcessed, showNotification, checkHasAsyncOperations, checkAndStartPollingIfNeeded]);

  // Poll for completion
  const pollForCompletion = useCallback(async (url: string, transformationId: string, type: 'enhancement' | 'background-removal' = 'enhancement') => {
    // ✅ CRITICAL: Cancel any existing polling FIRST (prevents race condition)
    if (activePollingCleanupRef.current) {
      activePollingCleanupRef.current();
      activePollingCleanupRef.current = null;
    }
    if (activePollingIntervalRef.current) {
      clearInterval(activePollingIntervalRef.current);
      activePollingIntervalRef.current = null;
    }
    if (activePollingAbortControllerRef.current) {
      activePollingAbortControllerRef.current.abort();
      activePollingAbortControllerRef.current = null;
    }

    // ✅ Create new AbortController for this polling session
    const abortController = new AbortController();
    activePollingAbortControllerRef.current = abortController;

    const maxAttempts = 20;
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    let intervalId: NodeJS.Timeout | null = null;
    
    // ✅ CRITICAL: Track if a poll request is currently in-flight
    // This prevents concurrent requests when polling interval is shorter than request duration
    let isPollRequestInFlight = false;
    
    const poll = async () => {
      // ✅ Check if aborted
      if (abortController.signal.aborted) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
          activePollingIntervalRef.current = null;
        }
        isPollRequestInFlight = false;
        return;
      }
      
      // ✅ CRITICAL: Prevent concurrent requests
      // If a previous request is still in-flight, skip this poll cycle
      if (isPollRequestInFlight) {
        console.log('⏭️ Skipping poll - previous request still in-flight');
        return;
      }
      
      // Mark that a request is starting
      isPollRequestInFlight = true;
      
      try {
        const endpoint = type === 'background-removal' 
          ? `/api/ai/background-removal/status?processedUrl=${encodeURIComponent(url)}`
          : `/api/ai/image-enhancement/status?enhancedUrl=${encodeURIComponent(url)}`;
        
        // ✅ Pass abort signal to fetch
        const response = await fetch(endpoint, {
          signal: abortController.signal
        });
        
        if (abortController.signal.aborted) return;
        
        const data = await response.json();
        
        // ✅ Reset error counter on success
        if (data.success) {
          consecutiveErrors = 0;
        }
        
        // ✅ CRITICAL: Handle case where success: true but isReady: false (still processing)
        // This means the image is being processed by ImageKit, so we should continue polling
        if (data.success && !data.isReady && data.status === 'processing') {
          // ✅ Mark request as complete so next poll cycle can run
          isPollRequestInFlight = false;
          
          // Log status for debugging
          console.log('🔄 Image still processing, continuing to poll...', {
            status: data.status,
            message: data.message,
            attempt: attempts + 1,
            maxAttempts
          });
          
          // Continue polling - don't return, let the code fall through to increment attempts
          // The interval will continue and poll again
        }
        
        // ✅ Handle permanent errors (NEW - better error handling)
        if (!data.success && data.status === 'error') {
          // ✅ Mark request as complete
          isPollRequestInFlight = false;
          
          // ✅ CRITICAL: Stop polling and clear all state on permanent error
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            activePollingIntervalRef.current = null;
          }
          
          // ✅ Abort controller to prevent any further requests
          abortController.abort();
          
          // ✅ CRITICAL: Clear ALL state in flushSync to ensure controls unfreeze
          flushSync(() => {
            // Remove from active processing set
            setActiveProcessingTransformationIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(transformationId);
              return newSet;
            });
            
            // Update transformation state
          updateTransformation(transformationId, {
            processing: false,
            applied: false
          });
          
            // Reset operation state
          setIsOperationInProgress(false);
          });
          
          showNotification(data.message || 'Processing failed permanently. Please try again.', 'error');
          return;
        }
        
        if (data.success && data.isReady) {
          // ✅ CRITICAL: Mark request as complete FIRST
          isPollRequestInFlight = false;
          
          // ✅ CRITICAL: Stop polling IMMEDIATELY when image is ready
          // This must happen BEFORE any state updates to prevent race conditions
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            activePollingIntervalRef.current = null;
          }
          
          // ✅ Abort any in-flight requests
          abortController.abort();
          
          // ✅ Clear cleanup reference to prevent any further polling
          activePollingCleanupRef.current = null;
          
          // Handle both 'processedUrl' (background removal) and 'enhancedUrl' (enhancement)
          let finalProcessedUrl = data.processedUrl || data.enhancedUrl || url;
          
          // ✅ CRITICAL: Add cache-busting parameter to force browser to reload image
          // This ensures the browser doesn't use cached version even if URL looks similar
          // Only add if URL doesn't already have query params (ImageKit uses path params)
          try {
            const urlObj = new URL(finalProcessedUrl);
            // Only add cache-busting if no existing query params
            if (!urlObj.search) {
              urlObj.searchParams.set('_refresh', Date.now().toString());
              finalProcessedUrl = urlObj.toString();
            } else {
              // Add to existing params
              urlObj.searchParams.set('_refresh', Date.now().toString());
              finalProcessedUrl = urlObj.toString();
            }
          } catch (e) {
            // Invalid URL format, use as-is
            console.warn('Invalid URL format for cache-busting:', finalProcessedUrl);
          }
          
          console.log('🔍 DEBUG: Status API response:', {
            originalUrl: url,
            finalProcessedUrl,
            dataProcessedUrl: data.processedUrl,
            dataEnhancedUrl: data.enhancedUrl,
            isReady: data.isReady,
            success: data.success
          });
          
          // ✅ CRITICAL FIX: Update transformation state IMMEDIATELY (before HEAD fetch)
          // This ensures the loader condition (which checks transformationState.history) 
          // gets updated immediately, causing React to re-render and hide the loader
          // The HEAD fetch is only for URL verification, not for state updates
          // Use flushSync to force immediate synchronous state update
          
          // ✅ CRITICAL: Get fresh state BEFORE updating to check if transformation exists
          const transformationIndex = transformationState.history.findIndex(t => t.id === transformationId);
          const transformationExists = transformationIndex !== -1;
          const currentTransformationBeforeUpdate = transformationState.history[transformationState.index];
          const isTransformationCurrentBeforeUpdate = currentTransformationBeforeUpdate?.id === transformationId;
          
          console.log('🔍 DEBUG: Transformation check:', {
            transformationId,
            transformationIndex,
            transformationExists,
            currentTransformationId: currentTransformationBeforeUpdate?.id,
            isTransformationCurrent: isTransformationCurrentBeforeUpdate,
            currentIndex: transformationState.index,
            historyLength: transformationState.history.length
          });
          
          // ✅ CRITICAL: Determine URL update strategy BEFORE flushSync to minimize reflows
          let urlToSet: string | null = null;
          
          console.log('🔍 DEBUG: URL update decision:', {
            transformationExists,
            transformationIndex,
            currentIndex: transformationState.index,
            condition1: transformationExists,
            condition2: transformationIndex >= 0,
            condition3: transformationIndex <= transformationState.index,
            allConditions: transformationExists && transformationIndex >= 0 && transformationIndex <= transformationState.index
          });
          
          // ✅ CRITICAL FIX: If transformation not found (history was reset), still update URL
          // The API confirmed the image is ready, so we should show it even if history was cleared
          if (transformationExists && transformationIndex >= 0 && transformationIndex <= transformationState.index) {
            if (transformationIndex === transformationState.index) {
              // ✅ CASE 1: Transformation is at current index - use processed URL directly
              urlToSet = finalProcessedUrl;
              console.log('✅ CASE 1: Transformation at current index, using processed URL directly:', urlToSet);
            } else {
              // ✅ CASE 2: Transformation is before current index - rebuild from history
              // The transformation at current index has a URL, but it was built without this async result
              // Solution: Rebuild from history with the updated async transformation URL
              // Use the original processedUrl (without cache-busting) for storage, then add cache-busting to the final URL
              const processedUrlWithoutCache = data.processedUrl || data.enhancedUrl || url;
              const updatedHistoryForBuilding = transformationState.history.map((t, idx) => 
                idx === transformationIndex ? { ...t, url: processedUrlWithoutCache, completed: true } : t
              );
              const rebuiltUrl = buildChainedUrl(originalUrl, updatedHistoryForBuilding, transformationState.index);
              
              // Add cache-busting to rebuilt URL
              try {
                const urlObj = new URL(rebuiltUrl);
                urlObj.searchParams.set('_refresh', Date.now().toString());
                urlToSet = urlObj.toString();
              } catch (e) {
                urlToSet = rebuiltUrl;
              }
              
              console.log('✅ CASE 2: Transformation before current index, rebuilding from history:', {
                processedUrlWithoutCache,
                rebuiltUrl,
                finalUrl: urlToSet
              });
            }
          } else if (!transformationExists) {
            // ✅ CASE 3: Transformation not found in history (history was reset/cleared)
            // But API confirmed image is ready - update URL directly so user can see the result
            urlToSet = finalProcessedUrl;
            console.warn('⚠️ Transformation not found in history (history was reset), but API confirmed ready - updating URL directly:', urlToSet);
          } else {
            console.warn('⚠️ URL update skipped - conditions not met:', {
              transformationExists,
              transformationIndex,
              currentIndex: transformationState.index,
              reason: transformationIndex < 0 ? 'transformation index invalid'
                : transformationIndex > transformationState.index ? 'transformation was undone'
                : 'unknown'
            });
          }
          
          // ✅ CRITICAL: Update all state in a single flushSync to minimize forced reflows
          // Store the original URL (without cache-busting) in transformation history
          const processedUrlForStorage = data.processedUrl || data.enhancedUrl || url;
          
          // ✅ CRITICAL: Update ALL state in a single flushSync to ensure controls unfreeze
          // This includes: activeProcessingTransformationIds, transformationState, isOperationInProgress, currentWorkingUrl
          // All updates must happen together so React can properly recalculate canPerformOperation
          flushSync(() => {
            // ✅ STEP 1: Remove from active processing set FIRST (ensures loading overlay disappears)
            setActiveProcessingTransformationIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(transformationId);
              return newSet;
            });
            
            // ✅ STEP 2: Update transformation state (marks as completed, not processing)
            // This ensures isAnyTransformationInProgress becomes false
            
            // ✅ CRITICAL FIX: First, update the CURRENT transformation if it exists
            // This marks it as completed BEFORE we clear other processing transformations
            if (transformationExists) {
              const transformation = transformationState.history[transformationIndex];
              console.log(`✅ Updating transformation ${transformationId}:`, {
                id: transformation.id,
                type: transformation.type,
                name: transformation.name,
                wasProcessing: transformation.processing,
                wasCompleted: transformation.completed
              });
              
              dispatch({ 
                type: 'UPDATE', 
                id: transformationId, 
                updates: {
                  processing: false,
                  completed: true,
                  url: processedUrlForStorage
                }
              });
              console.log(`✅ Marked transformation ${transformationId} (${transformation.name}) as completed`);
            } else {
              console.warn('⚠️ Transformation not in history, cannot mark as completed', {
                transformationId,
                historyIds: transformationState.history.map(t => t.id),
                historyLength: transformationState.history.length
              });
            }
            
            // ✅ THEN clear ALL remaining processing transformations (orphaned ones)
            // This clears any stuck states but leaves the completed one alone
            const processingCount = transformationState.history.filter(t => t.processing).length;
            console.log(`🧹 Clearing orphaned processing transformations (${processingCount} found)`);
            dispatch({ type: 'CLEAR_ALL_PROCESSING' });
            
            // ✅ STEP 3: Reset operation in progress flag (ensures isOperationInProgress is false)
            // This is critical for canPerformOperation to become true
            setIsOperationInProgress(false);
            
            // ✅ STEP 4: Update current working URL (shows the processed image)
            if (urlToSet !== null) {
              console.log('🔄 Setting currentWorkingUrl to:', urlToSet);
              setCurrentWorkingUrl(urlToSet);
              
              // ✅ CRITICAL: Reset image loading state when URL changes
              // This ensures loader shows until new image loads
              setImageLoadingState(prev => ({
                isLoading: true,
                hasError: false,
                currentUrl: urlToSet,
                previousUrl: prev.currentUrl // Keep previous URL to show while loading
              }));
              
              // ✅ NEW: Set rendering flag to show "Rendering image..." message
              // This indicates API confirmed success but browser is still loading the image
              setIsRenderingImage(true);
            } else {
              console.warn('⚠️ urlToSet is null, not updating currentWorkingUrl');
            }
          });
          
          console.log('✅ All state updated in flushSync - controls should now be unfrozen');
          
          // ✅ CRITICAL: Immediate verification after flushSync
          // Note: We can't check state in setTimeout because closures will have stale values
          // Instead, we log what we just set and trust flushSync worked
          console.log('✅ State update verification:', {
            transformationId,
            transformationExists,
            wasRemovedFromActiveSet: true, // We just removed it
            wasMarkedAsCompleted: transformationExists, // We just updated it
            wasOperationInProgressCleared: true, // We just cleared it
            urlUpdated: urlToSet !== null,
            // ✅ Also log any remaining processing transformations for debugging
            remainingProcessingCount: transformationState.history.filter(t => t.processing).length
          });
          
          // ✅ Note: We can't check state here because of closure staleness
          // The CLEAR_ALL_PROCESSING action should have cleared all processing states
          // If there are still issues, the debug logs will show them on next render
          
          // ✅ Handle callbacks and notifications AFTER flushSync (non-blocking)
          if (urlToSet !== null) {
            onImageProcessed(urlToSet);
            showNotification('🎉 Processing completed successfully!', 'success');
            console.log('✅ URL updated successfully:', urlToSet);
            console.log('✅ Transformation index:', transformationIndex, 'Current index:', transformationState.index);
          } else {
            // Transformation was undone or removed - don't update URL
            console.log('⚠️ Transformation not in history or was undone, skipping URL update', {
              transformationExists,
              transformationIndex,
              currentIndex: transformationState.index
            });
            showNotification('🎉 Processing completed!', 'success');
          }
          
          // ✅ Optional: Verify URL is accessible (non-blocking, for debugging)
          // This is async and doesn't block the image update
          setTimeout(() => {
            // Get fresh state after update to verify
            const freshState = transformationState.history.find(t => t.id === transformationId);
            if (!freshState || !freshState.completed) {
              // Transformation was removed or update failed
              return;
            }
            
            // Check if this transformation is still at the current index (not undone)
            const currentTransformation = transformationState.history[transformationState.index];
            const isTransformationCurrent = currentTransformation?.id === transformationId;
            
            // Only verify if transformation is still current
            if (isTransformationCurrent) {
              // Test if URL is accessible (for logging/debugging only)
              fetch(finalProcessedUrl, { method: 'HEAD', mode: 'no-cors' })
                .then(() => {
                  // URL is accessible - already updated above
                  console.log('✅ Processed image URL verified:', finalProcessedUrl);
                })
                .catch(() => {
                  // CORS or network issue - this is expected for ImageKit URLs
                  // URL is already set above, image will load in browser
                  console.log('⚠️ HEAD request failed (expected for ImageKit), but URL is set:', finalProcessedUrl);
                });
            }
          }, 0);
          return;
        }
        
        // ✅ Track consecutive errors
        if (!data.success) {
          consecutiveErrors++;
          if (consecutiveErrors >= maxConsecutiveErrors) {
            // Too many consecutive errors = permanent failure
            // ✅ Mark request as complete
            isPollRequestInFlight = false;
            
            // ✅ CRITICAL: Stop polling and clear all state
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
              activePollingIntervalRef.current = null;
            }
            
            // ✅ Abort controller
            abortController.abort();
            
            // ✅ CRITICAL: Clear ALL state in flushSync to ensure controls unfreeze
            flushSync(() => {
              // Remove from active processing set
              setActiveProcessingTransformationIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(transformationId);
                return newSet;
              });
              
              // Update transformation state
            updateTransformation(transformationId, {
              processing: false,
              applied: false
            });
            
              // Reset operation state
            setIsOperationInProgress(false);
            });
            
            showNotification('Processing failed after multiple attempts. Please try again.', 'error');
            return;
          }
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          // ✅ Mark request as complete
          isPollRequestInFlight = false;
          
          // ✅ CRITICAL: Stop polling and clear all state on timeout
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            activePollingIntervalRef.current = null;
          }
          
          // ✅ Abort controller
          abortController.abort();
          
          // ✅ CRITICAL: Clear ALL state in flushSync to ensure controls unfreeze
          flushSync(() => {
            // Remove from active processing set
            setActiveProcessingTransformationIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(transformationId);
              return newSet;
            });
            
            // Update transformation state
          updateTransformation(transformationId, {
            processing: false,
            applied: false
          });
            
            // Reset operation state
          setIsOperationInProgress(false);
          });
          
          showNotification('Processing timeout. Please try again.', 'error');
          return;
        }
        
        // ✅ Mark request as complete (for processing/retry cases)
        isPollRequestInFlight = false;
      } catch (error: any) {
        // ✅ Always mark request as complete when error occurs
        isPollRequestInFlight = false;
        
        // ✅ AbortError is expected when cancelled (component unmounting or new operation)
        if (error.name === 'AbortError') {
          // Silently exit - cleanup function will handle state reset if needed
          // If component is unmounting, state will be lost anyway
          return;
        }
        
        console.error('Polling error:', error);
        consecutiveErrors++;
        
        // ✅ Handle network errors and timeouts gracefully
        const isNetworkError = error.message?.includes('fetch') || 
                              error.message?.includes('network') ||
                              error.message?.includes('timeout') ||
                              error.code === 'ECONNREFUSED' ||
                              error.code === 'ETIMEDOUT';
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          // Too many consecutive errors = permanent failure
          // ✅ CRITICAL: Stop polling and clear all state
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            activePollingIntervalRef.current = null;
          }
          
          // ✅ Abort controller
          abortController.abort();
          
          // ✅ CRITICAL: Clear ALL state in flushSync to ensure controls unfreeze
          flushSync(() => {
            // Remove from active processing set
            setActiveProcessingTransformationIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(transformationId);
              return newSet;
            });
            
            // Update transformation state
          updateTransformation(transformationId, {
            processing: false,
            applied: false
          });
          
            // Reset operation state
          setIsOperationInProgress(false);
          });
          
          const errorMessage = isNetworkError 
            ? 'Network error: Unable to reach server. Please try again.'
            : 'Processing failed after multiple attempts. Please try again.';
          
          showNotification(errorMessage, 'error');
          return;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          // ✅ CRITICAL: Stop polling and clear all state on max attempts
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            activePollingIntervalRef.current = null;
          }
          
          // ✅ Abort controller
          abortController.abort();
          
          // ✅ CRITICAL: Clear ALL state in flushSync to ensure controls unfreeze
          flushSync(() => {
            // Remove from active processing set
            setActiveProcessingTransformationIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(transformationId);
              return newSet;
            });
            
            // Update transformation state
          updateTransformation(transformationId, {
            processing: false,
            applied: false
          });
            
            // Reset operation state
          setIsOperationInProgress(false);
          });
          
          showNotification('Failed to check processing status after multiple attempts. Please try again.', 'error');
          return;
        }
        
        // For retry cases, the error is logged but polling continues
        // Request is already marked as complete above, so next poll can proceed
      }
    };
    
    // ✅ Start polling immediately, then every 10 seconds
    // 10 seconds is a good balance: fast enough to detect completion quickly,
    // but long enough to prevent concurrent requests if a request takes 5-8 seconds
    // The isPollRequestInFlight flag prevents concurrent requests even if interval fires
    poll();
    intervalId = setInterval(poll, 10000); // 10 seconds - safe interval that prevents concurrent requests
    activePollingIntervalRef.current = intervalId;
    
    // Return cleanup function
    // ✅ CRITICAL: Cleanup must clear all state to prevent controls from staying frozen
    const cleanup = () => {
      // Abort any in-flight requests
      abortController.abort();
      
      // Clear interval if it exists
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      
      // Clear refs
      activePollingIntervalRef.current = null;
      activePollingAbortControllerRef.current = null;
      
      // ✅ Reset in-flight flag (in case cleanup is called while request is in progress)
      // This is handled by closure, but we ensure it's reset
      isPollRequestInFlight = false;
      
      // ✅ CRITICAL: Also remove from active processing set if cleanup is called
      // This ensures controls unfreeze even if cleanup is called externally (e.g., new operation starts)
      // Note: In success case, state is already cleared in flushSync before cleanup is called
      setActiveProcessingTransformationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(transformationId);
        return newSet;
      });
    };
    
    activePollingCleanupRef.current = cleanup;
    return cleanup;
  }, [dispatch, onImageProcessed, showNotification, setIsOperationInProgress, transformationState, buildChainedUrl, originalUrl, updateTransformation]);

  // ✅ Store pollForCompletion in ref for use by other functions
  useEffect(() => {
    pollForCompletionRef.current = pollForCompletion;
  }, [pollForCompletion]);

  // Undo transformation
  const undoTransformation = useCallback(() => {
    // ✅ Prevent undo during active operations
    if (isOperationInProgress || isAnyTransformationInProgress) {
      showNotification('Cannot undo while an operation is in progress', 'warning');
      return;
    }
    
    if (transformationState.index >= 0) {
      dispatch({ type: 'UNDO' });
      const newIndex = transformationState.index - 1;
      
      // ✅ Cancel any active polling when undoing (safety measure)
      if (activePollingCleanupRef.current) {
        activePollingCleanupRef.current();
        activePollingCleanupRef.current = null;
      }
      
      if (newIndex >= 0) {
        // Use the URL from the transformation at the new index
        const targetTransformation = transformationState.history[newIndex];
        
        // ✅ If transformation has a URL, use it; otherwise build from history
        let newUrl: string;
        if (targetTransformation.url && targetTransformation.completed) {
          newUrl = targetTransformation.url;
        } else {
          // Build URL from all completed transformations up to this index
          newUrl = buildChainedUrl(originalUrl, transformationState.history, newIndex);
        }
        
        setCurrentWorkingUrl(newUrl);
        showNotification('Transformation undone', 'success');
      } else {
        setCurrentWorkingUrl(originalUrl);
        showNotification('Reset to original image', 'success');
      }
    }
  }, [transformationState.index, transformationState.history, originalUrl, showNotification, isOperationInProgress, isAnyTransformationInProgress, buildChainedUrl]);

  // Redo transformation
  const redoTransformation = useCallback(() => {
    // ✅ Prevent redo during active operations
    if (isOperationInProgress || isAnyTransformationInProgress) {
      showNotification('Cannot redo while an operation is in progress', 'warning');
      return;
    }
    
    if (transformationState.index < transformationState.history.length - 1) {
      dispatch({ type: 'REDO' });
      const newIndex = transformationState.index + 1;
      
      // ✅ Cancel any active polling when redoing (safety measure)
      if (activePollingCleanupRef.current) {
        activePollingCleanupRef.current();
        activePollingCleanupRef.current = null;
      }
      
      // Use the URL from the transformation at the new index
      const targetTransformation = transformationState.history[newIndex];
      
      // ✅ If transformation has a URL, use it; otherwise build from history
      let newUrl: string;
      if (targetTransformation.url && targetTransformation.completed) {
        newUrl = targetTransformation.url;
      } else {
        // Build URL from all completed transformations up to this index
        newUrl = buildChainedUrl(originalUrl, transformationState.history, newIndex);
      }
      
      setCurrentWorkingUrl(newUrl);
      showNotification('Transformation redone', 'success');
    }
  }, [transformationState.index, transformationState.history, originalUrl, showNotification, isOperationInProgress, isAnyTransformationInProgress, buildChainedUrl]);

  // Reset to original
  const handleReset = useCallback(() => {
    // Clean up any active polling
    if (activePollingCleanupRef.current) {
      activePollingCleanupRef.current();
      activePollingCleanupRef.current = null;
    }
    
    // ✅ Clear all active processing transformations
    setActiveProcessingTransformationIds(new Set());
    
    // ✅ Reset operation state if reset is called during an operation
    setIsOperationInProgress(false);
    
    // ✅ Clear rendering flag
    setIsRenderingImage(false);
    
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
        // ✅ CRITICAL: Handle response structure safely
        const savedUrl = result.data?.savedImage?.savedUrl || result.data?.savedUrl || result.savedUrl;
        if (!savedUrl) {
          throw new Error('Invalid response structure: missing savedUrl');
        }
        showNotification('🎉 Image saved successfully!', 'success');
        onImageProcessed(savedUrl);
      } else {
        showNotification(result.error || 'Failed to save image', 'error');
      }
    } catch (error) {
      console.error('Save error:', error);
      showNotification('Failed to save image', 'error');
    }
  }, [currentWorkingUrl, transformationState.history, processingStartTime, originalUrl, onImageProcessed, showNotification]);

  return (
    <div className={`space-y-6 ${className}`} data-testid="image-editor">
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
            data-testid="undo-btn"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
          
          <button
            type="button"
            onClick={redoTransformation}
            disabled={transformationState.index >= transformationState.history.length - 1 || !canPerformOperation}
            className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            data-testid="redo-btn"
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
            data-testid="reset-btn"
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
            {/* ✅ FIRST IMAGE: Always show original (never changes) */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 text-center">Original</h4>
              <div className="relative max-w-full max-h-96 min-h-96 overflow-hidden rounded-lg border border-gray-600">
                {originalUrl ? (
                  // ✅ CRITICAL: Use key prop to force re-render if originalUrl changes
                  // ✅ CRITICAL: Use unoptimized if needed to prevent caching issues
                  <Image
                    key={`original-${originalUrl}`}
                    src={originalUrl}
                    alt="Original"
                    width={400}
                    height={320}
                    className="max-w-full max-h-96 object-contain"
                    priority={true}
                    quality={85}
                    unoptimized={false}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 bg-gray-800">
                    <p className="text-gray-400">No original image</p>
                  </div>
                )}
              </div>
            </div>
            {/* ✅ SECOND IMAGE: Shows processed/current version (updates when currentWorkingUrl changes) */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300 text-center">Processed</h4>
              <div className="relative max-w-full max-h-96 min-h-96 overflow-hidden rounded-lg border border-gray-600">
                {/* ✅ CRITICAL FIX: Check both isOperationInProgress AND active processing state */}
                {/* This ensures loading state clears immediately after state updates */}
                {(isOperationInProgress || activeProcessingTransformationIds.size > 0) ? (
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
                ) : hasAsyncOperations ? (
                  // ✅ Use direct img tag for async operations (bypasses Next.js proxy timeout)
                  // ✅ CRITICAL: Show previous image with overlay while new image loads (better UX)
                  <div className="relative min-h-96">
                  {/* Show previous image while new one loads */}
                  {imageLoadingState.isLoading && imageLoadingState.previousUrl && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 min-h-96">
                      <img
                        src={imageLoadingState.previousUrl}
                        alt="Previous"
                        className="max-w-full max-h-96 object-contain opacity-60"
                        style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '384px' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm z-10">
                        <div className="bg-gray-800/90 rounded-lg p-4 flex items-center gap-3 shadow-lg">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-300">
                            {isRenderingImage ? 'Rendering image...' : 'Loading processed image...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Show loader if no previous image OR if image is loading */}
                  {imageLoadingState.isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 z-10 min-h-96">
                      {!imageLoadingState.previousUrl && (
                        <div className="bg-gray-800/90 rounded-lg p-4 flex items-center gap-3 shadow-lg">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-300">
                            {isRenderingImage ? 'Rendering image...' : 'Loading image...'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ✅ CRITICAL: Render img tag but hide it when loading to prevent vertical line */}
                  {/* We render it so onLoad can fire, but hide it to prevent browser's minimal dimension rendering */}
                  {currentWorkingUrl && (
                    <img
                      key={`processed-${currentWorkingUrl}`}
                      src={currentWorkingUrl}
                      alt="Processed"
                      className="max-w-full max-h-96 object-contain transition-opacity duration-300"
                      style={{ 
                        width: 'auto', 
                        height: 'auto', 
                        maxWidth: '100%', 
                        maxHeight: '384px',
                        // ✅ CRITICAL: Hide image when loading to prevent vertical line (1px width before image loads)
                        // Use display:none instead of visibility/opacity to completely remove from layout
                        display: imageLoadingState.isLoading && !imageLoadingState.previousUrl ? 'none' : 'block',
                        opacity: imageLoadingState.isLoading && imageLoadingState.previousUrl ? 0 : 1,
                        pointerEvents: imageLoadingState.isLoading ? 'none' : 'auto'
                      }}
                      data-testid="processed-image"
                      crossOrigin="anonymous"
                      loading="eager"
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.log('✅ Processed image loaded successfully:', {
                          src: target.src,
                          currentWorkingUrl,
                          naturalWidth: target.naturalWidth,
                          naturalHeight: target.naturalHeight
                        });
                        // ✅ Image is loaded, clear loading state
                        setImageLoadingState(prev => ({
                          isLoading: false,
                          hasError: false,
                          currentUrl: currentWorkingUrl,
                          previousUrl: null
                        }));
                        // ✅ Clear rendering flag now that image is fully loaded
                        setIsRenderingImage(false);
                      }}
                      onError={async (e) => {
                        console.error('❌ Processed image failed to load:', currentWorkingUrl, e);
                        const target = e.target as HTMLImageElement;
                        
                        // ✅ CRITICAL: Check if URL has async operations that might still be processing
                        const hasAsyncOps = checkHasAsyncOperations(currentWorkingUrl);
                        if (hasAsyncOps) {
                          console.log('🔄 Image has async operations, checking if still processing...');
                          const startedPolling = await checkAndStartPollingIfNeeded(currentWorkingUrl);
                          
                          if (startedPolling) {
                            // Polling started, keep showing loader
                            setImageLoadingState(prev => ({
                              isLoading: true,
                              hasError: false,
                              currentUrl: currentWorkingUrl,
                              previousUrl: prev.previousUrl || prev.currentUrl
                            }));
                            showNotification('Image is still being processed. Please wait...', 'info');
                            return;
                          }
                        }
                        
                        // If no async operations or polling failed, show error
                        setImageLoadingState(prev => ({
                          isLoading: false,
                          hasError: true,
                          currentUrl: currentWorkingUrl,
                          previousUrl: prev.previousUrl
                        }));
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  </div>
                ) : (
                  // ✅ CRITICAL: Use key prop to force re-render when URL changes
                <div className="relative min-h-96">
                  {/* Show loader for non-async transformations */}
                  {imageLoadingState.isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 z-10 min-h-96">
                      {imageLoadingState.previousUrl ? (
                        <div className="relative w-full h-full min-h-96">
                          <img
                            src={imageLoadingState.previousUrl}
                            alt="Previous"
                            className="max-w-full max-h-96 object-contain opacity-60"
                            style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '384px' }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm">
                            <div className="bg-gray-800/90 rounded-lg p-4 flex items-center gap-3 shadow-lg">
                              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                              <span className="text-sm text-gray-300">
                                {isRenderingImage ? 'Rendering image...' : 'Loading processed image...'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-800/90 rounded-lg p-4 flex items-center gap-3 shadow-lg">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-300">
                            {isRenderingImage ? 'Rendering image...' : 'Loading image...'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ✅ CRITICAL: Render img tag but hide it when loading to prevent vertical line */}
                  {/* We render it so onLoad can fire, but hide it to prevent browser's minimal dimension rendering */}
                  {currentWorkingUrl && (
                    <img
                      key={`processed-${currentWorkingUrl}`}
                      src={currentWorkingUrl}
                      alt="Processed"
                      className="max-w-full max-h-96 object-contain transition-opacity duration-300"
                      style={{ 
                        width: 'auto', 
                        height: 'auto', 
                        maxWidth: '100%', 
                        maxHeight: '384px',
                        // ✅ CRITICAL: Hide image when loading to prevent vertical line (1px width before image loads)
                        // Use display:none instead of visibility/opacity to completely remove from layout
                        display: imageLoadingState.isLoading && !imageLoadingState.previousUrl ? 'none' : 'block',
                        opacity: imageLoadingState.isLoading && imageLoadingState.previousUrl ? 0 : 1,
                        pointerEvents: imageLoadingState.isLoading ? 'none' : 'auto'
                      }}
                      crossOrigin="anonymous"
                      loading="eager"
                      onLoad={() => {
                        // ✅ Image is loaded, clear loading state
                        setImageLoadingState(prev => ({
                          isLoading: false,
                          hasError: false,
                          currentUrl: currentWorkingUrl,
                          previousUrl: null
                        }));
                        // ✅ Clear rendering flag now that image is fully loaded
                        setIsRenderingImage(false);
                      }}
                      onError={() => {
                        // ✅ Mark image as error - hide loader
                        setImageLoadingState(prev => ({
                          isLoading: false,
                          hasError: true,
                          currentUrl: currentWorkingUrl,
                          previousUrl: prev.previousUrl
                        }));
                      }}
                    />
                  )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative max-w-full max-h-96 min-h-96 overflow-hidden rounded-lg border border-gray-600">
              {/* Main Image */}
              {hasAsyncOperations ? (
                // ✅ Use direct img tag for async operations (bypasses Next.js proxy timeout)
                // ✅ CRITICAL: Show previous image with overlay while new image loads (better UX)
                <div className="relative min-h-96">
                  {/* Show previous image while new one loads */}
                  {imageLoadingState.isLoading && imageLoadingState.previousUrl && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 min-h-96">
                      <img
                        src={imageLoadingState.previousUrl}
                        alt="Previous"
                        className="max-w-full max-h-96 object-contain opacity-60"
                        style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '384px' }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm z-10">
                        <div className="bg-gray-800/90 rounded-lg p-4 flex items-center gap-3 shadow-lg">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-300">
                            {isRenderingImage ? 'Rendering image...' : 'Loading processed image...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Show loader if no previous image OR if image is loading */}
                  {imageLoadingState.isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 z-10 min-h-96">
                      {!imageLoadingState.previousUrl && (
                        <div className="bg-gray-800/90 rounded-lg p-4 flex items-center gap-3 shadow-lg">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-300">
                            {isRenderingImage ? 'Rendering image...' : 'Loading image...'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ✅ CRITICAL: Render img tag but hide it when loading to prevent vertical line */}
                  {/* We render it so onLoad can fire, but hide it to prevent browser's minimal dimension rendering */}
                  {currentWorkingUrl && (
                    <img
                      key={currentWorkingUrl}
                      src={currentWorkingUrl}
                      alt="Current Image"
                      className="max-w-full max-h-96 object-contain transition-opacity duration-300"
                      style={{ 
                        width: 'auto', 
                        height: 'auto', 
                        maxWidth: '100%', 
                        maxHeight: '384px',
                        // ✅ CRITICAL: Hide image when loading to prevent vertical line (1px width before image loads)
                        // Use display:none instead of visibility/opacity to completely remove from layout
                        display: imageLoadingState.isLoading && !imageLoadingState.previousUrl ? 'none' : 'block',
                        opacity: imageLoadingState.isLoading && imageLoadingState.previousUrl ? 0 : 1,
                        pointerEvents: imageLoadingState.isLoading ? 'none' : 'auto'
                      }}
                      data-testid="current-image"
                      crossOrigin="anonymous"
                      loading="eager"
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        console.log('✅ Image loaded successfully:', {
                          src: target.src,
                          currentWorkingUrl,
                          naturalWidth: target.naturalWidth,
                          naturalHeight: target.naturalHeight
                        });
                        // ✅ Image is loaded, clear loading state
                        setImageLoadingState(prev => ({
                          isLoading: false,
                          hasError: false,
                          currentUrl: currentWorkingUrl,
                          previousUrl: null
                        }));
                        // ✅ Clear rendering flag now that image is fully loaded
                        setIsRenderingImage(false);
                      }}
                      onError={async (e) => {
                        console.error('❌ Image failed to load:', currentWorkingUrl, e);
                        const target = e.target as HTMLImageElement;
                        
                        // ✅ CRITICAL: Check if URL has async operations that might still be processing
                        const hasAsyncOps = checkHasAsyncOperations(currentWorkingUrl);
                        if (hasAsyncOps) {
                          console.log('🔄 Image has async operations, checking if still processing...');
                          const startedPolling = await checkAndStartPollingIfNeeded(currentWorkingUrl);
                          
                          if (startedPolling) {
                            // Polling started, keep showing loader
                            setImageLoadingState(prev => ({
                              isLoading: true,
                              hasError: false,
                              currentUrl: currentWorkingUrl,
                              previousUrl: prev.previousUrl || prev.currentUrl
                            }));
                            showNotification('Image is still being processed. Please wait...', 'info');
                            return;
                          }
                        }
                        
                        // If no async operations or polling failed, show error
                        setImageLoadingState(prev => ({
                          isLoading: false,
                          hasError: true,
                          currentUrl: currentWorkingUrl,
                          previousUrl: prev.previousUrl
                        }));
                        target.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="relative min-h-96">
                  {/* Show loader for non-async transformations */}
                  {imageLoadingState.isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 z-10 min-h-96">
                      {imageLoadingState.previousUrl ? (
                        <div className="relative w-full h-full min-h-96">
                          <img
                            src={imageLoadingState.previousUrl}
                            alt="Previous"
                            className="max-w-full max-h-96 object-contain opacity-60"
                            style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '384px' }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm">
                            <div className="bg-gray-800/90 rounded-lg p-4 flex items-center gap-3 shadow-lg">
                              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                              <span className="text-sm text-gray-300">
                                {isRenderingImage ? 'Rendering image...' : 'Loading processed image...'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-800/90 rounded-lg p-4 flex items-center gap-3 shadow-lg">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-300">
                            {isRenderingImage ? 'Rendering image...' : 'Loading image...'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ✅ CRITICAL: Render img tag but hide it when loading to prevent vertical line */}
                  {/* We render it so onLoad can fire, but hide it to prevent browser's minimal dimension rendering */}
                  {currentWorkingUrl && (
                    <img
                      key={currentWorkingUrl}
                      src={currentWorkingUrl}
                      alt="Current Image"
                      className="max-w-full max-h-96 object-contain transition-opacity duration-300"
                      style={{ 
                        width: 'auto', 
                        height: 'auto', 
                        maxWidth: '100%', 
                        maxHeight: '384px',
                        // ✅ CRITICAL: Hide image when loading to prevent vertical line (1px width before image loads)
                        // Use display:none instead of visibility/opacity to completely remove from layout
                        display: imageLoadingState.isLoading && !imageLoadingState.previousUrl ? 'none' : 'block',
                        opacity: imageLoadingState.isLoading && imageLoadingState.previousUrl ? 0 : 1,
                        pointerEvents: imageLoadingState.isLoading ? 'none' : 'auto'
                      }}
                      crossOrigin="anonymous"
                      loading="eager"
                      onLoad={() => {
                        // ✅ Image is loaded, clear loading state
                        setImageLoadingState(prev => ({
                          isLoading: false,
                          hasError: false,
                          currentUrl: currentWorkingUrl,
                          previousUrl: null
                        }));
                        // ✅ Clear rendering flag now that image is fully loaded
                        setIsRenderingImage(false);
                      }}
                      onError={() => {
                        // ✅ Mark image as error - hide loader
                        setImageLoadingState(prev => ({
                          isLoading: false,
                          hasError: true,
                          currentUrl: currentWorkingUrl,
                          previousUrl: prev.previousUrl
                        }));
                      }}
                    />
                  )}
                </div>
              )}
              
              {/* Loading Overlay - Only shows when processing */}
              {/* ✅ CRITICAL FIX: Check both isOperationInProgress AND active processing state */}
              {/* This ensures loading state clears immediately after state updates */}
              {(isOperationInProgress || activeProcessingTransformationIds.size > 0) && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center space-y-6 animate-fade-in z-10" data-testid="loader-overlay">
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

      {/* Transformation Controls - Tab Based */}
      <div className="bg-gray-700 rounded-lg">
        {/* Tab Navigation */}
        <div className="flex gap-1 p-2 border-b border-gray-600">
          <button
            type="button"
            onClick={() => setActiveOperationTab('enhancement')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium transition-all rounded-t-lg ${
              activeOperationTab === 'enhancement'
                ? 'bg-gray-800 text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Enhance
          </button>
          <button
            type="button"
            onClick={() => setActiveOperationTab('transform')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium transition-all rounded-t-lg ${
              activeOperationTab === 'transform'
                ? 'bg-gray-800 text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            <RotateCw className="w-4 h-4" />
            Transform
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {/* AI Enhance Tab - Enhancement + Background Removal */}
          {activeOperationTab === 'enhancement' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Enhancement Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-medium text-white">Enhancement</h3>
          </div>
          
            <button
              type="button"
              onClick={() => handleEnhancement(true)}
              disabled={!canPerformOperation}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
              data-testid="auto-enhancement-btn"
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
                  <div className="flex gap-2 pt-2">
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
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
              data-testid="manual-enhancement-btn"
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

              {/* Background Removal Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-medium text-white">Background Removal</h3>
            </div>
            
            <button
              type="button"
              onClick={handleBackgroundRemoval}
              disabled={!canPerformOperation}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
              data-testid="background-removal-btn"
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
                <p className="text-xs text-gray-400 text-center">
                  AI-powered background removal using advanced image processing
                </p>
          </div>
            </div>
          )}

          {/* Transform Tab - Rotate & Flip + Crop */}
          {activeOperationTab === 'transform' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rotate & Flip Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
              <RotateCw className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-medium text-white">Rotate & Flip</h3>
            </div>
            
            <div className="space-y-3">
              {/* Rotation Buttons */}
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Rotation</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleRotate(90)}
                  data-testid="rotate-90-btn"
                  disabled={!canPerformOperation}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
                >
                  <RotateCw className="w-5 h-5" />
                  <span className="text-xs">90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate(180)}
                  data-testid="rotate-180-btn"
                  disabled={!canPerformOperation}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
                >
                  <RotateCw className="w-5 h-5" />
                  <span className="text-xs">180°</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate(270)}
                  data-testid="rotate-270-btn"
                  disabled={!canPerformOperation}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-xs">270°</span>
                </button>
                    </div>
              </div>
              
              {/* Flip Buttons */}
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Flip</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFlip('h')}
                  data-testid="flip-horizontal-btn"
                  disabled={!canPerformOperation}
                  className="flex items-center justify-center gap-2 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
                >
                  <FlipHorizontal className="w-5 h-5" />
                  <span className="text-sm">Flip H</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFlip('v')}
                  data-testid="flip-vertical-btn"
                  disabled={!canPerformOperation}
                  className="flex items-center justify-center gap-2 p-3 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
                >
                  <FlipVertical className="w-5 h-5" />
                  <span className="text-sm">Flip V</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
              {/* Crop Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-medium text-white">Crop</h3>
          </div>
          
          <div className="space-y-3">
            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Aspect Ratio</label>
              <select
                value={cropSettings.aspectRatio}
                onChange={(e) => {
                  const newAspectRatio = e.target.value as typeof cropSettings.aspectRatio;
                  setCropSettings(prev => {
                    // ✅ Reset width/height when changing aspect ratio to avoid stale values
                    // This prevents the bug where first crop uses wrong dimensions
                    if (prev.aspectRatio !== newAspectRatio && newAspectRatio !== 'original') {
                      return {
                        aspectRatio: newAspectRatio,
                        width: 0,
                        height: 0
                      };
                    }
                    return {
                      ...prev,
                      aspectRatio: newAspectRatio
                    };
                  });
                }}
                disabled={!canPerformOperation}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="original">Select Aspect Ratio</option>
                <option value="1:1">Square (1:1)</option>
                <option value="4:3">Standard (4:3)</option>
                <option value="16:9">Widescreen (16:9)</option>
                <option value="9:16">Portrait (9:16)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            {/* Dimensions */}
            {cropSettings.aspectRatio !== 'original' && (
              <div className="space-y-3">
                {/* ✅ Show mode indicator */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-600">
                  <div className={`w-2 h-2 rounded-full ${cropSettings.aspectRatio === 'custom' ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                  <span className="text-xs text-gray-400">
                    {cropSettings.aspectRatio === 'custom' 
                      ? 'Custom Mode: Enter exact dimensions' 
                      : cropSettings.aspectRatio === '9:16'
                      ? `Aspect Ratio Mode: ${cropSettings.aspectRatio} - Enter height, width auto-calculates`
                      : `Aspect Ratio Mode: ${cropSettings.aspectRatio} - Enter width, height auto-calculates`}
                  </span>
                </div>
                
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <label className="text-sm text-gray-300 flex items-center gap-1">
                      Width (px)
                      {cropSettings.aspectRatio !== 'custom' && cropSettings.aspectRatio !== '9:16' && (
                        <span className="text-xs text-gray-500">*</span>
                      )}
                    </label>
                  <input
                    type="number"
                    value={cropSettings.width || ''}
                    onChange={(e) => {
                      const newWidth = parseInt(e.target.value) || 0;
                      setCropSettings(prev => ({ ...prev, width: newWidth }));
                    }}
                    disabled={!canPerformOperation || cropSettings.aspectRatio === '9:16'}
                      placeholder={cropSettings.aspectRatio === '9:16' ? 'Auto-calculated' : (cropSettings.aspectRatio === 'custom' ? 'Enter width' : 'Enter width (optional)')}
                    className={`w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      cropSettings.aspectRatio === '9:16' ? 'bg-gray-700 cursor-not-allowed' : ''
                    }`}
                    title={cropSettings.aspectRatio === '9:16' ? 'Width is automatically calculated based on aspect ratio and height' : ''}
                  />
                </div>
                <div className="space-y-2">
                    <label className="text-sm text-gray-300 flex items-center gap-1">
                      Height (px)
                      {cropSettings.aspectRatio !== 'custom' && (
                        <span className="text-xs text-gray-500">(auto)</span>
                      )}
                    </label>
                  <input
                    type="number"
                    value={cropSettings.height || ''}
                      onChange={(e) => {
                        // ✅ For custom mode and portrait ratios (9:16), allow editing height
                        if (cropSettings.aspectRatio === 'custom' || cropSettings.aspectRatio === '9:16') {
                          setCropSettings(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }));
                        }
                      }}
                      disabled={!canPerformOperation || (cropSettings.aspectRatio !== 'custom' && cropSettings.aspectRatio !== '9:16')}
                      placeholder={cropSettings.aspectRatio === '9:16' ? 'Enter height (width auto)' : (cropSettings.aspectRatio === 'custom' ? 'Enter height' : 'Auto-calculated')}
                      className={`w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        (cropSettings.aspectRatio !== 'custom' && cropSettings.aspectRatio !== '9:16') ? 'bg-gray-700 cursor-not-allowed' : ''
                      }`}
                      title={cropSettings.aspectRatio === '9:16' ? 'Enter height - width will be calculated automatically' : (cropSettings.aspectRatio !== 'custom' ? 'Height is automatically calculated based on aspect ratio and width' : '')}
                  />
                </div>
                </div>
                
                {/* ✅ Show calculated preview for aspect ratio modes */}
                {cropSettings.aspectRatio !== 'custom' && 
                 ((cropSettings.aspectRatio === '9:16' && cropSettings.height && cropSettings.height > 0) ||
                  (cropSettings.aspectRatio !== '9:16' && cropSettings.width && cropSettings.width > 0)) && (
                  <div className="px-3 py-2 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                    <p className="text-xs text-blue-300">
                      💡 Preview: {(() => {
                        const ratio = cropSettings.aspectRatio;
                        if (ratio === '9:16') {
                          const width = cropSettings.height ? Math.round(cropSettings.height * 9 / 16) : 0;
                          return `${width} × ${cropSettings.height}`;
                        } else {
                          const height = cropSettings.width ? (() => {
                            if (ratio === '1:1') return cropSettings.width;
                            if (ratio === '4:3') return Math.round(cropSettings.width * 3 / 4);
                            if (ratio === '16:9') return Math.round(cropSettings.width * 9 / 16);
                            return '?';
                          })() : 0;
                          return `${cropSettings.width} × ${height}`;
                        }
                      })()}px ({cropSettings.aspectRatio})
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Apply Crop Button */}
            <button
              type="button"
              onClick={handleCrop}
              data-testid="crop-btn"
              disabled={!canPerformOperation || cropSettings.aspectRatio === 'original'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
            >
              <Crop className="w-5 h-5" />
              {cropSettings.aspectRatio === 'custom' 
                ? 'Apply Custom Crop' 
                : `Apply ${cropSettings.aspectRatio} Crop`}
            </button>
          </div>
              </div>
            </div>
          )}
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
          // ✅ FIX: Defer notification to avoid calling during render
          setTimeout(() => {
            showNotification('🎉 Image processing completed! You can now apply more transformations.', 'success');
          }, 0);
        }}
        onError={() => {
          // ✅ FIX: Defer notification to avoid calling during render
          setTimeout(() => {
            showNotification('❌ Image processing failed. Please try again.', 'error');
          }, 0);
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
