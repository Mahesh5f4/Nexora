import { memo } from 'react';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`ai-card p-5 transition-all duration-300 transform-gpu ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default memo(Card);
