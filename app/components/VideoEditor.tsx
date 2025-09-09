"use client";

import { useState, useRef, useEffect } from "react";
import { Video } from "@imagekit/next";
import { 
  Play, 
  Pause, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical,
  Crop,
  Filter,
  Settings,
  Download,
  Save,
  Undo,
  Redo,
  Scissors,
  Volume2,
  VolumeX
} from "lucide-react";
import { VideoTransformation, buildVideoTransformationUrl } from "@/lib/imagekit-utils";

interface VideoEditorProps {
  videoUrl: string;
  onSave?: (transformation: VideoTransformation) => void;
  className?: string;
}

export default function VideoEditor({ videoUrl, onSave, className = "" }: VideoEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<VideoTransformation[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [transformation, setTransformation] = useState<VideoTransformation>({
    width: 1080,
    height: 1920,
    quality: 80,
    format: 'auto',
    crop: 'maintain_ratio',
    focus: 'auto'
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  // Add transformation to history
  const addToHistory = (newTransformation: VideoTransformation) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTransformation);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTransformation(history[historyIndex - 1]);
    }
  };

  // Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTransformation(history[historyIndex + 1]);
    }
  };

  // Update transformation
  const updateTransformation = (updates: Partial<VideoTransformation>) => {
    const newTransformation = { ...transformation, ...updates };
    setTransformation(newTransformation);
    addToHistory(newTransformation);
  };

  // Video controls
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get current video URL with transformations
  const getTransformedUrl = () => {
    return buildVideoTransformationUrl(videoUrl, transformation);
  };

  // Save transformation
  const handleSave = () => {
    onSave?.(transformation);
  };

  // Download video
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getTransformedUrl();
    link.download = 'edited-video.mp4';
    link.click();
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg ${className}`}>
      {/* Video Player */}
      <div className="relative bg-black rounded-t-lg">
        <Video
          ref={videoRef}
          src={getTransformedUrl()}
          className="w-full h-96 object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Video Overlay Controls */}
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={togglePlayPause}
              className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-gray-900" />
              ) : (
                <Play className="w-6 h-6 text-gray-900 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex items-center gap-3 text-white">
            <span className="text-sm">{formatTime(currentTime)}</span>
            <div className="flex-1 bg-white/30 rounded-full h-1">
              <div 
                className="bg-white rounded-full h-1 cursor-pointer"
                style={{ width: `${(currentTime / duration) * 100}%` }}
                onClick={(e) => {
                  const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                  if (rect) {
                    const clickX = e.clientX - rect.left;
                    const percentage = clickX / rect.width;
                    handleSeek(percentage * duration);
                  }
                }}
              />
            </div>
            <span className="text-sm">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo className="w-4 h-4" />
            </button>
            
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCrop(!showCrop)}
              className={`p-2 rounded-lg transition-colors ${
                showCrop 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Crop className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>

        {/* Crop Controls */}
        {showCrop && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Crop & Resize</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Width</label>
                <input
                  type="number"
                  value={transformation.width || 1080}
                  onChange={(e) => updateTransformation({ width: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Height</label>
                <input
                  type="number"
                  value={transformation.height || 1920}
                  onChange={(e) => updateTransformation({ height: parseInt(e.target.value) })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Crop Mode</label>
                <select
                  value={transformation.crop || 'maintain_ratio'}
                  onChange={(e) => updateTransformation({ crop: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800"
                >
                  <option value="maintain_ratio">Maintain Ratio</option>
                  <option value="force">Force</option>
                  <option value="at_least">At Least</option>
                  <option value="at_max">At Max</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Focus</label>
                <select
                  value={transformation.focus || 'auto'}
                  onChange={(e) => updateTransformation({ focus: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800"
                >
                  <option value="auto">Auto</option>
                  <option value="face">Face</option>
                  <option value="faces">Faces</option>
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="left">Left</option>
                  <option value="bottom">Bottom</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls */}
        {showFilters && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Video Effects</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rotation</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateTransformation({ rotation: (transformation.rotation || 0) - 90 })}
                    className="p-2 bg-gray-200 dark:bg-slate-600 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <span className="flex items-center px-3 py-2 bg-white dark:bg-slate-800 rounded-md">
                    {transformation.rotation || 0}°
                  </span>
                  <button
                    onClick={() => updateTransformation({ rotation: (transformation.rotation || 0) + 90 })}
                    className="p-2 bg-gray-200 dark:bg-slate-600 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
                  >
                    <RotateCw className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Flip</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateTransformation({ flip: 'horizontal' })}
                    className="p-2 bg-gray-200 dark:bg-slate-600 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateTransformation({ flip: 'vertical' })}
                    className="p-2 bg-gray-200 dark:bg-slate-600 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
                  >
                    <FlipVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Controls */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Video Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Quality</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={transformation.quality || 80}
                  onChange={(e) => updateTransformation({ quality: parseInt(e.target.value) })}
                  className="w-full"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {transformation.quality || 80}%
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Format</label>
                <select
                  value={transformation.format || 'auto'}
                  onChange={(e) => updateTransformation({ format: e.target.value as any })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-slate-800"
                >
                  <option value="auto">Auto</option>
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                  <option value="ogv">OGV</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Speed</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={transformation.speed || 1}
                  onChange={(e) => updateTransformation({ speed: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {transformation.speed || 1}x
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Volume</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 bg-gray-200 dark:bg-slate-600 rounded-md hover:bg-gray-300 dark:hover:bg-slate-500"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
