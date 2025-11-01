import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface DaisyUIAlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export default function DaisyUIAlert({
  type,
  title,
  message,
  dismissible = false,
  onDismiss,
  className = ''
}: DaisyUIAlertProps) {
  const getAlertClass = () => {
    switch (type) {
      case 'success': return 'alert-success';
      case 'error': return 'alert-error';
      case 'warning': return 'alert-warning';
      case 'info': return 'alert-info';
      default: return 'alert-info';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className={`alert ${getAlertClass()} ${className}`}>
      {getIcon()}
      <div className="flex-1">
        {title && <h3 className="font-semibold">{title}</h3>}
        <span>{message}</span>
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="btn btn-sm btn-circle btn-ghost"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Convenience exports
export const SuccessAlert = (props: Omit<DaisyUIAlertProps, 'type'>) => (
  <DaisyUIAlert {...props} type="success" />
);

export const ErrorAlert = (props: Omit<DaisyUIAlertProps, 'type'>) => (
  <DaisyUIAlert {...props} type="error" />
);

export const WarningAlert = (props: Omit<DaisyUIAlertProps, 'type'>) => (
  <DaisyUIAlert {...props} type="warning" />
);

export const InfoAlert = (props: Omit<DaisyUIAlertProps, 'type'>) => (
  <DaisyUIAlert {...props} type="info" />
);
