'use client';

import React, { useState } from 'react';
import { Users, Eye, EyeOff, Shield, Download, RotateCcw, Loader2, Smile, User } from 'lucide-react';
import Image from 'next/image';
import { useNotification } from './Notification';

interface Face {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface EmotionDetection {
  emotion: string;
  confidence: number;
}

interface AgeGenderDetection {
  age: number;
  gender: string;
  confidence: number;
}

interface AIFaceDetectionProps {
  imageUrl: string;
  onFaceDetectionComplete: (faces: Face[]) => void;
  onReset: () => void;
  className?: string;
}

const AIFaceDetection: React.FC<AIFaceDetectionProps> = ({
  imageUrl,
  onFaceDetectionComplete,
  onReset,
  className = ''
}) => {
  const { showNotification } = useNotification();
  const [isProcessing, setIsProcessing] = useState(false);
  const [faces, setFaces] = useState<Face[]>([]);
  const [emotions, setEmotions] = useState<EmotionDetection[]>([]);
  const [ageGender, setAgeGender] = useState<AgeGenderDetection[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [protectedUrl, setProtectedUrl] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const detectFaces = async () => {
    if (!imageUrl) {
      showNotification('No image selected for face detection', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessingTime(null);

    try {
      const response = await fetch('/api/ai/face-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          options: {
            minConfidence: 0.5,
            maxFaces: 10
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        const result = data.data;
        setFaces(result.faces);
        setProcessingTime(result.processingTime);
        onFaceDetectionComplete(result.faces);
        showNotification(`Detected ${result.faceCount} face(s)!`, 'success');
      } else {
        showNotification(data.error || 'Face detection failed', 'error');
      }
    } catch (error) {
      console.error('Face detection error:', error);
      showNotification('Failed to detect faces', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const detectEmotions = async () => {
    if (faces.length === 0) {
      showNotification('No faces detected. Please detect faces first.', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/ai/face-detection/emotions?imageUrl=${encodeURIComponent(imageUrl)}&action=emotions`);
      const data = await response.json();

      if (data.success) {
        setEmotions(data.data);
        setShowAnalysis(true);
        showNotification('Emotion detection completed!', 'success');
      } else {
        showNotification(data.error || 'Emotion detection failed', 'error');
      }
    } catch (error) {
      console.error('Emotion detection error:', error);
      showNotification('Failed to detect emotions', 'error');
    }
  };

  const detectAgeGender = async () => {
    if (faces.length === 0) {
      showNotification('No faces detected. Please detect faces first.', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/ai/face-detection/emotions?imageUrl=${encodeURIComponent(imageUrl)}&action=age-gender`);
      const data = await response.json();

      if (data.success) {
        setAgeGender(data.data);
        setShowAnalysis(true);
        showNotification('Age/Gender detection completed!', 'success');
      } else {
        showNotification(data.error || 'Age/Gender detection failed', 'error');
      }
    } catch (error) {
      console.error('Age/Gender detection error:', error);
      showNotification('Failed to detect age/gender', 'error');
    }
  };

  const protectPrivacy = async () => {
    try {
      const response = await fetch('/api/ai/face-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          action: 'protect',
          options: {
            blurIntensity: 25
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProtectedUrl(data.data.protectedUrl);
        showNotification(`Privacy protected! Blurred ${data.data.faceCount} face(s)`, 'success');
      } else {
        showNotification(data.error || 'Privacy protection failed', 'error');
      }
    } catch (error) {
      console.error('Privacy protection error:', error);
      showNotification('Failed to protect privacy', 'error');
    }
  };

  const handleReset = () => {
    setFaces([]);
    setEmotions([]);
    setAgeGender([]);
    setShowOverlay(false);
    setShowAnalysis(false);
    setProtectedUrl(null);
    setProcessingTime(null);
    onReset();
  };

  const formatConfidence = (confidence: number) => {
    return Math.round(confidence * 100);
  };

  const getEmotionColor = (emotion: string) => {
    const colors: { [key: string]: string } = {
      happy: 'text-green-400',
      sad: 'text-blue-400',
      angry: 'text-red-400',
      surprised: 'text-yellow-400',
      neutral: 'text-gray-400',
      fearful: 'text-purple-400',
      disgusted: 'text-orange-400'
    };
    return colors[emotion] || 'text-gray-400';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-pink-400" />
          <h3 className="text-lg font-semibold text-white">AI Face Detection</h3>
        </div>
        {faces.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {showOverlay ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showOverlay ? 'Hide' : 'Show'} Overlay
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

      {/* Face Detection Results */}
      {faces.length > 0 && (
        <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-pink-300">Detected Faces</h4>
            <span className="text-sm text-pink-400">{faces.length} face(s) found</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {faces.map((face, index) => (
              <div key={index} className="p-2 bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-300 mb-1">Face {index + 1}</div>
                <div className="text-xs text-gray-400">
                  Position: ({face.x}, {face.y})
                </div>
                <div className="text-xs text-gray-400">
                  Size: {face.width}×{face.height}
                </div>
                <div className="text-xs text-pink-400">
                  Confidence: {formatConfidence(face.confidence)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {showAnalysis && (emotions.length > 0 || ageGender.length > 0) && (
        <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-700">
          <h4 className="text-sm font-medium text-blue-300 mb-3">Face Analysis</h4>
          
          {emotions.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-blue-400 mb-2">Emotions</div>
              <div className="grid grid-cols-2 gap-2">
                {emotions.map((emotion, index) => (
                  <div key={index} className="p-2 bg-gray-700 rounded-lg">
                    <div className={`text-sm font-medium ${getEmotionColor(emotion.emotion)}`}>
                      {emotion.emotion.charAt(0).toUpperCase() + emotion.emotion.slice(1)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatConfidence(emotion.confidence)}% confidence
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ageGender.length > 0 && (
            <div>
              <div className="text-xs text-blue-400 mb-2">Age & Gender</div>
              <div className="grid grid-cols-2 gap-2">
                {ageGender.map((detection, index) => (
                  <div key={index} className="p-2 bg-gray-700 rounded-lg">
                    <div className="text-sm text-white">
                      {detection.age} years old
                    </div>
                    <div className="text-xs text-gray-400">
                      {detection.gender.charAt(0).toUpperCase() + detection.gender.slice(1)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatConfidence(detection.confidence)}% confidence
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy Protection */}
      {protectedUrl && (
        <div className="p-4 bg-green-900/20 rounded-lg border border-green-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-green-300">Privacy Protected</h4>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = protectedUrl;
                link.download = 'privacy-protected.jpg';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
          <div className="relative max-w-full max-h-60 overflow-hidden rounded-lg border border-gray-600">
            <Image
              src={protectedUrl}
              alt="Privacy Protected"
              width={400}
              height={240}
              className="max-w-full max-h-60 object-contain"
            />
          </div>
        </div>
      )}

      {/* Main Image with Face Overlay */}
      <div className="space-y-4">
        <div className="relative group">
          <div className="flex justify-center">
            <div className="relative max-w-full max-h-80 overflow-hidden rounded-lg border border-gray-600">
              <Image
                src={imageUrl}
                alt="Face Detection"
                width={400}
                height={320}
                className="max-w-full max-h-80 object-contain"
              />
              {showOverlay && faces.length > 0 && (
                <div className="absolute inset-0">
                  {faces.map((face, index) => (
                    <div
                      key={index}
                      className="absolute border-2 border-pink-400 bg-pink-400/20"
                      style={{
                        left: `${(face.x / 400) * 100}%`,
                        top: `${(face.y / 400) * 100}%`,
                        width: `${(face.width / 400) * 100}%`,
                        height: `${(face.height / 400) * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 text-xs text-pink-400 font-medium">
                        Face {index + 1} ({formatConfidence(face.confidence)}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={detectFaces}
            disabled={isProcessing}
            className="flex items-center gap-1 px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            {isProcessing ? 'Detecting...' : 'Detect Faces'}
          </button>

          {faces.length > 0 && (
            <>
              <button
                onClick={detectEmotions}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Smile className="w-4 h-4" />
                Detect Emotions
              </button>
              <button
                onClick={detectAgeGender}
                className="flex items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                Age/Gender
              </button>
              <button
                onClick={protectPrivacy}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4" />
                Protect Privacy
              </button>
            </>
          )}
        </div>

        {processingTime && (
          <div className="text-center text-sm text-gray-400">
            Detection completed in {processingTime}ms
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• AI-powered face detection and analysis</p>
        <p>• Emotion, age, and gender detection</p>
        <p>• Privacy protection with face blurring</p>
      </div>
    </div>
  );
};

export default AIFaceDetection;
