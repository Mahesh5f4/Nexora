import { motion } from 'framer-motion';
import { Shield, Scale, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import SEO from '../components/SEO';

const Terms = () => {
  const sections = [
    {
      title: "Agreement to Terms",
      content: "By accessing ThinkAction AI, you agree to be bound by these Terms and Conditions. These terms govern your use of our platform and the purchase of digital event passes."
    },
    {
      title: "Booking & Payments",
      content: "All bookings are subject to availability. Payments are processed securely via our integrated payment gateway. Tickets are confirmed only after successful payment processing."
    },
    {
      title: "Refunds & Cancellations",
      content: "Refund policies vary by event. Standard cancellations are permitted up to 48 hours before the event, subject to a 10% processing fee. No refunds are provided for no-shows."
    },
    {
      title: "User Conduct",
      content: "Users must provide accurate information during registration. Any attempt to manipulate the seat map or exploit system vulnerabilities will result in an immediate account ban."
    }
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 transform-gpu antialiased">
      <SEO 
        title="Terms of Service — ThinkAction AI"
        description="Review the Terms and Conditions governing your use of ThinkAction AI."
        keywords="ThinkAction AI terms, terms of service, user agreement"
      />
      <div className="container mx-auto px-6 max-w-4xl">
        <header className="mb-20">
          <div className="flex items-center gap-4 text-white/20 mb-6">
            <Scale size={32} />
            <div className="w-12 h-[1px] bg-white/10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Legal Framework</span>
          </div>
          <h1 className="text-5xl font-medium text-white tracking-tight mb-6">Terms of Service</h1>
          <p className="text-white/40 text-xl font-light">Last updated: May 2026. Please read these terms carefully before using our services.</p>
        </header>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <Card key={i} className="p-10 transform-gpu">
              <div className="flex gap-8">
                <div className="text-white/10 text-2xl font-mono font-bold">{(i + 1).toString().padStart(2, '0')}</div>
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white tracking-tight">{section.title}</h3>
                  <p className="text-white/40 leading-relaxed text-sm">{section.content}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <footer className="mt-20 pt-12 border-t border-white/5">
          <p className="text-white/20 text-xs leading-relaxed max-w-2xl">
            These terms constitute a binding legal agreement between you and ThinkAction AI. We reserve the right to modify these terms at any time. Continued use of the platform implies acceptance of updated terms.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Terms;
