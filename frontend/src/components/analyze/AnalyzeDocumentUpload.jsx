import React, { useState, useEffect, useCallback } from 'react';
import { documentService } from '../../services/api';
import { UploadCloud, FileText, X, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';

const AnalyzeDocumentUpload = ({ onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await documentService.getDocuments();
      setDocuments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    await uploadFile(files[0]);
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    setError(null);
    try {
      await documentService.uploadDocument(file);
      await fetchDocuments();
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await documentService.deleteDocument(id);
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">Evidence Library</h2>
            <p className="text-sm text-white/50">Manage documents for analysis.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start space-x-2 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Area */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 bg-[#0A0A0A] hover:bg-[#161616] hover:border-white/20'}`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                <p className="text-sm font-medium text-white/90">Processing document...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <UploadCloud className="w-6 h-6 text-white/60" />
                </div>
                <h3 className="text-white font-medium mb-1">Add evidence</h3>
                <p className="text-white/40 text-sm mb-4">Drop documents here or click to browse</p>
                <p className="text-white/30 text-xs mb-4">PDF • DOCX • XLSX • PPTX • CSV • MD • HTML • JSON • XML</p>
                <label className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg cursor-pointer hover:bg-white/90 transition-colors">
                  Select File
                  <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.ppt,.pptx,.md,.html,.htm,.json,.xml" />
                </label>
              </>
            )}
          </div>

          {/* Document List */}
          {documents.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center justify-between">
                <span>Available for analysis</span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{documents.length}</span>
              </h3>
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-[#161616] border border-white/5 rounded-lg group">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-white/90 truncate">{doc.filename}</p>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span className="text-xs text-white/40">Processed</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400 leading-relaxed">
                <strong>Note:</strong> The AI automatically searches all available documents to find relevant evidence for your queries.
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-white/10 bg-[#0A0A0A] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeDocumentUpload;
