'use client';

import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Upload, X, Image as ImageIcon, Tag, Eye, EyeOff } from 'lucide-react';
import { useNotification } from './Notification';
import { ImageUploadData, ImageCategory } from '@/types/media';

interface ImageUploadFormProps {
  onSuccess?: (image: any) => void;
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
    const img = new Image();
    img.onload = () => {
      const format = file.type.split('/')[1] as 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif';
      
      setFormData(prev => ({
        ...prev,
        title: file.name.split('.')[0],
        imageUrl: url, // This will be replaced with actual upload URL
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
      showNotification('Please select an image file', 'error');
      return;
    }

    setIsUploading(true);
    
    try {
      // Here you would typically upload the file to ImageKit or your storage service
      // For now, we'll simulate the upload process
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: formData.imageUrl, // This should be the actual uploaded URL
          thumbnailUrl: formData.thumbnailUrl || formData.imageUrl
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification('Image uploaded successfully!', 'success');
        onSuccess?.(data.data);
        resetForm();
      } else {
        showNotification(data.error || 'Failed to upload image', 'error');
        onError?.(data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification('Failed to upload image', 'error');
      onError?.('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <h2 className="text-xl font-bold text-white mb-6">Upload Image</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-400 bg-blue-400/10' 
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          {previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 mx-auto rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setFormData(prev => ({ ...prev, imageUrl: '' }));
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-red-400 hover:text-red-300"
              >
                <X className="w-6 h-6 mx-auto" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports JPG, PNG, WebP, GIF (max 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter image title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your image (optional)"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-full"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-blue-200 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a tag and press Enter"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Tag className="w-4 h-4" />
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
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isUploading || !formData.title.trim() || !formData.imageUrl}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? 'Uploading...' : 'Upload Image'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ImageUploadForm;
