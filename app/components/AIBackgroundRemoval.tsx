'use client';

import React, { useState } from 'react';
import { Wand2, Download, RotateCcw, Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useNotification } from './Notification';

interface AIBackgroundRemovalProps {
  imageUrl: string;
  onBackgroundRemoved: (processedUrl: string) => void;
  onReset: () => void;
  className?: string;
}

const AIBackgroundRemoval: React.FC<AIBackgroundRemovalProps> = ({
  imageUrl,
  onBackgroundRemoved,
  onReset,
  className = ''
}) => {
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  const handleBackgroundRemoval = async () => {
    if (!imageUrl) {
      showNotification('No image selected for background removal', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessingTime(null);

    try {
      const response = await fetch('/api/ai/background-removal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          options: {
            quality: 90,
            format: 'png',
            transparent: true
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        const result = data.data;
        setProcessedUrl(result.processedUrl);
        setProcessingTime(result.processingTime);
        onBackgroundRemoved(result.processedUrl);
        showNotification('Background removed successfully!', 'success');
      } else {
        showNotification(data.error || 'Background removal failed', 'error');
      }
    } catch (error) {
      console.error('Background removal error:', error);
      showNotification('Failed to remove background', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processedUrl) {
      const link = document.createElement('a');
      link.href = processedUrl;
      link.download = 'background-removed.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setProcessedUrl(null);
    setShowComparison(false);
    setProcessingTime(null);
    onReset();
  };

  const toggleComparison = () => {
    setShowComparison(!showComparison);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">AI Background Removal</h3>
        </div>
        {processedUrl && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleComparison}
              className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {showComparison ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showComparison ? 'Hide' : 'Show'} Comparison
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        )}
      </div>

      {!processedUrl ? (
        <div className="space-y-4">
          <div className="relative group">
            <div className="flex justify-center">
              <div className="relative max-w-full max-h-80 overflow-hidden rounded-lg border border-gray-600">
                <Image
                  src={imageUrl}
                  alt="Original"
                  width={400}
                  height={320}
                  className="max-w-full max-h-80 object-contain"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={handleBackgroundRemoval}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Removing Background...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Remove Background
              </>
            )}
          </button>

          {processingTime && (
            <div className="text-center text-sm text-gray-400">
              Processing completed in {processingTime}ms
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {showComparison ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300 text-center">Original</h4>
                <div className="relative max-w-full max-h-80 overflow-hidden rounded-lg border border-gray-600">
                  <Image
                    src={imageUrl}
                    alt="Original"
                    width={400}
                    height={320}
                    className="max-w-full max-h-80 object-contain"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300 text-center">Background Removed</h4>
                <div className="relative max-w-full max-h-80 overflow-hidden rounded-lg border border-gray-600 bg-gray-100">
                  <Image
                    src={processedUrl}
                    alt="Background Removed"
                    width={400}
                    height={320}
                    className="max-w-full max-h-80 object-contain"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <div className="flex justify-center">
                <div className="relative max-w-full max-h-80 overflow-hidden rounded-lg border border-gray-600 bg-gray-100">
                  <Image
                    src={processedUrl}
                    alt="Background Removed"
                    width={400}
                    height={320}
                    className="max-w-full max-h-80 object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          {processingTime && (
            <div className="text-center text-sm text-gray-400">
              Processed in {processingTime}ms
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>• AI-powered background removal using ImageKit</p>
        <p>• Best results with clear subject separation</p>
        <p>• Output format: PNG with transparency</p>
      </div>
    </div>
  );
};

export default AIBackgroundRemoval;
