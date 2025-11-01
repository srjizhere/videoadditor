import React from 'react';
import Image from 'next/image';
import { User, Users, Crown, Shield, Star, Heart, Zap, CheckCircle } from 'lucide-react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarShape = 'circle' | 'square';
type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

interface DaisyUIAvatarProps {
  src?: string;
  alt?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  className?: string;
  placeholder?: React.ReactNode;
  status?: AvatarStatus;
  statusPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  onClick?: () => void;
  children?: React.ReactNode;
}

export default function DaisyUIAvatar({
  src,
  alt = 'Avatar',
  size = 'md',
  shape = 'circle',
  className = '',
  placeholder,
  status,
  statusPosition = 'bottom-right',
  onClick,
  children
}: DaisyUIAvatarProps) {
  const getSizeClass = () => {
    switch (size) {
      case 'xs': return 'w-6 h-6';
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-12 h-12';
      case 'lg': return 'w-16 h-16';
      case 'xl': return 'w-24 h-24';
      default: return 'w-12 h-12';
    }
  };

  const getShapeClass = () => {
    return shape === 'circle' ? 'rounded-full' : 'rounded-lg';
  };

  const getStatusClass = () => {
    if (!status) return '';
    
    const baseClass = 'absolute w-3 h-3 rounded-full border-2 border-white';
    const positionClass = {
      'top-right': 'top-0 right-0',
      'bottom-right': 'bottom-0 right-0',
      'top-left': 'top-0 left-0',
      'bottom-left': 'bottom-0 left-0'
    }[statusPosition];
    
    const statusColor = {
      'online': 'bg-green-500',
      'offline': 'bg-gray-400',
      'busy': 'bg-red-500',
      'away': 'bg-yellow-500'
    }[status];
    
    return `${baseClass} ${positionClass} ${statusColor}`;
  };

  const avatarClass = `avatar ${getSizeClass()} ${getShapeClass()} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`;

  return (
    <div className={`relative inline-block ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className={`${avatarClass} relative`}>
        {src ? (
          <Image 
            src={src} 
            alt={alt} 
            fill
            className={`${getShapeClass()} object-cover`} 
          />
        ) : (
          <div className={`${getShapeClass()} w-full h-full bg-base-300 flex items-center justify-center`}>
            {placeholder || <User className="w-6 h-6 text-base-content/50" />}
          </div>
        )}
      </div>
      {status && <div className={getStatusClass()}></div>}
      {children}
    </div>
  );
}

// Avatar Group Component
interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    alt?: string;
    name?: string;
    status?: AvatarStatus;
  }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
  onAvatarClick?: (index: number) => void;
}

export function AvatarGroup({ 
  avatars, 
  max = 3, 
  size = 'md', 
  className = '',
  onAvatarClick 
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={`avatar-group -space-x-2 ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <DaisyUIAvatar
          key={index}
          src={avatar.src}
          alt={avatar.alt || avatar.name || `Avatar ${index + 1}`}
          size={size}
          status={avatar.status}
          onClick={() => onAvatarClick?.(index)}
          className="border-2 border-white"
        />
      ))}
      {remainingCount > 0 && (
        <div className={`avatar ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : size === 'lg' ? 'w-16 h-16' : 'w-24 h-24'} placeholder border-2 border-white`}>
          <div className="bg-neutral text-neutral-content rounded-full w-full h-full flex items-center justify-center text-xs font-bold">
            +{remainingCount}
          </div>
        </div>
      )}
    </div>
  );
}

// User Avatar Component
interface UserAvatarProps {
  user: {
    name?: string;
    email?: string;
    image?: string;
    status?: AvatarStatus;
  };
  size?: AvatarSize;
  showStatus?: boolean;
  className?: string;
  onClick?: () => void;
}

