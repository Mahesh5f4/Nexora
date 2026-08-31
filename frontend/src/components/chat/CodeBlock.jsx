import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Terminal } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

// Custom Claude-inspired syntax theme overrides for crisp, readable code presentation
const claudeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'transparent',
    margin: 0,
    padding: '1rem 1.25rem',
    fontSize: '13px',
    lineHeight: '1.6',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '13px',
    lineHeight: '1.6',
  }
};

const CodeBlock = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const rawLang = match ? match[1] : '';
  const lang = rawLang.toLowerCase();
  
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
      <code 
        className="bg-zinc-800/80 text-purple-200 border border-zinc-700/50 px-1.5 py-0.5 rounded-md text-[0.85em] font-mono tracking-tight select-all" 
        {...props}
      >
        {children}
      </code>
    );
  }

  const lineCount = codeContent.split('\n').length;
  const showLineNumbers = lineCount > 4;

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-800 bg-[#0d0d10] shadow-[0_4px_24px_rgba(0,0,0,0.4)] flex flex-col font-mono text-[13px] w-full group/code">
      {/* Claude-style Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#16161a] border-b border-zinc-800/80 select-none">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono font-medium text-zinc-400 lowercase tracking-wide flex items-center gap-1.5">
            {lang === 'bash' || lang === 'sh' || lang === 'shell' ? (
              <Terminal size={12} className="text-zinc-500" />
            ) : null}
            {lang || 'code'}
          </span>
          {lineCount > 1 && (
            <span className="text-[11px] text-zinc-500 font-sans">
              · {lineCount} lines
            </span>
          )}
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.06] transition-all text-xs cursor-pointer select-none"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400 stroke-[2.5]" />
              <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span className="text-[11px] font-medium">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="w-full overflow-x-auto custom-scrollbar bg-[#0d0d10]">
        <SyntaxHighlighter
          style={claudeTheme}
          language={lang || 'text'}
          PreTag="div"
          showLineNumbers={showLineNumbers}
          lineNumberStyle={{
            minWidth: '2.5rem',
            paddingRight: '1rem',
            color: 'rgba(255, 255, 255, 0.18)',
            textAlign: 'right',
            userSelect: 'none',
            fontSize: '12px'
          }}
          customStyle={{
            margin: 0,
            padding: showLineNumbers ? '1rem 1.25rem 1rem 0.5rem' : '1rem 1.25rem',
            background: 'transparent',
            fontSize: '13px',
            lineHeight: '1.6',
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
