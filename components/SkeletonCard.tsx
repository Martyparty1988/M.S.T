import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="floating-card p-5 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-5 bg-white/10 rounded w-1/2"></div>
        <div className="h-4 bg-white/10 rounded w-1/4"></div>
      </div>
      <div className="h-3 bg-white/10 rounded w-1/3 mt-2"></div>
      <div className="h-4 bg-white/10 rounded w-3/4 mt-3"></div>
      <div className="h-3 bg-white/10 rounded w-1/2 mt-2"></div>
    </div>
  );
};

export default SkeletonCard;
