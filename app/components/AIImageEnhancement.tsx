'use client';

import React, { useState } from 'react';
import { Zap, Download, RotateCcw, Eye, EyeOff, Loader2, Settings, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useNotification } from './Notification';
import { ImageEnhancementOptions } from '@/lib/ai/image-enhancement';

interface AIImageEnhancementProps {
  imageUrl: string;
  onImageEnhanced: (enhancedUrl: string) => void;
  onReset: () => void;
  className?: string;
}

const AIImageEnhancement: React.FC<AIImageEnhancementProps> = ({
  imageUrl,
  onImageEnhanced,
  onReset,
  className = ''
}) => {
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [enhancementOptions, setEnhancementOptions] = useState<ImageEnhancementOptions>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    noiseReduction: false,
    quality: 90,
    format: 'auto' as 'jpg' | 'png' | 'webp' | 'auto'
  });
  const [qualityAnalysis, setQualityAnalysis] = useState<{
    qualityScore: number;
    suggestions: string[];
    recommendedEnhancements?: ImageEnhancementOptions;
  } | null>(null);

  const handleEnhancement = async (autoEnhance: boolean = false) => {
    if (!imageUrl) {
      showNotification('No image selected for enhancement', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessingTime(null);

    try {
      const response = await fetch('/api/ai/image-enhancement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          options: autoEnhance ? {} : enhancementOptions,
          autoEnhance
        }),
      });

      const data = await response.json();

      if (data.success) {
        const result = data.data;
        setEnhancedUrl(result.enhancedUrl);
        setProcessingTime(result.processingTime);
        onImageEnhanced(result.enhancedUrl);
        showNotification('Image enhanced successfully!', 'success');
      } else {
        showNotification(data.error || 'Image enhancement failed', 'error');
      }
    } catch (error) {
      console.error('Image enhancement error:', error);
      showNotification('Failed to enhance image', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyzeQuality = async () => {
    try {
      const response = await fetch(`/api/ai/image-enhancement/analyze?imageUrl=${encodeURIComponent(imageUrl)}`);
      const data = await response.json();

      if (data.success) {
        setQualityAnalysis(data.data);
        showNotification('Quality analysis completed!', 'success');
      } else {
        showNotification(data.error || 'Quality analysis failed', 'error');
      }
    } catch (error) {
      console.error('Quality analysis error:', error);
      showNotification('Failed to analyze image quality', 'error');
    }
  };

  const handleDownload = () => {
    if (enhancedUrl) {
      const link = document.createElement('a');
      link.href = enhancedUrl;
      link.download = 'enhanced-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setEnhancedUrl(null);
    setShowComparison(false);
    setProcessingTime(null);
    setQualityAnalysis(null);
    onReset();
  };

  const toggleComparison = () => {
    setShowComparison(!showComparison);
  };

  const applyRecommendedSettings = () => {
    if (qualityAnalysis?.recommendedEnhancements) {
      setEnhancementOptions(prev => ({
        ...prev,
        ...qualityAnalysis.recommendedEnhancements
      }));
      showNotification('Applied recommended settings!', 'success');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">AI Image Enhancement</h3>
        </div>
        {enhancedUrl && (
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

      {/* Quality Analysis */}
      {!enhancedUrl && (
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Quality Analysis</h4>
            <button
              onClick={handleAnalyzeQuality}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Analyze
            </button>
          </div>
          
          {qualityAnalysis ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Quality Score</span>
                <span className="text-lg font-semibold text-white">
                  {qualityAnalysis.qualityScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    qualityAnalysis.qualityScore >= 80 ? 'bg-green-500' :
                    qualityAnalysis.qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${qualityAnalysis.qualityScore}%` }}
                />
              </div>
              <div className="space-y-1">
                {qualityAnalysis.suggestions.map((suggestion: string, index: number) => (
                  <p key={index} className="text-xs text-gray-400">• {suggestion}</p>
                ))}
              </div>
              {qualityAnalysis.recommendedEnhancements && Object.keys(qualityAnalysis.recommendedEnhancements).length > 0 && (
                <button
                  onClick={applyRecommendedSettings}
                  className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                >
                  Apply Recommended Settings
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Click &quot;Analyze&quot; to check image quality and get recommendations</p>
          )}
        </div>
      )}

      {/* Enhancement Settings */}
      {!enhancedUrl && (
        <div className="p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Enhancement Settings</h4>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              {showSettings ? 'Hide' : 'Show'} Settings
            </button>
          </div>

          {showSettings && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Brightness</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={enhancementOptions.brightness || 0}
                    onChange={(e) => setEnhancementOptions(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{enhancementOptions.brightness || 0}</span>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Contrast</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={enhancementOptions.contrast || 0}
                    onChange={(e) => setEnhancementOptions(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{enhancementOptions.contrast || 0}</span>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Saturation</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={enhancementOptions.saturation || 0}
                    onChange={(e) => setEnhancementOptions(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{enhancementOptions.saturation || 0}</span>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sharpness</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={enhancementOptions.sharpness || 0}
                    onChange={(e) => setEnhancementOptions(prev => ({ ...prev, sharpness: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{enhancementOptions.sharpness || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enhancementOptions.noiseReduction || false}
                    onChange={(e) => setEnhancementOptions(prev => ({ ...prev, noiseReduction: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-300">Noise Reduction</span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {!enhancedUrl ? (
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
          
          <div className="flex gap-3">
            <button
              onClick={() => handleEnhancement(false)}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Enhance with Settings
                </>
              )}
            </button>
            <button
              onClick={() => handleEnhancement(true)}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 font-medium"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Auto-Enhancing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Auto-Enhance
                </>
              )}
            </button>
          </div>

          {processingTime && (
            <div className="text-center text-sm text-gray-400">
              Enhancement completed in {processingTime}ms
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
                <h4 className="text-sm font-medium text-gray-300 text-center">Enhanced</h4>
                <div className="relative max-w-full max-h-80 overflow-hidden rounded-lg border border-gray-600">
                  <Image
                    src={enhancedUrl}
                    alt="Enhanced"
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
                <div className="relative max-w-full max-h-80 overflow-hidden rounded-lg border border-gray-600">
                  <Image
                    src={enhancedUrl}
                    alt="Enhanced"
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
              Enhanced in {processingTime}ms
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>• AI-powered image quality enhancement</p>
        <p>• Adjustable brightness, contrast, saturation, and sharpness</p>
        <p>• Automatic enhancement with AI optimization</p>
      </div>
    </div>
  );
};

export default AIImageEnhancement;
