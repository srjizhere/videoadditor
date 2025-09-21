'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Upload, X, Image as ImageIcon, Tag, Eye, EyeOff, Wand2 } from 'lucide-react';
import Image from 'next/image';
import { useNotification } from './Notification';
import { ImageUploadData, ImageCategory } from '@/types/media';
import FileUpload from './FileUpload';
import AIBackgroundRemoval from './AIBackgroundRemoval';
import AIImageTagging from './AIImageTagging';
import AIImageEnhancement from './AIImageEnhancement';
import AIFaceDetection from './AIFaceDetection';

interface ImageUploadFormProps {
  onSuccess?: (image: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
}

const ImageUploadForm: React.FC<ImageUploadFormProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  const { data: session } = useSession();
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState<ImageUploadData>({
    title: '',
    description: '',
    imageUrl: '',
    thumbnailUrl: '',
    tags: [],
    category: 'other',
    isPublic: true,
    dimensions: { width: 0, height: 0 },
    fileSize: 0,
    format: 'jpg'
  });
  const [tagInput, setTagInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingDimensions, setProcessingDimensions] = useState(false);
  const [backgroundRemovedUrl, setBackgroundRemovedUrl] = useState<string | null>(null);
  const [qualityEnhancedUrl, setQualityEnhancedUrl] = useState<string | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<Array<{ x: number; y: number; width: number; height: number; confidence: number }>>([]);
  const [showAIFeatures, setShowAIFeatures] = useState(false);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const categories: { value: ImageCategory; label: string }[] = [
    { value: 'nature', label: 'Nature' },
    { value: 'portrait', label: 'Portrait' },
    { value: 'landscape', label: 'Landscape' },
    { value: 'abstract', label: 'Abstract' },
    { value: 'street', label: 'Street' },
    { value: 'macro', label: 'Macro' },
    { value: 'other', label: 'Other' }
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUploadSuccess = (uploadResult: unknown) => {
    console.log('Upload result:', uploadResult);
    
    const result = uploadResult as {
      url: string;
      thumbnailUrl?: string;
      name?: string;
      fileType?: string;
      size?: number;
    };
    
    setProcessingDimensions(true);
    
    // Clean up previous blob URL if it exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    // Reset AI features state when uploading new image
    setBackgroundRemovedUrl(null);
    setQualityEnhancedUrl(null);
    setDetectedFaces([]);
    setShowAIFeatures(false);
    
    // Load the image to get actual dimensions
    const img = new window.Image();
    img.onload = () => {
      setFormData(prev => ({
        ...prev,
        imageUrl: result.url,
        thumbnailUrl: result.thumbnailUrl || result.url,
        title: prev.title || result.name?.split('.')[0] || 'Untitled',
        format: (result.fileType?.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg') as 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif',
        fileSize: result.size || 0,
        dimensions: {
          width: img.width,
          height: img.height
        },
        // Reset AI-generated data for new image
        aiTags: [],
        aiCategory: undefined,
        aiCategoryConfidence: undefined,
        faceDetection: undefined,
        backgroundRemoved: false,
        backgroundRemovedUrl: undefined,
        qualityEnhanced: false,
        qualityEnhancedUrl: undefined
      }));
      setProcessingDimensions(false);
      setPreviewUrl(result.url);
      showNotification('Image uploaded successfully!', 'success');
    };
    img.onerror = () => {
      // Fallback to default dimensions if image fails to load
      setFormData(prev => ({
        ...prev,
        imageUrl: result.url,
        thumbnailUrl: result.thumbnailUrl || result.url,
        title: prev.title || result.name?.split('.')[0] || 'Untitled',
        format: (result.fileType?.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg') as 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif',
        fileSize: result.size || 0,
        dimensions: { width: 1, height: 1 },
        // Reset AI-generated data for new image
        aiTags: [],
        aiCategory: undefined,
        aiCategoryConfidence: undefined,
        faceDetection: undefined,
        backgroundRemoved: false,
        backgroundRemovedUrl: undefined,
        qualityEnhanced: false,
        qualityEnhancedUrl: undefined
      }));
      setProcessingDimensions(false);
      setPreviewUrl(result.url);
      showNotification('Image uploaded but dimensions could not be determined', 'warning');
    };
    img.crossOrigin = 'anonymous'; // Add for CORS handling
    img.src = result.url;
  };

  const handleFileUploadProgress = (progress: number) => {
    setUploadProgress(progress);
  };

  const handleFile = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showNotification('Please select a valid image file (JPG, PNG, WebP, or GIF)', 'error');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showNotification('File size must be less than 10MB', 'error');
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Get image dimensions
    const img = new window.Image();
    img.onload = () => {
      const format = file.type.split('/')[1] as 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif';
      
      setFormData(prev => ({
        ...prev,
        title: file.name.split('.')[0],
        format: format === 'jpeg' ? 'jpg' : format,
        dimensions: {
          width: img.width,
          height: img.height
        },
        fileSize: file.size
      }));
    };
    img.src = url;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user) {
      showNotification('Please log in to upload images', 'error');
      return;
    }

    if (!formData.title.trim()) {
      showNotification('Please enter a title', 'error');
      return;
    }

    if (!formData.imageUrl) {
      showNotification('Please upload an image file first', 'error');
      return;
    }

    // Check if imageUrl is a blob URL (not uploaded yet) or empty
    if (!formData.imageUrl || formData.imageUrl.startsWith('blob:')) {
      showNotification('Please wait for the image to finish uploading', 'error');
      return;
    }

    // Check if dimensions are valid
    if (!formData.dimensions || formData.dimensions.width <= 0 || formData.dimensions.height <= 0) {
      showNotification('Please wait for image processing to complete', 'error');
      return;
    }

    setIsUploading(true);
    
    try {
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: formData.imageUrl,
          thumbnailUrl: formData.thumbnailUrl || formData.imageUrl
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification('Image saved successfully!', 'success');
        onSuccess?.(data.data);
        resetForm();
      } else {
        showNotification(data.error || 'Failed to save image', 'error');
        onError?.(data.error || 'Failed to save image');
      }
    } catch (error) {
      console.error('Error saving image:', error);
      showNotification('Failed to save image', 'error');
      onError?.('Failed to save image');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    // Clean up blob URL if it exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      thumbnailUrl: '',
      tags: [],
      category: 'other',
      isPublic: true,
      dimensions: { width: 0, height: 0 },
      fileSize: 0,
      format: 'jpg'
    });
    setTagInput('');
    setPreviewUrl(null);
    setBackgroundRemovedUrl(null);
    setQualityEnhancedUrl(null);
    setDetectedFaces([]);
    setShowAIFeatures(false);
    setUploadProgress(0);
    setProcessingDimensions(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBackgroundRemoved = (processedUrl: string) => {
    setBackgroundRemovedUrl(processedUrl);
    setFormData(prev => ({
      ...prev,
      backgroundRemovedUrl: processedUrl,
      backgroundRemoved: true
    }));
  };

  const handleBackgroundRemovalReset = () => {
    setBackgroundRemovedUrl(null);
    setFormData(prev => ({
      ...prev,
      backgroundRemovedUrl: '',
      backgroundRemoved: false
    }));
  };

  const handleAITagsUpdate = (tags: string[]) => {
    setFormData(prev => ({
      ...prev,
      tags: [...new Set([...prev.tags, ...tags])] // Merge and deduplicate
    }));
  };

  const handleAICategoryUpdate = (category: string, confidence: number) => {
    setFormData(prev => ({
      ...prev,
      aiCategory: category,
      aiCategoryConfidence: confidence
    }));
  };

  const handleImageEnhanced = (enhancedUrl: string) => {
    setQualityEnhancedUrl(enhancedUrl);
    setFormData(prev => ({
      ...prev,
      qualityEnhancedUrl: enhancedUrl,
      qualityEnhanced: true
    }));
  };

  const handleImageEnhancementReset = () => {
    setQualityEnhancedUrl(null);
    setFormData(prev => ({
      ...prev,
      qualityEnhancedUrl: '',
      qualityEnhanced: false
    }));
  };

  const handleFaceDetectionComplete = (faces: unknown[]) => {
    const typedFaces = faces as Array<{ x: number; y: number; width: number; height: number; confidence: number }>;
    setDetectedFaces(typedFaces);
    setFormData(prev => ({
      ...prev,
      faceDetection: {
        faces: typedFaces,
        faceCount: typedFaces.length
      }
    }));
  };

  const handleFaceDetectionReset = () => {
    setDetectedFaces([]);
    setFormData(prev => ({
      ...prev,
      faceDetection: {
        faces: [],
        faceCount: 0
      }
    }));
  };

  if (!session?.user) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Login Required</h3>
        <p className="text-gray-400">Please log in to upload images</p>
      </div>
    );
  }

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body text-center mb-8">
        <h2 className="card-title text-2xl justify-center mb-2">Upload Image</h2>
        <p className="text-base-content/70">Share your amazing images with the world</p>
      </div>
      
      <div className="card-body p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* File Upload Area */}
          <div className="space-y-4">
          {!previewUrl ? (
            <FileUpload
              onSuccess={handleFileUploadSuccess}
              onProgress={handleFileUploadProgress}
              fileType="image"
            />
          ) : (
            <div className="space-y-4">
              {/* Uploaded Image Display */}
              <div className="relative group">
                <div className="flex justify-center">
                  <div className="relative max-w-full max-h-80 overflow-hidden rounded-lg border border-gray-600">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      width={400}
                      height={320}
                      className="max-w-full max-h-80 object-contain"
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </div>
                </div>
                
                {/* Upload New Image Button */}
                <div className="absolute top-2 left-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Clean up blob URL if it exists
                      if (previewUrl && previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(previewUrl);
                      }
                      // Reset all image-related state
                      setPreviewUrl(null);
                      setBackgroundRemovedUrl(null);
                      setQualityEnhancedUrl(null);
                      setDetectedFaces([]);
                      setShowAIFeatures(false);
                      setUploadProgress(0);
                      setProcessingDimensions(false);
                      setFormData(prev => ({ 
                        ...prev, 
                        imageUrl: '', 
                        thumbnailUrl: '',
                        // Reset AI data
                        aiTags: [],
                        aiCategory: undefined,
                        aiCategoryConfidence: undefined,
                        faceDetection: undefined,
                        backgroundRemoved: false,
                        backgroundRemovedUrl: undefined,
                        qualityEnhanced: false,
                        qualityEnhancedUrl: undefined
                      }));
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="px-3 py-1 bg-blue-600/90 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Upload New
                  </button>
                </div>
                
                {/* Remove Image Button */}
                <button
                  type="button"
                  onClick={() => {
                    // Clean up blob URL if it exists
                    if (previewUrl && previewUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(previewUrl);
                    }
                    setPreviewUrl(null);
                    setFormData(prev => ({ ...prev, imageUrl: '', thumbnailUrl: '' }));
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Success Message */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-700 rounded-lg text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Image uploaded successfully! You can now fill in the details below.
                </div>
              </div>
            </div>
          )}
          
          {/* Upload Progress Bar */}
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          
          {processingDimensions && (
            <div className="text-center text-sm text-gray-400">
              Processing image dimensions...
            </div>
          )}

          {/* AI Features Toggle */}
          {previewUrl && (
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">AI Features</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAIFeatures(!showAIFeatures)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showAIFeatures 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {showAIFeatures ? 'Hide' : 'Show'} AI Tools
              </button>
            </div>
          )}

          {/* AI Features Section */}
          {showAIFeatures && previewUrl && (
            <div className="space-y-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <AIBackgroundRemoval
                imageUrl={previewUrl}
                onBackgroundRemoved={handleBackgroundRemoved}
                onReset={handleBackgroundRemovalReset}
              />
              <AIImageTagging
                imageUrl={previewUrl}
                existingTags={formData.tags}
                onTagsUpdate={handleAITagsUpdate}
                onCategoryUpdate={handleAICategoryUpdate}
              />
              <AIImageEnhancement
                imageUrl={previewUrl}
                onImageEnhanced={handleImageEnhanced}
                onReset={handleImageEnhancementReset}
              />
              <AIFaceDetection
                imageUrl={previewUrl}
                onFaceDetectionComplete={handleFaceDetectionComplete}
                onReset={handleFaceDetectionReset}
              />
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter image title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
            placeholder="Describe your image (optional)"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-full"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-blue-200 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex space-x-3">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Add a tag and press Enter"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Privacy Setting */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.isPublic ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.isPublic ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <div className="flex items-center space-x-2">
            {formData.isPublic ? (
              <Eye className="w-4 h-4 text-green-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm text-gray-300">
              {formData.isPublic ? 'Public' : 'Private'}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={resetForm}
            className="btn btn-outline"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isUploading || processingDimensions || !formData.title.trim() || !formData.imageUrl || formData.imageUrl.startsWith('blob:') || !formData.dimensions || formData.dimensions.width <= 0 || formData.dimensions.height <= 0}
            className="btn btn-primary gap-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : processingDimensions ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              'Save Image'
            )}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default ImageUploadForm;
