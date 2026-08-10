import { motion } from 'framer-motion';
import { Gavel, Scale, FileText, Globe, ShieldCheck } from 'lucide-react';
import Card from '../components/ui/Card';
import { Link } from 'react-router-dom';

const Legal = () => {
  const legalLinks = [
    { label: "Terms of Service", to: "/terms", icon: FileText },
    { label: "Privacy Policy", to: "/privacy", icon: Globe },
    { label: "Security Overview", to: "/security", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 transform-gpu antialiased">
      <div className="container mx-auto px-6 max-w-4xl">
        <header className="mb-20">
          <div className="flex items-center gap-4 text-white/20 mb-6">
            <Gavel size={32} />
            <div className="w-12 h-[1px] bg-white/10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Corporate Information</span>
          </div>
          <h1 className="text-5xl font-medium text-white tracking-tight mb-6">Legal Center</h1>
          <p className="text-white/40 text-xl font-light">Access our legal documents, compliance information, and corporate policies.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {legalLinks.map((link, i) => (
            <Link key={i} to={link.to}>
              <Card className="p-8 h-full group hover:bg-white/[0.07] transition-all transform-gpu text-center flex flex-col items-center">
                <div className="p-4 rounded-2xl bg-white/5 text-white/40 group-hover:text-white transition-colors mb-4 border border-white/5">
                  <link.icon size={24} />
                </div>
                <div className="text-white font-medium group-hover:text-white transition-colors">{link.label}</div>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="p-10 transform-gpu">
           <h3 className="text-xl font-medium text-white mb-6">Company Information</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                 <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Registered Office</div>
                 <p className="text-white/60 text-sm leading-relaxed">
                    ThinkAction AI<br />
                    Technology Park, Madhapur<br />
                    Hyderabad, TS 500081
                 </p>
              </div>
              <div className="space-y-4">
                 <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Corporate Contact</div>
                 <p className="text-white/60 text-sm leading-relaxed">
                    mahesh20104@gmail.com<br />
                    +91 6281835791
                 </p>
              </div>
           </div>
        </Card>
      </div>
    </div>
  );
};

export default Legal;
