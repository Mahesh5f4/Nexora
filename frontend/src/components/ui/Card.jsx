import { memo } from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`liquid-glass bg-white/5 p-5 rounded-2xl transition-all duration-300 hover:bg-white/10 transform-gpu ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default memo(Card);
