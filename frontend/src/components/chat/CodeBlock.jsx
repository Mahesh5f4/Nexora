import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

const CodeBlock = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  let codeContent = String(children).replace(/\n$/, '');
  
  // Fix AI hallucinations where extra backticks are placed inside the code block
  const trimmed = codeContent.trim();
  if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.includes('\n')) {
    codeContent = trimmed.substring(1, trimmed.length - 1).trim();
  }

  const handleCopy = () => {
    copyToClipboard(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code className="bg-white/10 text-gray-200 px-1.5 py-0.5 rounded text-[0.85em] font-mono break-words" {...props}>
        {children}
      </code>
    );
  }

  return (
    /* §7 Code Researcher spec: Code blocks bg-white/5 rounded-2xl p-4 overflow-x-auto */
    <div className="my-4 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shadow-lg flex flex-col font-mono text-[13px] w-full">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          {lang && (
            <span className="text-white/40 text-xs font-semibold uppercase tracking-wider ml-2">
              {lang}
            </span>
          )}
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span className="text-xs font-medium">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={lang || 'text'}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
          {...props}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
