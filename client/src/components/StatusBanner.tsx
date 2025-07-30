import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBannerProps {
  type: 'success' | 'error' | 'info';
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export function StatusBanner({ type, message, isVisible, onClose }: StatusBannerProps) {
  if (!isVisible) return null;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  };

  const styles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800", 
    info: "bg-blue-50 border-blue-200 text-blue-800"
  };

  const iconStyles = {
    success: "text-green-500",
    error: "text-red-500",
    info: "text-blue-500"
  };

  const Icon = icons[type];

  return (
    <div className={cn(
      "rounded-lg p-4 border flex items-start space-x-3",
      styles[type]
    )}>
      <Icon className={cn("text-lg mt-0.5 h-5 w-5", iconStyles[type])} />
      <div className="flex-1">
        <p className="font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 ml-2"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
