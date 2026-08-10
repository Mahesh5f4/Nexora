import { motion } from 'framer-motion';
import { HelpCircle, MessageSquare, Book, LifeBuoy, ArrowRight } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Help = () => {
  const faqs = [
    { q: "How do I book a ticket?", a: "Browse our curated events, select your preferred seat on the interactive map, and proceed to our secure checkout." },
    { q: "What is the refund policy?", a: "Refunds are available up to 48 hours before the event starts. Please contact our support for assistance." },
    { q: "How do I access my digital pass?", a: "Your tickets are stored in 'My Library' within your profile section. You can download them as PDFs anytime." },
    { q: "Is the seat map real-time?", a: "Yes, our interactive seat map uses WebSockets to show live seat availability and locks." }
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 transform-gpu antialiased">
      <div className="container mx-auto px-6 max-w-4xl">
        <header className="mb-20">
          <h1 className="text-5xl font-medium text-white tracking-tight mb-6">How can we help?</h1>
          <p className="text-white/40 text-xl font-light">Find answers to common questions or reach out to our support team.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <Card className="p-8 group hover:bg-white/[0.07] transition-all transform-gpu">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white mb-6 border border-white/5 transition-colors">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Live Support</h3>
            <p className="text-white/40 text-sm mb-6">Chat with our experience concierge for immediate assistance.</p>
            <Button variant="secondary" size="sm" className="w-full">Start Chat</Button>
          </Card>

          <Card className="p-8 group hover:bg-white/[0.07] transition-all transform-gpu">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white mb-6 border border-white/5 transition-colors">
              <LifeBuoy size={24} />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Email Us</h3>
            <p className="text-white/40 text-sm mb-6">Our dedicated support team typically responds within 2 hours.</p>
            <a href="mailto:mahesh20104@gmail.com">
              <Button variant="secondary" size="sm" className="w-full">Send Email</Button>
            </a>
          </Card>
        </div>

        <section className="space-y-8">
          <h2 className="text-2xl font-medium text-white flex items-center gap-3">
            <Book size={24} className="text-white/20" />
            Frequently Asked Questions
          </h2>
          <div className="grid gap-6">
            {faqs.map((faq, i) => (
              <Card key={i} className="p-8 transform-gpu">
                <h4 className="text-white font-medium mb-3">{faq.q}</h4>
                <p className="text-white/40 text-sm leading-relaxed">{faq.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <div className="mt-20 pt-12 border-t border-white/5 text-center">
          <p className="text-white/20 text-sm mb-8">Can't find what you're looking for?</p>
          <a href="mailto:mahesh20104@gmail.com">
            <Button variant="primary">Visit Support Center</Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Help;
