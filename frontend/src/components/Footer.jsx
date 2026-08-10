import { Link } from 'react-router-dom';
import { Infinity, Mail, Phone, MapPin, Globe, ShieldCheck, ArrowUpRight } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    navigation: [
      { label: 'Discover', to: '/' },
      { label: 'About', to: '/about' },
      { label: 'Dashboard', to: '/workspace' },
      { label: 'Admin', to: '/admin' },
    ],
    legal: [
      { label: 'Legal Center', to: '/legal' },
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Security', to: '/security' },
    ],
    support: [
      { label: 'Help', to: '/help' },
      { label: 'Contact', to: 'mailto:mahesh20104@gmail.com' },
    ]
  };

  return (
    <footer className="mt-20 px-6 pb-12 transform-gpu antialiased">
      <div className="liquid-glass rounded-[3rem] p-12 md:p-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-16">
          {/* Brand Section */}
          <div className="lg:col-span-5 space-y-8">
            <Link to="/" className="flex items-center gap-2 text-white font-medium">
              <Infinity size={32} strokeWidth={1.5} />
              <span className="tracking-tight text-2xl font-semibold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">ThinkAction AI</span>
            </Link>
            
            <p className="text-white/40 text-lg leading-relaxed max-w-sm">
              Your intelligent workbench for advanced workflows, goal planning, and AI-powered research.
            </p>

            <div className="flex gap-4">
               <a href="mailto:mahesh20104@gmail.com" className="w-10 h-10 rounded-xl liquid-glass flex items-center justify-center text-white/40 hover:text-white transition-all transform-gpu border border-white/5">
                  <Mail size={20} />
               </a>
               <a href="https://github.com/Mahesh5f4" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl liquid-glass flex items-center justify-center text-white/40 hover:text-white transition-all transform-gpu border border-white/5">
                  <Globe size={20} />
               </a>
            </div>
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="space-y-8">
              <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Navigation</h4>
              <ul className="space-y-4">
                {footerLinks.navigation.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-white/40 hover:text-white transition-colors text-sm font-medium">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Legal</h4>
              <ul className="space-y-4">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-white/40 hover:text-white transition-colors text-sm font-medium">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Support</h4>
              <ul className="space-y-4">
                {footerLinks.support.map((link) => (
                  <li key={link.label}>
                    {link.to.startsWith('mailto:') ? (
                      <a href={link.to} className="text-white/40 hover:text-white transition-colors text-sm font-medium">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.to} className="text-white/40 hover:text-white transition-colors text-sm font-medium">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
                <li className="flex items-center gap-3 pt-4">
                  <Mail size={16} className="text-white/20" />
                  <a href="mailto:mahesh20104@gmail.com" className="text-xs text-white/40 hover:text-white truncate">
                    mahesh20104@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-4">
            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">
              © {currentYear} THINKACTION AI. ALL RIGHTS RESERVED.
            </p>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40" />
                  Systems: Optimal
               </div>
               <div className="w-1 h-1 rounded-full bg-white/5" />
               <div className="flex items-center gap-2 text-white/20 text-[10px] font-bold uppercase tracking-widest">
                  <Globe size={12} /> EN-US
               </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
             <div className="flex items-center gap-3 text-white/10">
                <ShieldCheck size={20} />
                <span className="text-[10px] font-bold uppercase tracking-widest">SSL Encrypted</span>
             </div>
             <div className="flex items-center gap-6 opacity-20 grayscale">
                <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-4" />
                <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-6" />
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
