"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  systemTheme: 'light' | 'dark';
  isSystemTheme: boolean;
  setSystemTheme: (useSystem: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState('light');
  const [systemTheme, setSystemThemeState] = useState<'light' | 'dark'>('light');
  const [isSystemTheme, setIsSystemTheme] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = () => {
      // Check for saved theme
      const savedTheme = localStorage.getItem('daisyui-theme');
      const savedSystemTheme = localStorage.getItem('daisyui-use-system-theme');
      
      if (savedTheme && !savedSystemTheme) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
        setIsSystemTheme(false);
      } else {
        // Use system theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = prefersDark ? 'dark' : 'light';
        setSystemThemeState(systemTheme);
        setThemeState(systemTheme);
        applyTheme(systemTheme);
        setIsSystemTheme(true);
      }
      setIsLoaded(true);
    };

    // Only run on client side and after hydration
    if (typeof window !== 'undefined') {
      // Use setTimeout to ensure hydration is complete
      setTimeout(initializeTheme, 0);
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemThemeState(newSystemTheme);
      
      if (isSystemTheme) {
        setThemeState(newSystemTheme);
        applyTheme(newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isSystemTheme]);

  const applyTheme = (newTheme: string) => {
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('daisyui-theme', newTheme);
    setIsSystemTheme(false);
    localStorage.removeItem('daisyui-use-system-theme');
  };

  const setSystemTheme = (useSystem: boolean) => {
    if (useSystem) {
      setIsSystemTheme(true);
      setThemeState(systemTheme);
      applyTheme(systemTheme);
      localStorage.setItem('daisyui-use-system-theme', 'true');
      localStorage.removeItem('daisyui-theme');
    } else {
      setIsSystemTheme(false);
      localStorage.removeItem('daisyui-use-system-theme');
    }
  };


  // Prevent hydration mismatch
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        systemTheme,
        isSystemTheme,
        setSystemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Theme initialization script
export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            // Only run after DOM is ready to prevent hydration mismatch
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', applyTheme);
            } else {
              applyTheme();
            }
            
            function applyTheme() {
              try {
                const savedTheme = localStorage.getItem('daisyui-theme');
                const useSystemTheme = localStorage.getItem('daisyui-use-system-theme');
                
                if (savedTheme && !useSystemTheme) {
                  document.documentElement.setAttribute('data-theme', savedTheme);
                } else {
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const systemTheme = prefersDark ? 'dark' : 'light';
                  document.documentElement.setAttribute('data-theme', systemTheme);
                }
              } catch (e) {
                document.documentElement.setAttribute('data-theme', 'light');
              }
            }
          })();
        `,
      }}
    />
  );
}
