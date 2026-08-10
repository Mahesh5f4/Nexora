import { memo } from 'react';

const Badge = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-white/10 text-white border-white/20',
    secondary: 'bg-white/5 text-white/70 border-white/10',
    danger: 'bg-red-500/10 text-red-500 border-red-500/20',
    success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  return (
    <span className={`liquid-glass px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${variants[variant]} ${className} transform-gpu`}>
      {children}
    </span>
  );
};

export default memo(Badge);
