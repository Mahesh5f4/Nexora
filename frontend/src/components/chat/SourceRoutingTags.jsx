import { Globe, Zap, Database, Brain, Code2 } from 'lucide-react';

const Tag = ({ icon: Icon, label, color }) => (
  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border border-${color}-500/20 bg-${color}-500/10 text-${color}-400`}>
    <Icon size={10} />
    <span>{label}</span>
  </div>
);

const SourceRoutingTags = ({ flags }) => {
  if (!flags) return null;

  return (
    <div className="flex items-center gap-2 mb-3 mt-1">
      <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Sources:</span>
      {flags.needsWeb && <Tag icon={Globe} label="Web" color="blue" />}
      {flags.needsLlm && <Tag icon={Zap} label="LLM" color="purple" />}
      {flags.needsRag && <Tag icon={Database} label="Docs" color="orange" />}
      {flags.needsMemory && <Tag icon={Brain} label="Memory" color="teal" />}
      {flags.needsCode && <Tag icon={Code2} label="Code" color="emerald" />}
    </div>
  );
};

export default SourceRoutingTags;
