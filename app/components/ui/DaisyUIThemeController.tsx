"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette, 
  Settings, 
  Check, 
  ChevronDown,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

// Available DaisyUI themes
const availableThemes = [
  { name: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { name: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { name: 'cupcake', label: 'Cupcake', icon: <Palette className="w-4 h-4" /> },
  { name: 'bumblebee', label: 'Bumblebee', icon: <Palette className="w-4 h-4" /> },
  { name: 'emerald', label: 'Emerald', icon: <Palette className="w-4 h-4" /> },
  { name: 'corporate', label: 'Corporate', icon: <Palette className="w-4 h-4" /> },
  { name: 'synthwave', label: 'Synthwave', icon: <Palette className="w-4 h-4" /> },
  { name: 'retro', label: 'Retro', icon: <Palette className="w-4 h-4" /> },
  { name: 'cyberpunk', label: 'Cyberpunk', icon: <Palette className="w-4 h-4" /> },
  { name: 'valentine', label: 'Valentine', icon: <Palette className="w-4 h-4" /> },
  { name: 'halloween', label: 'Halloween', icon: <Palette className="w-4 h-4" /> },
  { name: 'garden', label: 'Garden', icon: <Palette className="w-4 h-4" /> },
  { name: 'forest', label: 'Forest', icon: <Palette className="w-4 h-4" /> },
  { name: 'aqua', label: 'Aqua', icon: <Palette className="w-4 h-4" /> },
  { name: 'lofi', label: 'Lofi', icon: <Palette className="w-4 h-4" /> },
  { name: 'pastel', label: 'Pastel', icon: <Palette className="w-4 h-4" /> },
  { name: 'fantasy', label: 'Fantasy', icon: <Palette className="w-4 h-4" /> },
  { name: 'wireframe', label: 'Wireframe', icon: <Palette className="w-4 h-4" /> },
  { name: 'black', label: 'Black', icon: <Palette className="w-4 h-4" /> },
  { name: 'luxury', label: 'Luxury', icon: <Palette className="w-4 h-4" /> },
  { name: 'dracula', label: 'Dracula', icon: <Palette className="w-4 h-4" /> },
  { name: 'cmyk', label: 'CMYK', icon: <Palette className="w-4 h-4" /> },
  { name: 'autumn', label: 'Autumn', icon: <Palette className="w-4 h-4" /> },
  { name: 'business', label: 'Business', icon: <Palette className="w-4 h-4" /> },
  { name: 'acid', label: 'Acid', icon: <Palette className="w-4 h-4" /> },
  { name: 'lemonade', label: 'Lemonade', icon: <Palette className="w-4 h-4" /> },
  { name: 'night', label: 'Night', icon: <Palette className="w-4 h-4" /> },
  { name: 'coffee', label: 'Coffee', icon: <Palette className="w-4 h-4" /> },
  { name: 'winter', label: 'Winter', icon: <Palette className="w-4 h-4" /> }
];

interface ThemeControllerProps {
  className?: string;
  showPreview?: boolean;
  showSystemTheme?: boolean;
  onThemeChange?: (theme: string) => void;
}

export default function DaisyUIThemeController({
  className = '',
  showPreview = true,
  showSystemTheme = true,
  onThemeChange
}: ThemeControllerProps) {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isOpen, setIsOpen] = useState(false);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  const applyTheme = useCallback((theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('daisyui-theme', theme);
    onThemeChange?.(theme);
  }, [onThemeChange]);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('daisyui-theme');
    if (savedTheme && availableThemes.find(t => t.name === savedTheme)) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? 'dark' : 'light';
      setSystemTheme(systemTheme);
      setCurrentTheme(systemTheme);
      applyTheme(systemTheme);
    }
  }, [applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);
      
      // Only apply system theme if no custom theme is set
      const savedTheme = localStorage.getItem('daisyui-theme');
      if (!savedTheme) {
        setCurrentTheme(newSystemTheme);
        applyTheme(newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme]);

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    setIsOpen(false);
  };

  const resetToSystem = () => {
    localStorage.removeItem('daisyui-theme');
    setCurrentTheme(systemTheme);
    applyTheme(systemTheme);
    setIsOpen(false);
  };

  const currentThemeInfo = availableThemes.find(t => t.name === currentTheme);

  return (
    <div className={`relative ${className}`}>
      {/* Theme Toggle Button */}
      <div className="dropdown dropdown-end">
        <div 
          tabIndex={0} 
          role="button" 
          className="btn btn-ghost btn-circle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {currentThemeInfo?.icon || <Palette className="w-5 h-5" />}
        </div>
        
        <div 
          tabIndex={0} 
          className={`dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-80 z-50 ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          <div className="p-4">
            <h3 className="font-semibold text-base-content mb-4">Choose Theme</h3>
            
            {/* Current Theme Display */}
            <div className="mb-4 p-3 bg-base-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {currentThemeInfo?.icon}
                <span className="font-medium">{currentThemeInfo?.label}</span>
                <span className="badge badge-sm badge-primary">Active</span>
              </div>
              {showPreview && (
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded bg-primary"></div>
                  <div className="w-3 h-3 rounded bg-secondary"></div>
                  <div className="w-3 h-3 rounded bg-accent"></div>
                  <div className="w-3 h-3 rounded bg-neutral"></div>
                </div>
              )}
            </div>

            {/* System Theme Option */}
            {showSystemTheme && (
              <div className="mb-4">
                <button
                  onClick={resetToSystem}
                  className="btn btn-sm btn-outline w-full justify-start"
                >
                  <Monitor className="w-4 h-4" />
                  System ({systemTheme})
                </button>
              </div>
            )}

            {/* Theme Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {availableThemes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => handleThemeChange(theme.name)}
                  className={`btn btn-sm justify-start ${
                    currentTheme === theme.name ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    {theme.icon}
                    <span className="flex-1 text-left">{theme.label}</span>
                    {currentTheme === theme.name && (
                      <Check className="w-4 h-4" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Theme Actions */}
            <div className="divider my-2"></div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
                  handleThemeChange(randomTheme.name);
                }}
                className="btn btn-sm btn-outline flex-1"
              >
                <RefreshCw className="w-4 h-4" />
                Random
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`data-theme="${currentTheme}"`);
                }}
                className="btn btn-sm btn-outline flex-1"
              >
                <Download className="w-4 h-4" />
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Theme Preview Component
interface ThemePreviewProps {
  theme: string;
  className?: string;
}

