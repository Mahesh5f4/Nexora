import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Maximize2, X, FileText, FileSpreadsheet, Code2, Image as ImageIcon, Copy, Check, Eye } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(filename = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const map = {
    py: 'Python',
    js: 'JavaScript',
    jsx: 'React JSX',
    ts: 'TypeScript',
    tsx: 'React TSX',
    csv: 'CSV Data',
    json: 'JSON',
    sql: 'SQL',
    log: 'Log File',
    txt: 'Text Document',
    md: 'Markdown',
    markdown: 'Markdown',
    html: 'HTML',
    css: 'CSS',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML'
  };
  return map[ext] || ext.toUpperCase() || 'Document';
}

function isTextDoc(filename = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return ['md', 'markdown', 'txt', 'text', 'log'].includes(ext);
}

function getFileBadge(filename = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) {
    return {
      icon: <FileSpreadsheet size={18} className="text-emerald-400" />,
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    };
  }
  if (['py', 'js', 'jsx', 'ts', 'tsx', 'java', 'sql', 'json', 'yaml', 'yml', 'xml', 'html', 'css', 'cpp', 'c'].includes(ext)) {
    return {
      icon: <Code2 size={18} className="text-amber-400" />,
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    };
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return {
      icon: <ImageIcon size={18} className="text-pink-400" />,
      bg: 'bg-pink-500/10 border-pink-500/20 text-pink-400'
    };
  }
  return {
    icon: <FileText size={18} className="text-blue-400" />,
    bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
  };
}

export function parseUserMessageContent(content = '', existingFiles = []) {
  if (!content) return { cleanPrompt: '', parsedFiles: existingFiles || [] };

  const parsedFiles = [...(existingFiles || [])];
  let cleanPrompt = content;

  // Bulletproof regex: matches --- Attached File: <name> --- ... ```<ext> ... <code> ... ```
  // Handles CRLF, Colab filenames with spaces and parentheses, and optional agent prefix like "Analyze:"
  const fileBlockRegex = /(?:^|\r?\n)(?:Analyze:\s*)?---+[\t ]*Attached File:[\t ]*([^\r\n]+?)[\t ]*---+[\t ]*\r?\n```([^\r\n]*)\r?\n([\s\S]*?)(?:\r?\n```|$)/gi;

  let match;
  while ((match = fileBlockRegex.exec(content)) !== null) {
    const fileName = match[1].trim();
    const ext = match[2] ? match[2].trim() : '';
    const fileBody = match[3] || '';
    
    const existing = parsedFiles.find(f => f.name === fileName);
    if (!existing) {
      parsedFiles.push({
        name: fileName,
        ext: ext,
        content: fileBody,
        size: fileBody.length,
        type: 'file',
      });
    } else if (!existing.content && fileBody) {
      existing.content = fileBody;
    }
  }

  // Remove the attached file markdown blocks from the cleanPrompt
  cleanPrompt = cleanPrompt.replace(fileBlockRegex, '').trim();

  // Strip dangling agent triggers if no custom prompt was typed
  cleanPrompt = cleanPrompt.replace(/^(?:Analyze|Review|Plan|Research):\s*$/i, '').trim();
  cleanPrompt = cleanPrompt.replace(/^(?:Analyze|Review|Plan|Research):\s*(?=\r?\n|$)/i, '').trim();

  if (cleanPrompt === 'Analyze the attached file(s)' && parsedFiles.length > 0) {
    cleanPrompt = '';
  }

  return { cleanPrompt, parsedFiles };
}

