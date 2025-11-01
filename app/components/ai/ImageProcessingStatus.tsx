'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock, Zap, Eye } from 'lucide-react';

interface ProcessingPhase {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // Estimated duration in seconds
  status: 'pending' | 'active' | 'completed' | 'failed';
}

interface ImageProcessingStatusProps {
  isProcessing: boolean;
  processingStatus: string;
  estimatedTime: string;
  elapsedTime: string;
  processingType?: 'enhancement' | 'background-removal';
  onComplete?: () => void;
  onError?: () => void;
}

const ImageProcessingStatus: React.FC<ImageProcessingStatusProps> = ({
  isProcessing,
  processingStatus,
  estimatedTime,
  elapsedTime,
  processingType = 'enhancement',
  onComplete,
  onError
}) => {
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  
  // Dynamic phases based on processing type
  const getPhases = (type: 'enhancement' | 'background-removal'): ProcessingPhase[] => {
    if (type === 'background-removal') {
      return [
        {
          id: 'analyzing',
          name: 'Analyzing Image',
          description: 'AI is examining your image to identify the subject',
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          duration: 8,
          status: 'pending'
        },
        {
          id: 'detecting',
          name: 'Detecting Subject',
          description: 'Identifying the main subject and background areas',
          icon: <Eye className="w-4 h-4" />,
          duration: 12,
          status: 'pending'
        },
        {
          id: 'removing',
          name: 'Removing Background',
          description: 'AI is carefully removing the background',
          icon: <Zap className="w-4 h-4" />,
          duration: 20,
          status: 'pending'
        },
        {
          id: 'refining',
          name: 'Refining Edges',
          description: 'Fine-tuning edges for perfect cutout',
          icon: <CheckCircle className="w-4 h-4" />,
          duration: 8,
          status: 'pending'
        }
      ];
    } else {
      return [
        {
          id: 'analyzing',
          name: 'Analyzing Image',
          description: 'AI is examining your image quality and content',
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          duration: 5,
          status: 'pending'
        },
        {
          id: 'processing',
          name: 'Applying Transformations',
          description: 'Processing your image with AI algorithms',
          icon: <Zap className="w-4 h-4" />,
          duration: 15,
          status: 'pending'
        },
        {
          id: 'optimizing',
          name: 'Optimizing Results',
          description: 'Fine-tuning and optimizing the output',
          icon: <CheckCircle className="w-4 h-4" />,
          duration: 5,
          status: 'pending'
        },
        {
          id: 'finalizing',
          name: 'Finalizing',
          description: 'Preparing your enhanced image',
          icon: <CheckCircle className="w-4 h-4" />,
          duration: 3,
          status: 'pending'
        }
      ];
    }
  };

  const [phases, setPhases] = useState<ProcessingPhase[]>(getPhases(processingType));

  const [progress, setProgress] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Update phases when processing type changes
  useEffect(() => {
    setPhases(getPhases(processingType));
    setCurrentPhase(0);
    setIsCompleted(false);
    setProgress(0);
  }, [processingType]);

  // Update phases based on processing status
  useEffect(() => {
    if (!isProcessing) return;

    const updatePhases = () => {
      setPhases(prev => prev.map((phase, index) => {
        if (index < currentPhase) {
          return { ...phase, status: 'completed' };
        } else if (index === currentPhase) {
          return { ...phase, status: 'active' };
        } else {
          return { ...phase, status: 'pending' };
        }
      }));
    };

    updatePhases();
  }, [currentPhase, isProcessing]);

  // Simulate phase progression
  useEffect(() => {
    if (!isProcessing) return;

    const phaseInterval = setInterval(() => {
      setCurrentPhase(prev => {
        const nextPhase = prev + 1;
        if (nextPhase >= phases.length) {
          setIsCompleted(true);
          onComplete?.();
          return prev;
        }
        return nextPhase;
      });
    }, 3000); // Change phase every 3 seconds

    return () => clearInterval(phaseInterval);
  }, [isProcessing, phases.length, onComplete]);

  // Calculate progress
  useEffect(() => {
    if (!isProcessing) {
      setProgress(0);
      setCurrentPhase(0);
      setIsCompleted(false);
      return;
    }

    const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);
    const currentDuration = phases.slice(0, currentPhase + 1).reduce((sum, phase) => sum + phase.duration, 0);
    const progressPercent = Math.min(95, (currentDuration / totalDuration) * 100);
    
    setProgress(progressPercent);
  }, [currentPhase, phases, isProcessing]);

  // Handle completion
  useEffect(() => {
    if (isCompleted && isProcessing) {
      setTimeout(() => {
        setProgress(100);
        onComplete?.();
      }, 1000);
    }
  }, [isCompleted, isProcessing, onComplete]);

  if (!isProcessing && !isCompleted) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          )}
          {!isCompleted && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {isCompleted 
              ? 'Processing Complete!' 
              : processingType === 'background-removal' 
                ? 'AI Background Removal in Progress' 
                : 'AI Enhancement in Progress'
            }
          </h3>
          <p className="text-sm text-gray-600">
            {isCompleted 
              ? 'Your image is ready for more transformations' 
              : processingStatus || (processingType === 'background-removal' 
                ? 'Removing background with AI...' 
                : 'Enhancing your image with AI...')
            }
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phase Indicators */}
      <div className="space-y-3">
        {phases.map((phase, index) => (
          <div
            key={phase.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
              phase.status === 'completed' 
                ? 'bg-green-100 border border-green-200' 
                : phase.status === 'active'
                ? 'bg-blue-100 border border-blue-200'
                : 'bg-gray-100 border border-gray-200'
            }`}
          >
            <div className={`flex-shrink-0 ${
              phase.status === 'completed' 
                ? 'text-green-600' 
                : phase.status === 'active'
                ? 'text-blue-600'
                : 'text-gray-400'
            }`}>
              {phase.status === 'completed' ? (
                <CheckCircle className="w-5 h-5" />
              ) : phase.status === 'active' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1">
              <div className={`font-medium ${
                phase.status === 'completed' 
                  ? 'text-green-800' 
                  : phase.status === 'active'
                  ? 'text-blue-800'
                  : 'text-gray-600'
              }`}>
                {phase.name}
              </div>
              <div className={`text-sm ${
                phase.status === 'completed' 
                  ? 'text-green-600' 
                  : phase.status === 'active'
                  ? 'text-blue-600'
                  : 'text-gray-500'
              }`}>
                {phase.description}
              </div>
            </div>
            
            {phase.status === 'active' && (
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Time Information */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Elapsed: {elapsedTime || '0:00'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">Estimated: {estimatedTime || '2-3 minutes'}</span>
          </div>
        </div>
      </div>

      {/* Completion Message */}
      {isCompleted && (
        <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">
              {processingType === 'background-removal' ? 'Background Removal Complete!' : 'Enhancement Complete!'}
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            {processingType === 'background-removal' 
              ? 'Your image background has been successfully removed. You can now apply additional transformations or download the result.'
              : 'Your image has been successfully enhanced. You can now apply additional transformations or download the result.'
            }
          </p>
        </div>
      )}

      {/* Tips */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-blue-800">
          <strong>💡 Tip:</strong> All transformation tools are locked during processing. 
          They'll unlock automatically when ready!
        </div>
      </div>
    </div>
  );
};

export default ImageProcessingStatus;
