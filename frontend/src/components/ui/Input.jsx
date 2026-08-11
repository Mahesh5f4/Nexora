import { memo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({ label, error, icon: Icon, className = '', ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : props.type;

  return (
    <div className={`flex flex-col gap-2 transform-gpu ${className}`}>
      {label && <label className="text-xs font-medium text-white/50 ml-1 uppercase tracking-wider">{label}</label>}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          {...props}
          type={inputType}
          className={`ai-panel w-full bg-[#151515] text-white px-5 py-3 rounded-xl outline-none focus:bg-[#1a1a1a] transition-all duration-300 placeholder:text-white/20 text-sm transform-gpu ${Icon ? 'pl-12' : ''} ${isPassword ? 'pr-12' : ''} ${error ? 'border-red-500/50' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors focus:outline-none"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-500/80 ml-1">{error}</span>}
    </div>
  );
};

export default memo(Input);