export function UserAvatar({ 
  user, 
  size = 'md', 
  showStatus = true, 
  className = '',
  onClick 
}: UserAvatarProps) {
  const getInitials = () => {
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const placeholder = (
    <div className="w-full h-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-bold">
      {getInitials()}
    </div>
  );

  return (
    <DaisyUIAvatar
      src={user.image}
      alt={user.name || user.email || 'User'}
      size={size}
      placeholder={placeholder}
      status={showStatus ? user.status : undefined}
      className={className}
      onClick={onClick}
    />
  );
}

// Role Avatar Component
interface RoleAvatarProps {
  role: 'admin' | 'moderator' | 'user' | 'premium' | 'vip';
  size?: AvatarSize;
  className?: string;
  onClick?: () => void;
}

export function RoleAvatar({ role, size = 'md', className = '', onClick }: RoleAvatarProps) {
  const getRoleConfig = () => {
    switch (role) {
      case 'admin':
        return { 
          icon: <Crown className="w-6 h-6" />, 
          color: 'bg-red-500', 
          borderColor: 'border-red-500' 
        };
      case 'moderator':
        return { 
          icon: <Shield className="w-6 h-6" />, 
          color: 'bg-blue-500', 
          borderColor: 'border-blue-500' 
        };
      case 'premium':
        return { 
          icon: <Star className="w-6 h-6" />, 
          color: 'bg-yellow-500', 
          borderColor: 'border-yellow-500' 
        };
      case 'vip':
        return { 
          icon: <Zap className="w-6 h-6" />, 
          color: 'bg-purple-500', 
          borderColor: 'border-purple-500' 
        };
      default:
        return { 
          icon: <User className="w-6 h-6" />, 
          color: 'bg-gray-500', 
          borderColor: 'border-gray-500' 
        };
    }
  };

  const config = getRoleConfig();

  return (
    <div className={`relative ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>
      <div className={`avatar ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : size === 'lg' ? 'w-16 h-16' : 'w-24 h-24'} ${config.color} rounded-full flex items-center justify-center text-white border-2 ${config.borderColor}`}>
        {config.icon}
      </div>
    </div>
  );
}

// Achievement Avatar Component
interface AchievementAvatarProps {
  achievement: {
    name: string;
    icon: React.ReactNode;
    color: string;
    unlocked: boolean;
  };
  size?: AvatarSize;
  className?: string;
  onClick?: () => void;
}

export function AchievementAvatar({ 
  achievement, 
  size = 'md', 
  className = '',
  onClick 
}: AchievementAvatarProps) {
  return (
    <div className={`relative ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>
      <div className={`avatar ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : size === 'lg' ? 'w-16 h-16' : 'w-24 h-24'} ${achievement.color} rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg`}>
        {achievement.icon}
      </div>
      {achievement.unlocked && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}

// Online Users Component
interface OnlineUsersProps {
  users: Array<{
    id: string;
    name: string;
    image?: string;
    status: AvatarStatus;
  }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
  onUserClick?: (userId: string) => void;
}

export function OnlineUsers({ 
  users, 
  max = 5, 
  size = 'sm', 
  className = '',
  onUserClick 
}: OnlineUsersProps) {
  const onlineUsers = users.filter(user => user.status === 'online');
  const visibleUsers = onlineUsers.slice(0, max);
  const remainingCount = onlineUsers.length - max;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-base-content/70">Online:</span>
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <DaisyUIAvatar
            key={user.id}
            src={user.image}
            alt={user.name}
            size={size}
            status="online"
            onClick={() => onUserClick?.(user.id)}
            className="border-2 border-white hover:z-10 transition-transform hover:scale-110"
          />
        ))}
        {remainingCount > 0 && (
          <div className={`avatar ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : size === 'lg' ? 'w-16 h-16' : 'w-24 h-24'} placeholder border-2 border-white`}>
            <div className="bg-neutral text-neutral-content rounded-full w-full h-full flex items-center justify-center text-xs font-bold">
              +{remainingCount}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
