import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 backdrop-blur-sm">
      <div className="w-24 h-24 rounded-full animate-spin"
           style={{
             border: '4px solid transparent',
             borderTopColor: 'var(--gradient-start)',
             borderRightColor: 'var(--gradient-end)'
           }}>
      </div>
    </div>
  );
};

export default Loader;