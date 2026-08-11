import { memo } from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  loading = false, 
  disabled = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-white text-black hover:bg-white/90',
    secondary: 'bg-white/5 text-white hover:bg-white/10 border border-white/5',
    outline: 'border border-white/10 text-white hover:bg-white/5',
    ghost: 'text-white/70 hover:text-white',
    danger: 'bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-full min-h-[44px]',
    md: 'px-6 py-3 text-base rounded-full min-h-[44px]',
    lg: 'px-8 py-4 text-lg rounded-full min-h-[48px]',
    icon: 'p-2.5 rounded-full min-h-[44px] min-w-[44px]',
  };

  return (
    <button
      className={`flex items-center justify-center gap-2 font-medium transition-all duration-300 transform-gpu active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : children}
    </button>
  );
};

export default memo(Button);