export function ThemePreview({ theme, className = '' }: ThemePreviewProps) {
  return (
    <div className={`p-4 rounded-lg border ${className}`} data-theme={theme}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <div className="w-3 h-3 rounded-full bg-secondary"></div>
          <div className="w-3 h-3 rounded-full bg-accent"></div>
        </div>
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-3">
            <h4 className="card-title text-sm">Sample Card</h4>
            <p className="text-xs text-base-content/70">Theme preview</p>
            <div className="card-actions justify-end">
              <button className="btn btn-primary btn-xs">Action</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Theme Customizer Component
interface ThemeCustomizerProps {
  className?: string;
}

export function ThemeCustomizer({ className = '' }: ThemeCustomizerProps) {
  const [customTheme, setCustomTheme] = useState({
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    neutral: '#374151',
    'base-100': '#ffffff',
    'base-200': '#f8fafc',
    'base-300': '#e2e8f0'
  });

  const applyCustomTheme = () => {
    const themeString = Object.entries(customTheme)
      .map(([key, value]) => `--${key}: ${value};`)
      .join(' ');
    
    document.documentElement.style.cssText = themeString;
  };

  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body">
        <h3 className="card-title">Custom Theme</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(customTheme).map(([key, value]) => (
            <div key={key} className="form-control">
              <label className="label">
                <span className="label-text">{key}</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => setCustomTheme(prev => ({
                    ...prev,
                    [key]: e.target.value
                  }))}
                  className="w-12 h-8 rounded border"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setCustomTheme(prev => ({
                    ...prev,
                    [key]: e.target.value
                  }))}
                  className="input input-bordered input-sm flex-1"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="card-actions justify-end">
          <button onClick={applyCustomTheme} className="btn btn-primary">
            Apply Theme
          </button>
        </div>
      </div>
    </div>
  );
}

// Theme Demo Component
export function ThemeDemo({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">DaisyUI Theme Controller</h2>
        <p className="text-base-content/70">
          Switch between different themes and customize your experience
        </p>
      </div>

      {/* Theme Controller */}
      <div className="flex justify-center">
        <DaisyUIThemeController showPreview={true} showSystemTheme={true} />
      </div>

      {/* Theme Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ThemePreview theme="light" />
        <ThemePreview theme="dark" />
        <ThemePreview theme="cupcake" />
        <ThemePreview theme="synthwave" />
        <ThemePreview theme="forest" />
        <ThemePreview theme="luxury" />
      </div>

      {/* Custom Theme Builder */}
      <ThemeCustomizer />
    </div>
  );
}
