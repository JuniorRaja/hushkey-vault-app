import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  children?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  children,
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: "bg-red-900/30",
      text: "text-red-500",
      btn: "bg-red-600 hover:bg-red-500 shadow-red-900/20",
    },
    warning: {
      bg: "bg-yellow-900/30",
      text: "text-yellow-500",
      btn: "bg-yellow-600 hover:bg-yellow-500 text-white shadow-yellow-900/20",
    },
    info: {
      bg: "bg-blue-900/30",
      text: "text-blue-500",
      btn: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/20",
    },
  };

  const theme = colors[type];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="p-4 md:p-6 text-center relative z-10">
          <div
            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-5 ${theme.bg} ${theme.text}`}
          >
            <AlertTriangle size={24} className="md:w-7 md:h-7" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white mb-2">
            {title}
          </h3>
          <p className="text-gray-400 text-xs md:text-sm mb-6 md:mb-8 leading-relaxed">
            {message}
          </p>
          <div className="space-y-2 md:space-y-3">
            <div className="flex gap-2 md:gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 md:py-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 text-gray-300 rounded-xl text-sm md:text-base font-medium transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-2 md:py-3 rounded-xl text-sm md:text-base font-bold text-white transition-all shadow-lg active:scale-95 ${theme.btn}`}
              >
                {confirmText}
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
