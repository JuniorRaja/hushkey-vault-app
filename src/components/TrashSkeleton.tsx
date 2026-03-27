import React from 'react';

const TrashSkeleton: React.FC = () => {
  return (
    <div className="divide-y divide-gray-800">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-800 shrink-0" />
            <div>
              <div className="h-5 w-32 bg-gray-800 rounded mb-2" />
              <div className="h-3 w-48 bg-gray-800 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="h-8 w-20 bg-gray-800 rounded-lg" />
            <div className="h-8 w-28 bg-gray-800 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrashSkeleton;
