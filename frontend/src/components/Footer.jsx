import { Link } from 'react-router-dom';
import { Command, Mail, Globe } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    navigation: [
      { label: 'Discover', to: '/' },
      { label: 'Workspace', to: '/workspace' },
    ],
    legal: [
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Security', to: '/security' },
    ]
  };

  return (
    <footer className="mt-20 border-t border-white/5 bg-[#0A0A0A] px-6 py-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-6 space-y-6">
          <Link to="/" className="flex items-center gap-2 text-white font-medium hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center">
              <Command className="w-5 h-5" />
            </div>
            <span className="tracking-tight text-xl font-bold">ThinkAction Ai</span>
          </Link>
          <p className="text-white/40 text-sm max-w-sm leading-relaxed">
            Your intelligent workbench for advanced workflows, goal planning, and AI-powered research.
          </p>
          <div className="flex gap-4">
             <a href="mailto:mahesh20104@gmail.com" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5">
                <Mail size={18} />
             </a>
             <a href="https://github.com/Mahesh5f4" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5">
                <Globe size={18} />
             </a>
          </div>
        </div>

        <div className="md:col-span-3 space-y-6">
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Navigation</h4>
          <ul className="space-y-3">
            {footerLinks.navigation.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="text-white/60 hover:text-white text-sm font-medium transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-3 space-y-6">
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Legal</h4>
          <ul className="space-y-3">
            {footerLinks.legal.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="text-white/60 hover:text-white text-sm font-medium transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-white/30 text-xs font-medium text-center sm:text-left">
          © {currentYear} ThinkAction Ai. All rights reserved. <br className="sm:hidden" />
          <span className="sm:ml-2 mt-1 sm:mt-0 inline-block">
            Developed by <a href="https://www.linkedin.com/in/kondampudimaheshbabu" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors underline underline-offset-2">Mahesh</a>
          </span>
        </p>
        <div className="flex items-center gap-2 text-emerald-500/80 text-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Systems Optimal
        </div>
      </div>
    </footer>
  );
};

export default Footer;
