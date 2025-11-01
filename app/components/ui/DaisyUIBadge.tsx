import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X, Star, Heart, Download, Share2, Eye, Clock, User, Users, Shield, Zap } from 'lucide-react';

type BadgeColor = 'primary' | 'secondary' | 'accent' | 'neutral' | 'base-100' | 'base-200' | 'base-300' | 'info' | 'success' | 'warning' | 'error';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';
type BadgeVariant = 'default' | 'outline' | 'ghost';

interface DaisyUIBadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  size?: BadgeSize;
  variant?: BadgeVariant;
  className?: string;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export default function DaisyUIBadge({
  children,
  color = 'primary',
  size = 'md',
  variant = 'default',
  className = '',
  icon,
  dismissible = false,
  onDismiss
}: DaisyUIBadgeProps) {
  const getBadgeClass = () => {
    const baseClass = 'badge';
    const colorClass = `badge-${color}`;
    const sizeClass = `badge-${size}`;
    const variantClass = variant === 'outline' ? 'badge-outline' : variant === 'ghost' ? 'badge-ghost' : '';
    
    return `${baseClass} ${colorClass} ${sizeClass} ${variantClass} ${className}`.trim();
  };

  return (
    <div className={getBadgeClass()}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {dismissible && (
        <button
          onClick={onDismiss}
          className="ml-1 hover:bg-base-content/20 rounded-full p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Status Badge Components
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'invisible';
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return { color: 'success', icon: <div className="w-2 h-2 bg-green-500 rounded-full" />, text: 'Online' };
      case 'offline':
        return { color: 'neutral', icon: <div className="w-2 h-2 bg-gray-400 rounded-full" />, text: 'Offline' };
      case 'busy':
        return { color: 'error', icon: <div className="w-2 h-2 bg-red-500 rounded-full" />, text: 'Busy' };
      case 'away':
        return { color: 'warning', icon: <div className="w-2 h-2 bg-yellow-500 rounded-full" />, text: 'Away' };
      case 'invisible':
        return { color: 'neutral', icon: <div className="w-2 h-2 bg-gray-300 rounded-full" />, text: 'Invisible' };
      default:
        return { color: 'neutral', icon: <div className="w-2 h-2 bg-gray-400 rounded-full" />, text: 'Unknown' };
    }
  };

  const config = getStatusConfig();

  return (
    <DaisyUIBadge color={config.color as BadgeColor} size="sm" className={className}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
    </DaisyUIBadge>
  );
}

// Notification Badge Component
interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

export function NotificationBadge({ count, max = 99, className = '' }: NotificationBadgeProps) {
  const displayCount = count > max ? `${max}+` : count.toString();
  
  if (count === 0) return null;

  return (
    <DaisyUIBadge 
      color="error" 
      size="xs" 
      className={`absolute -top-2 -right-2 min-w-[1.25rem] h-5 flex items-center justify-center ${className}`}
    >
      {displayCount}
    </DaisyUIBadge>
  );
}

// Action Badge Components
export function LikeBadge({ count, liked = false, className = '' }: { count: number; liked?: boolean; className?: string }) {
  return (
    <DaisyUIBadge 
      color={liked ? 'error' : 'neutral'} 
      size="sm" 
      icon={<Heart className="w-3 h-3" />}
      className={className}
    >
      {count}
    </DaisyUIBadge>
  );
}

export function ViewBadge({ count, className = '' }: { count: number; className?: string }) {
  return (
    <DaisyUIBadge 
      color="info" 
      size="sm" 
      icon={<Eye className="w-3 h-3" />}
      className={className}
    >
      {count}
    </DaisyUIBadge>
  );
}

export function ShareBadge({ count, className = '' }: { count: number; className?: string }) {
  return (
    <DaisyUIBadge 
      color="secondary" 
      size="sm" 
      icon={<Share2 className="w-3 h-3" />}
      className={className}
    >
      {count}
    </DaisyUIBadge>
  );
}

export function DownloadBadge({ count, className = '' }: { count: number; className?: string }) {
  return (
    <DaisyUIBadge 
      color="accent" 
      size="sm" 
      icon={<Download className="w-3 h-3" />}
      className={className}
    >
      {count}
    </DaisyUIBadge>
  );
}

// Priority Badge Component
interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  className?: string;
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  const getPriorityConfig = () => {
    switch (priority) {
      case 'low':
        return { color: 'success', text: 'Low', icon: <div className="w-2 h-2 bg-green-500 rounded-full" /> };
      case 'medium':
        return { color: 'warning', text: 'Medium', icon: <div className="w-2 h-2 bg-yellow-500 rounded-full" /> };
      case 'high':
        return { color: 'error', text: 'High', icon: <div className="w-2 h-2 bg-red-500 rounded-full" /> };
      case 'urgent':
        return { color: 'error', text: 'Urgent', icon: <Zap className="w-3 h-3" /> };
      default:
        return { color: 'neutral', text: 'Unknown', icon: <div className="w-2 h-2 bg-gray-400 rounded-full" /> };
    }
  };

  const config = getPriorityConfig();

  return (
    <DaisyUIBadge color={config.color as BadgeColor} size="sm" className={className}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
    </DaisyUIBadge>
  );
}

// Category Badge Component
interface CategoryBadgeProps {
  category: string;
  color?: BadgeColor;
  className?: string;
}

export function CategoryBadge({ category, color = 'primary', className = '' }: CategoryBadgeProps) {
  return (
    <DaisyUIBadge color={color} size="sm" className={className}>
      {category}
    </DaisyUIBadge>
  );
}

// Tag Badge Component
interface TagBadgeProps {
  tag: string;
  color?: BadgeColor;
  className?: string;
  onRemove?: () => void;
}

export function TagBadge({ tag, color = 'neutral', className = '', onRemove }: TagBadgeProps) {
  return (
    <DaisyUIBadge 
      color={color} 
      size="sm" 
      variant="outline"
      dismissible={!!onRemove}
      onDismiss={onRemove}
      className={className}
    >
      {tag}
    </DaisyUIBadge>
  );
}

// Progress Badge Component
interface ProgressBadgeProps {
  progress: number;
  max?: number;
  className?: string;
}

export function ProgressBadge({ progress, max = 100, className = '' }: ProgressBadgeProps) {
  const percentage = Math.round((progress / max) * 100);
  const color = percentage >= 100 ? 'success' : percentage >= 75 ? 'info' : percentage >= 50 ? 'warning' : 'error';
  
  return (
    <DaisyUIBadge color={color as BadgeColor} size="sm" className={className}>
      {percentage}%
    </DaisyUIBadge>
  );
}

// Time Badge Component
interface TimeBadgeProps {
  time: string | Date;
  className?: string;
}

export function TimeBadge({ time, className = '' }: TimeBadgeProps) {
  const date = new Date(time);
  const now = new Date();
  const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  let displayText: string;
  let color: BadgeColor = 'neutral';
  
  if (diffInHours < 1) {
    displayText = 'Just now';
    color = 'success';
  } else if (diffInHours < 24) {
    displayText = `${Math.floor(diffInHours)}h ago`;
    color = 'info';
  } else if (diffInHours < 168) { // 7 days
    displayText = `${Math.floor(diffInHours / 24)}d ago`;
    color = 'warning';
  } else {
    displayText = date.toLocaleDateString();
    color = 'neutral';
  }

  return (
    <DaisyUIBadge color={color} size="sm" icon={<Clock className="w-3 h-3" />} className={className}>
      {displayText}
    </DaisyUIBadge>
  );
}
