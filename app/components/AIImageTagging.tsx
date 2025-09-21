'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, X, Plus, RefreshCw } from 'lucide-react';
import { useNotification } from './Notification';
import { AITag } from '@/lib/ai-services';

interface AIImageTaggingProps {
  imageUrl: string;
  existingTags: string[];
  onTagsUpdate: (tags: string[]) => void;
  onCategoryUpdate: (category: string, confidence: number) => void;
  className?: string;
}

const AIImageTagging: React.FC<AIImageTaggingProps> = ({
  imageUrl,
  existingTags,
  onTagsUpdate,
  onCategoryUpdate,
  className = ''
}) => {
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiTags, setAiTags] = useState<AITag[]>([]);
  const [aiCategory, setAiCategory] = useState<string>('');
  const [categoryConfidence, setCategoryConfidence] = useState<number>(0);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const generateAITags = useCallback(async () => {
    if (!imageUrl) return;

    setIsProcessing(true);
    setProcessingTime(null);

    try {
      const response = await fetch('/api/ai/image-tagging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          options: {
            maxTags: 10,
            minConfidence: 0.5
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        const result = data.data;
        setAiTags(result.tags);
        setAiCategory(result.category);
        setCategoryConfidence(result.categoryConfidence);
        setProcessingTime(result.processingTime);
        
        // Update parent component
        onCategoryUpdate(result.category, result.categoryConfidence);
        
        showNotification('AI tags generated successfully!', 'success');
      } else {
        showNotification(data.error || 'Failed to generate AI tags', 'error');
      }
    } catch (error) {
      console.error('AI tagging error:', error);
      showNotification('Failed to generate AI tags', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl, onCategoryUpdate, showNotification]);

  // Generate AI tags when component mounts or image changes
  useEffect(() => {
    if (imageUrl) {
      generateAITags();
    }
  }, [imageUrl, generateAITags]);

  const loadSuggestedTags = async () => {
    try {
      const response = await fetch(`/api/ai/image-tagging?tags=${existingTags.join(',')}&imageUrl=${encodeURIComponent(imageUrl)}`);
      const data = await response.json();

      if (data.success) {
        setSuggestedTags(data.data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const addAITag = (tag: AITag) => {
    const newTags = [...existingTags, tag.tag];
    onTagsUpdate(newTags);
    showNotification(`Added tag: ${tag.tag}`, 'success');
  };

  const addSuggestedTag = (tag: string) => {
    if (!existingTags.includes(tag)) {
      const newTags = [...existingTags, tag];
      onTagsUpdate(newTags);
      showNotification(`Added tag: ${tag}`, 'success');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = existingTags.filter(tag => tag !== tagToRemove);
    onTagsUpdate(newTags);
  };

  const applyAllAITags = () => {
    const newTags = [...existingTags, ...aiTags.map(tag => tag.tag)];
    const uniqueTags = [...new Set(newTags)];
    onTagsUpdate(uniqueTags);
    showNotification('Applied all AI tags!', 'success');
  };

  const formatConfidence = (confidence: number) => {
    return Math.round(confidence * 100);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">AI Image Analysis</h3>
        </div>
        <button
          onClick={generateAITags}
          disabled={isProcessing}
          className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isProcessing ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {isProcessing && (
        <div className="text-center py-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-2" />
          <p className="text-gray-400">Analyzing image with AI...</p>
        </div>
      )}

      {/* AI Category Detection */}
      {aiCategory && !isProcessing && (
        <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-700">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-purple-300">Detected Category</h4>
            <span className="text-xs text-purple-400">
              {formatConfidence(categoryConfidence)}% confidence
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium">
              {aiCategory.charAt(0).toUpperCase() + aiCategory.slice(1)}
            </span>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${formatConfidence(categoryConfidence)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* AI Generated Tags */}
      {aiTags.length > 0 && !isProcessing && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">AI Generated Tags</h4>
            <button
              onClick={applyAllAITags}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Apply All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {aiTags.map((tag, index) => (
              <div
                key={index}
                className="group flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors cursor-pointer"
                onClick={() => addAITag(tag)}
              >
                <span className="text-white text-sm">#{tag.tag}</span>
                <span className="text-xs text-gray-400">
                  {formatConfidence(tag.confidence)}%
                </span>
                <Plus className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Tags */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300">Current Tags</h4>
          <button
            onClick={loadSuggestedTags}
            className="text-xs text-green-400 hover:text-green-300 transition-colors"
          >
            Get Suggestions
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {existingTags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-full"
            >
              #{tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-blue-200 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Suggested Tags */}
      {showSuggestions && suggestedTags.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-300">Suggested Tags</h4>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              Hide
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag, index) => (
              <button
                key={index}
                onClick={() => addSuggestedTag(tag)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-full transition-colors"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {processingTime && (
        <div className="text-center text-sm text-gray-400">
          Analysis completed in {processingTime}ms
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>• AI-powered image analysis and tagging</p>
        <p>• Automatic category detection</p>
        <p>• Smart tag suggestions based on content</p>
      </div>
    </div>
  );
};

export default AIImageTagging;
