"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

type NotificationType = "success" | "error" | "warning" | "info";

interface NotificationContextType {
  showNotification: (message: string, type: NotificationType) => void;
  showToast: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
    id: number;
  } | null>(null);

  const [toasts, setToasts] = useState<Array<{
    message: string;
    type: NotificationType;
    id: number;
  }>>([]);

  const showNotification = (message: string, type: NotificationType) => {
    const id = Date.now();
    setNotification({ message, type, id });
    setTimeout(() => {
      setNotification((current) => (current?.id === id ? null : current));
    }, 5000);
  };

  const showToast = (message: string, type: NotificationType) => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4000);
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, showToast }}>
      {children}
      
      {/* DaisyUI Alert Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] animate-fade-in-up">
          <div className={`alert ${getDaisyUIAlertClass(notification.type)} max-w-md shadow-lg`}>
            <div className="flex items-center gap-3">
              {getDaisyUIIcon(notification.type)}
              <span className="text-sm font-medium">
                {notification.message}
              </span>
            </div>
            <button
              onClick={dismissNotification}
              className="btn btn-sm btn-circle btn-ghost"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DaisyUI Toast Notifications */}
      <div className="toast toast-top toast-end z-[100]">
        {toasts.map((toast) => (
          <div key={toast.id} className={`alert ${getDaisyUIAlertClass(toast.type)} shadow-lg animate-fade-in-up`}>
            <div className="flex items-center gap-3">
              {getDaisyUIIcon(toast.type)}
              <span className="text-sm font-medium">
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="btn btn-sm btn-circle btn-ghost"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

function getDaisyUIAlertClass(type: NotificationType): string {
  switch (type) {
    case "success":
      return "alert-success";
    case "error":
      return "alert-error";
    case "warning":
      return "alert-warning";
    case "info":
      return "alert-info";
    default:
      return "alert-info";
  }
}

function getDaisyUIIcon(type: NotificationType): React.ReactNode {
  switch (type) {
    case "success":
      return <CheckCircle className="w-5 h-5" />;
    case "error":
      return <AlertCircle className="w-5 h-5" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5" />;
    case "info":
      return <Info className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
  }
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    // Return a fallback implementation to prevent crashes during SSR/hydration
    console.warn("useNotification must be used within a NotificationProvider. Using fallback.");
    return {
      showNotification: (message: string, type: NotificationType) => {
        console.log(`[${type.toUpperCase()}] ${message}`);
      },
      showToast: (message: string, type: NotificationType) => {
        console.log(`[TOAST ${type.toUpperCase()}] ${message}`);
      }
    };
  }
  return context;
}
