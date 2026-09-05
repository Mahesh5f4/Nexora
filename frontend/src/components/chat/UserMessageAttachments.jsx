import React, { useState, useEffect } from 'react';
import { Maximize2, X, FileText, FileSpreadsheet, FileCode, File, Image as ImageIcon } from 'lucide-react';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename = '') {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
}

function getFileIcon(filename = '') {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) {
    return <FileSpreadsheet size={16} className="text-emerald-400" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'sql', 'json', 'yaml', 'yml', 'xml', 'html', 'css'].includes(ext)) {
    return <FileCode size={16} className="text-amber-400" />;
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return <ImageIcon size={16} className="text-pink-400" />;
  }
  return <FileText size={16} className="text-blue-400" />;
}

export function parseUserMessageContent(content, existingFiles = []) {
  if (!content) return { cleanPrompt: '', parsedFiles: existingFiles };

  const fileRegex = /--- Attached File: ([^\n-]+) ---\n```[^\n]*\n([\s\S]*?)```/g;
  const parsedFiles = [...existingFiles];
  let cleanPrompt = content;

  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    const fileName = match[1].trim();
    if (!parsedFiles.some(f => f.name === fileName)) {
      parsedFiles.push({
        name: fileName,
        content: match[2],
        size: match[2].length,
      });
    }
  }

  cleanPrompt = cleanPrompt.replace(fileRegex, '').trim();

  // If default fallback was inserted when only files were sent without user prompt
  if (cleanPrompt === 'Analyze the attached file(s)' && parsedFiles.length > 0) {
    cleanPrompt = '';
  }

  return { cleanPrompt, parsedFiles };
}

export const UserMessageAttachments = ({ message }) => {
  const [selectedImage, setSelectedImage] = useState(null);

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

  const hasImages = allImages.length > 0;
  const hasFiles = parsedFiles.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* ─── CLAUDE-STYLE ATTACHMENTS (ABOVE PROMPT) ────────────────── */}
      {(hasImages || hasFiles) && (
        <div className="flex flex-wrap gap-2.5 items-start">
          {/* Images */}
          {allImages.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImage(img)}
              className="relative group overflow-hidden rounded-xl border border-white/15 bg-black/40 shadow-md hover:border-white/30 hover:shadow-xl transition-all cursor-pointer"
            >
              <img
                src={img}
                alt={`Attachment ${idx + 1}`}
                className="max-w-[280px] max-h-[180px] w-auto h-auto object-cover rounded-xl transition duration-200 group-hover:scale-[1.02]"
              />
              {/* Claude hover overlay with zoom icon */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium backdrop-blur-[2px]">
                <Maximize2 size={13} className="text-white drop-shadow" />
                <span className="drop-shadow">Expand</span>
              </div>
            </div>
          ))}

          {/* Files / Documents */}
          {parsedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white/[0.07] border border-white/10 hover:bg-white/[0.1] transition-all max-w-[280px] shadow-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {getFileIcon(file.name)}
              </div>
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-xs font-medium text-white/95 truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {file.size ? formatFileSize(file.size) : getFileExtension(file.name)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── USER PROMPT TEXT (BELOW ATTACHMENTS) ───────────────────── */}
      {cleanPrompt && (
        <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-white/95">
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
    </div>
  );
};

export default UserMessageAttachments;
