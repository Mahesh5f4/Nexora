import { motion } from 'framer-motion';
import { Mail, ExternalLink, Code2, Cpu, Globe, Rocket, Terminal, BookOpen, Award, Briefcase, User } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

import maheshImg from '../assets/mahesh.jpg';

const About = () => {
  const skills = [
    { name: 'Java / Spring Boot', category: 'Backend' },
    { name: 'MySQL / Redis', category: 'Database' },
    { name: 'React / TypeScript', category: 'Frontend' },
    { name: 'REST APIs / Microservices', category: 'Architecture' },
    { name: 'Docker / CI-CD', category: 'DevOps' },
    { name: 'Concurrency / Performance', category: 'Specialty' },
  ];

  const projects = [
    {
      title: 'ThinkAction AI Workbench',
      desc: 'Production-style AI workbench engineered for advanced workflows, RAG, and agentic task planning.',
      tech: ['Spring Boot', 'React', 'LangChain', 'PostgreSQL'],
      metrics: 'Seamless multi-agent execution'
    },
    {
      title: 'Transactional Inventory Engine',
      desc: 'Transaction-safe inventory engine that prevents overselling under concurrent load.',
      tech: ['Java', 'Spring Boot', 'MySQL', 'Optimistic Locking'],
      metrics: 'Prevented overselling across 1,000+ transactions'
    },
    {
      title: 'Redis-Backed Rate Limiter',
      desc: 'Sliding-window rate limiter and auth gateway that protects upstream APIs.',
      tech: ['Redis', 'JWT', 'Spring Security'],
      metrics: 'ZSET-based sliding window — 100 req/min'
    }
  ];

  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70">
              <Terminal size={14} className="text-white" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Full-Stack Engineer</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-medium text-white tracking-tight leading-none">
              Engineer first.<br />
              <span className="text-white/40">Builder always.</span>
            </h1>

            <p className="text-white/60 text-xl leading-relaxed max-w-lg">
              Hi, I'm <span className="text-white font-medium">Mahesh Babu</span>. I obsess over what happens behind the scenes — race conditions, cache strategies, latency budgets — then ship the polished surface on top.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <a href="mailto:mahesh20104@gmail.com">
                <Button variant="primary" className="gap-2">
                  <Mail size={18} /> Get in Touch
                </Button>
              </a>
              <div className="flex gap-2">
                <a href="https://github.com/Mahesh5f4" target="_blank" rel="noopener noreferrer">
                  <button className="w-12 h-12 rounded-full liquid-glass flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/5">
                    <Globe size={20} />
                  </button>
                </a>
                <a href="https://linkedin.com/in/mahesh-babu-93024b2b2" target="_blank" rel="noopener noreferrer">
                  <button className="w-12 h-12 rounded-full liquid-glass flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/5">
                    <User size={20} />
                  </button>
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="aspect-square rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl relative group bg-white/5">
              <img 
                src={maheshImg} 
                alt="Mahesh Babu"
                className="w-full h-full object-cover transition-all duration-700"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
              
              <div className="absolute bottom-8 left-8 right-8 p-6 liquid-glass rounded-2xl border border-white/10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">Currently Based In</span>
                  <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Available for Role
                  </div>
                </div>
                <div className="text-white font-medium flex items-center gap-2">
                  <Globe size={16} className="text-white/40" />
                  Hyderabad, India
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-32">
          {[
            { label: 'Concurrent Requests', value: '10K+', icon: Cpu },
            { label: 'Performance Gains', value: '30%', icon: Rocket },
            { label: 'LeetCode Solved', value: '200+', icon: Code2 },
            { label: 'SQL Optimization', value: '20%', icon: BookOpen },
          ].map((stat, i) => (
            <Card key={i} className="p-8 flex flex-col items-center text-center group">
              <div className="p-4 rounded-2xl bg-white/5 text-white/40 group-hover:text-white transition-colors mb-4 border border-white/5">
                <stat.icon size={24} />
              </div>
              <div className="text-3xl font-medium text-white mb-2 tracking-tight">{stat.value}</div>
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Core Expertise */}
        <section className="mb-32">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div className="space-y-4">
              <h2 className="text-4xl font-medium text-white tracking-tight">Core Expertise</h2>
              <p className="text-white/40 text-lg max-w-md">Tools and technologies I reach for daily to build scalable systems.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skill, i) => (
              <div key={i} className="liquid-glass p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all transform-gpu">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{skill.category}</div>
                  <div className="text-white font-medium">{skill.name}</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/10 group-hover:text-white transition-colors">
                  <Code2 size={16} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Work & Projects */}
        <section className="mb-32">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
            <div className="space-y-4">
              <h2 className="text-4xl font-medium text-white tracking-tight">Technical Highlights</h2>
              <p className="text-white/40 text-lg max-w-md">Deep dives into concurrency, caching, and database internals.</p>
            </div>
            <a href="https://github.com/Mahesh5f4" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" className="gap-2">
                View GitHub <ExternalLink size={16} />
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {projects.map((project, i) => (
              <Card key={i} className="p-8 flex flex-col h-full group hover:bg-white/[0.07] transition-all transform-gpu">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white transition-colors mb-8 border border-white/5">
                  <Briefcase size={20} />
                </div>
                <h3 className="text-xl font-medium text-white mb-4 group-hover:text-white transition-colors">
                  {project.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed mb-8 flex-1">
                  {project.desc}
                </p>
                <div className="space-y-6 pt-6 border-t border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map(t => (
                      <Badge key={t} variant="secondary" className="bg-white/5 text-[9px]">{t}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-emerald-500/80 text-[10px] font-bold uppercase tracking-widest">
                    <Award size={14} />
                    {project.metrics}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Experience & Education */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-32">
           <div className="space-y-12">
              <h3 className="text-2xl font-medium text-white flex items-center gap-3">
                <Briefcase size={24} className="text-white/20" />
                Experience
              </h3>
              <div className="space-y-10">
                 {[
                   { role: 'Software Engineering Intern', company: 'SmartBridge', duration: 'Present', details: 'Built backend data pipelines handling 500+ daily records and optimized SQL execution time by 20%.' },
                   { role: 'Software Engineering Intern', company: 'Tech Octanet', duration: '2024', details: 'Built and tested 8+ REST APIs using Spring Boot and hardened exception handling logic.' }
                 ].map((exp, i) => (
                   <div key={i} className="relative pl-8 border-l border-white/5 group">
                      <div className="absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full bg-white/5 border border-white/10 group-hover:bg-white transition-colors" />
                      <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">{exp.duration}</div>
                      <div className="text-lg font-medium text-white mb-1">{exp.role}</div>
                      <div className="text-sm text-white/40 mb-3">{exp.company}</div>
                      <p className="text-white/40 text-sm leading-relaxed max-w-md">{exp.details}</p>
                   </div>
                 ))}
              </div>
           </div>

           <div className="space-y-12">
              <h3 className="text-2xl font-medium text-white flex items-center gap-3">
                <BookOpen size={24} className="text-white/20" />
                Education
              </h3>
              <div className="space-y-10">
                 <div className="relative pl-8 border-l border-white/5 group">
                    <div className="absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full bg-white/5 border border-white/10 group-hover:bg-white transition-colors" />
                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">2022 — 2026</div>
                    <div className="text-lg font-medium text-white mb-1">B.Tech in Computer Science</div>
                    <div className="text-sm text-white/40">Aditya Institute of Technology & Management</div>
                 </div>
              </div>
           </div>
        </div>

        {/* Footer Call to Action */}
        <Card className="p-16 text-center space-y-8 bg-gradient-to-br from-white/5 to-transparent border border-white/10 transform-gpu">
          <h2 className="text-4xl font-medium text-white tracking-tight">Let's build something scalable.</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto font-light">
            I'm currently looking for full-stack and backend roles where I can contribute to mission-critical systems and solve complex engineering challenges.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a href="mailto:mahesh20104@gmail.com">
               <Button variant="primary" className="px-10">Say Hello</Button>
            </a>
            <a href="https://linkedin.com/in/mahesh-babu-93024b2b2" target="_blank" rel="noopener noreferrer">
               <Button variant="secondary" className="px-10">LinkedIn</Button>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default About;
