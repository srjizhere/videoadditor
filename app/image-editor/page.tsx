"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "../components/layout";
import { SingleImageEditor } from "../components/ai";
import { useNotification } from "../components/layout/Notification";
import { ArrowLeft, Upload } from "lucide-react";

export default function ImageEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const url = searchParams.get('imageUrl');
    if (url) {
      setImageUrl(decodeURIComponent(url));
      setIsLoading(false);
    } else {
      showNotification('No image provided for editing', 'error');
      router.push('/upload?type=image');
    }
  }, [searchParams, showNotification, router]);

  const handleImageProcessed = (processedUrl: string) => {
    showNotification('Image processed successfully!', 'success');
    // You can add logic here to save the processed image or update the URL
    console.log('Processed image URL:', processedUrl);
  };

  const handleReset = () => {
    showNotification('Reset to original image', 'info');
  };

  const handleBackToUpload = () => {
    router.push('/upload?type=image');
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading image editor...</p>
          </div>
        </div>
      </>
    );
  }

  if (!imageUrl) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-base-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Image Selected</h3>
            <p className="text-gray-400 mb-4">Please upload an image to start editing</p>
            <button
              onClick={handleBackToUpload}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Image
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-base-100">
        {/* Navigation */}
        <div className="bg-base-200/50 border-b border-base-300">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToUpload}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Upload
              </button>
              <div className="text-sm text-gray-400">
                Single Image Editor - Transform your image with AI
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <SingleImageEditor
            imageUrl={imageUrl}
            onImageProcessed={handleImageProcessed}
            onReset={handleReset}
            className="max-w-6xl mx-auto"
          />
        </div>
      </div>
    </>
  );
}
