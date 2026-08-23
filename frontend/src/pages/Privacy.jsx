import { motion } from 'framer-motion';
import { ShieldCheck, Eye, Database, Lock } from 'lucide-react';
import Card from '../components/ui/Card';
import SEO from '../components/SEO';

const Privacy = () => {
  const points = [
    {
      icon: Eye,
      title: "Data Collection",
      desc: "We collect only essential information: your name, email, and booking history. We never track your browsing behavior outside our platform."
    },
    {
      icon: Lock,
      title: "Secure Storage",
      desc: "All personal data is encrypted and stored in secure, distributed databases. Payment information is never stored on our servers."
    },
    {
      icon: ShieldCheck,
      title: "Data Usage",
      desc: "Your data is used exclusively to facilitate event bookings and provide you with digital passes. We do not sell your data to third parties."
    },
    {
      icon: Database,
      title: "Your Rights",
      desc: "You have the right to access, export, or delete your data at any time through your profile settings or by contacting our support team."
    }
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 transform-gpu antialiased">
      <SEO 
        title="Privacy Policy — ThinkAction AI"
        description="Understand how ThinkAction AI protects your personal information and preserves data privacy."
        keywords="ThinkAction AI privacy, data protection, privacy policy"
      />
      <div className="container mx-auto px-6 max-w-4xl">
        <header className="mb-20">
          <div className="flex items-center gap-4 text-emerald-500/40 mb-6">
            <ShieldCheck size={32} />
            <div className="w-12 h-[1px] bg-emerald-500/10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500/60">Privacy First</span>
          </div>
          <h1 className="text-5xl font-medium text-white tracking-tight mb-6">Privacy Policy</h1>
          <p className="text-white/40 text-xl font-light">We respect your privacy. This policy outlines how we handle your digital footprint.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {points.map((point, i) => (
            <Card key={i} className="p-8 group hover:bg-white/[0.07] transition-all transform-gpu">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-emerald-500 mb-6 border border-white/5 transition-colors">
                <point.icon size={24} />
              </div>
              <h3 className="text-xl font-medium text-white mb-3 tracking-tight">{point.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{point.desc}</p>
            </Card>
          ))}
        </div>

        <div className="mt-20 p-10 liquid-glass rounded-3xl border border-white/5 text-center transform-gpu">
          <p className="text-white font-medium mb-4">Have questions about your data?</p>
          <p className="text-white/40 text-sm mb-8">Contact our Data Protection Officer at mahesh20104@gmail.com</p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