export const UserMessageAttachments = ({ message }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [copied, setCopied] = useState(false);

  const images = message.images || [];
  const rawAttachments = message.attachments || [];
  const { cleanPrompt, parsedFiles } = parseUserMessageContent(message.content, rawAttachments.filter(a => a.type === 'file'));

  // Separate any image attachments that might have been passed in attachments array
  const allImages = [...images];
  rawAttachments.filter(a => a.type === 'image').forEach(imgAtt => {
    if (imgAtt.dataUrl && !allImages.includes(imgAtt.dataUrl)) {
      allImages.push(imgAtt.dataUrl);
    }
  });

  // Separate into text documents (.md, .txt) and code/data files (.py, .csv, etc.)
  const textDocFiles = parsedFiles.filter(f => isTextDoc(f.name));
  const codeFiles = parsedFiles.filter(f => !isTextDoc(f.name));

  const hasImages = allImages.length > 0;
  const hasCodeFiles = codeFiles.length > 0;
  const hasTextDocs = textDocFiles.length > 0;

  const handleCopyFileContent = (text) => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 max-w-full">
      {/* ─── CLAUDE-STYLE IMAGES (RENDERED ABOVE PROMPT) ───────────── */}
      {hasImages && (
        <div className="flex flex-wrap gap-2.5 items-start">
          {allImages.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImage(img)}
              className="relative group overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-lg hover:border-white/30 hover:shadow-2xl transition-all cursor-pointer max-w-xs sm:max-w-sm"
              title="Click to expand image"
            >
              <img
                src={img}
                alt={`Attached upload ${idx + 1}`}
                className="max-h-[380px] w-auto h-auto object-contain rounded-2xl block transition duration-200 group-hover:scale-[1.01]"
              />
              {/* Claude hover overlay with zoom badge */}
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium backdrop-blur-[2px]">
                <Maximize2 size={14} className="text-white drop-shadow" />
                <span className="drop-shadow">Click to enlarge</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── CODE & SCRIPT FILES (COMPACT CLAUDE FILE CARDS) ───────── */}
      {hasCodeFiles && (
        <div className="flex flex-wrap gap-2.5 items-start">
          {codeFiles.map((file, idx) => {
            const badge = getFileBadge(file.name);
            const typeLabel = getFileTypeLabel(file.name);
            return (
              <div
                key={idx}
                onClick={() => file.content && setSelectedFile(file)}
                className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all cursor-pointer select-none max-w-sm shadow-sm"
                title={file.content ? "Click to view file content" : file.name}
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${badge.bg}`}>
                  {badge.icon}
                </div>
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-[13px] font-semibold text-white/95 truncate max-w-[200px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {typeLabel} {file.size ? `• ${formatFileSize(file.size)}` : ''}
                  </span>
                </div>
                {file.content && (
                  <div className="text-zinc-400 group-hover:text-white transition ml-1 p-1 rounded-md hover:bg-white/10">
                    <Eye size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TEXT & MARKDOWN DOCUMENTS (NEVER OMITTED) ─────────────── */}
      {hasTextDocs && (
        <div className="flex flex-col gap-3 w-full">
          {textDocFiles.map((file, idx) => {
            const isMd = file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.markdown');
            return (
              <div key={idx} className="flex flex-col gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-3.5 shadow-sm max-w-2xl">
                {/* File badge header */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                      <FileText size={14} />
                    </div>
                    <span className="text-xs font-semibold text-white/95 truncate">{file.name}</span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      ({formatFileSize(file.size || file.content?.length)})
                    </span>
                  </div>
                  {file.content && (
                    <button
                      type="button"
                      onClick={() => handleCopyFileContent(file.content)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
                      title="Copy document text"
                    >
                      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                {/* Document content: Fully rendered, never omitted! */}
                {file.content ? (
                  <div className="max-h-[360px] overflow-y-auto custom-scrollbar text-zinc-200 text-xs sm:text-sm leading-relaxed pr-1 pt-1">
                    {isMd ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {file.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed text-zinc-300">
                        {file.content}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 italic py-1">
                    Document attached ({file.name})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── USER PROMPT TEXT (RENDERED BELOW ATTACHMENTS) ──────────── */}
      {cleanPrompt && (
        <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-white/95 mt-0.5">
          {cleanPrompt}
        </p>
      )}

      {/* ─── LIGHTBOX MODAL FOR FULL-RESOLUTION IMAGE ───────────────── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-11 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
              title="Close (Esc)"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>
            <img
              src={selectedImage}
              alt="Enlarged attachment"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/15 shadow-2xl bg-[#0e0e11]"
            />
          </div>
        </div>
      )}

      {/* ─── CLAUDE-STYLE FILE CODE PREVIEW MODAL ───────────────────── */}
      {selectedFile && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setSelectedFile(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#121216] border border-white/15 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-14 px-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${getFileBadge(selectedFile.name).bg}`}>
                  {getFileBadge(selectedFile.name).icon}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-white/95 truncate">{selectedFile.name}</span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {getFileTypeLabel(selectedFile.name)} • {formatFileSize(selectedFile.size || selectedFile.content.length)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyFileContent(selectedFile.content)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Copy file code"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Code Body */}
            <div className="flex-1 overflow-auto p-4 bg-[#0a0a0d] font-mono text-xs text-zinc-300 leading-relaxed custom-scrollbar">
              <pre className="whitespace-pre">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMessageAttachments;
