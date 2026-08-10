import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Lock, Globe, Server, UserCheck } from 'lucide-react';
import Card from '../components/ui/Card';

const Security = () => {
  const features = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      desc: "All data transmitted between your browser and our servers is encrypted using industry-standard TLS 1.3 protocols."
    },
    {
      icon: Zap,
      title: "Real-time Monitoring",
      desc: "Our systems are monitored 24/7 for suspicious activity, ensuring the integrity of every booking transaction."
    },
    {
      icon: UserCheck,
      title: "Secure Authentication",
      desc: "We use JWT-based authentication and 2FA/OTP flows to ensure only you can access your digital event library."
    },
    {
      icon: Server,
      title: "Infrastructure",
      desc: "Hosted on enterprise-grade cloud infrastructure with multi-region redundancy and automatic failover systems."
    }
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 transform-gpu antialiased">
      <div className="container mx-auto px-6 max-w-4xl">
        <header className="mb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-8">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Enterprise Security</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-medium text-white tracking-tight mb-6">Built for Trust.</h1>
          <p className="text-white/40 text-xl font-light max-w-2xl mx-auto">We engineer our systems to the highest security standards to protect your experiences and data.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {features.map((feature, i) => (
            <Card key={i} className="p-8 transform-gpu group hover:bg-white/[0.07] transition-all">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-emerald-500 mb-6 border border-white/5 transition-colors">
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-medium text-white mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
            </Card>
          ))}
        </div>

        <div className="p-12 rounded-[3rem] liquid-glass border border-white/10 relative overflow-hidden transform-gpu">
           <div className="relative z-10 space-y-6">
              <h2 className="text-3xl font-medium text-white">Responsible Disclosure</h2>
              <p className="text-white/40 text-sm leading-relaxed max-w-xl">
                 If you discover a potential security vulnerability, we appreciate your help in disclosing it to us responsibly. Please reach out to our security team at mahesh20104@gmail.com.
              </p>
           </div>
           <ShieldCheck className="absolute right-[-40px] top-[-40px] w-64 h-64 text-white/[0.02] -rotate-12" />
        </div>
      </div>
    </div>
  );
};

export default Security;
