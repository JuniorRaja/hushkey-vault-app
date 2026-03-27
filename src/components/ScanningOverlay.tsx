import React from 'react';

interface ScanningOverlayProps {
  progress: number;
  status: string;
}

const ScanningOverlay: React.FC<ScanningOverlayProps> = ({ progress, status }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-md animate-fade-in">
    <div className="w-24 h-24 relative mb-8">
      <svg className="animate-spin text-primary-600 w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-lg">
        {Math.round(progress)}%
      </div>
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">{status}</h2>
    <p className="text-gray-400">Please wait while we analyze your vault...</p>
  </div>
);

export default ScanningOverlay;