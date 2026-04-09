"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { UploadCloud, FileType, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (selectedFile: File) => {
    // Check extension
    const name = selectedFile.name.toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.xlsx')) {
      setFile(selectedFile);
    } else {
      alert("Only CSV and XLSX files are supported currently.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleContinue = () => {
    if (!file) return;
    setIsAnalyzing(true);

    // Mock analysis delay
    setTimeout(() => {
      router.push("/schema");
    }, 3000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[560px] p-[2px] rounded-[16px] relative overflow-hidden"
      >
        {/* Animated Border gradient (just like auth pages) */}
        {!file && (
          <div className="absolute inset-0 pointer-events-none rounded-[16px] z-0 isolate opacity-50">
            <motion.div
              className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
              style={{
                background: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(0, 242, 255, 0.05) 40%, rgba(0, 242, 255, 0.4) 50%, rgba(0, 242, 255, 0.05) 60%, transparent 100%)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}

        <div className="glass-card relative z-10 p-8 md:p-10 flex flex-col gap-8 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]"
          style={{ background: "rgba(10, 10, 10, 0.65)" }}>

          <div className="flex flex-col gap-2 text-center items-center">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
              <UploadCloud className="w-6 h-6 text-accent-cyan" />
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[#f0f0f2]">
              Connect your data
            </h1>
            <p className="text-[14px] text-white/40 font-light leading-relaxed max-w-[340px]">
              Securely upload your dataset to begin AI-powered schema inference and semantic analysis.
            </p>
          </div>

          <div
            className={`
              relative w-full h-[220px] rounded-xl border flex flex-col items-center justify-center gap-4 transition-all duration-300
              ${isDragging ? "border-accent-cyan bg-accent-cyan/5" : "border-white/10 border-dashed bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"}
              ${file ? "border-solid border-green-500/30 bg-green-500/5" : ""}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv, .xlsx"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
              onChange={handleFileSelect}
              ref={fileInputRef}
              disabled={!!file}
            />

            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="upload-prompt"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center pointer-events-none"
                >
                  <div className="flex gap-3 mb-4 opacity-40">
                    <span className="text-[11px] font-mono border border-white/20 px-2 py-0.5 rounded bg-white/5 uppercase tracking-wider">.csv</span>
                    <span className="text-[11px] font-mono border border-white/20 px-2 py-0.5 rounded bg-white/5 uppercase tracking-wider">.xlsx</span>
                  </div>
                  <p className="text-[15px] font-medium text-white/80">
                    Drag & drop your file here
                  </p>
                  <p className="text-[13px] text-white/40 mt-1">
                    or click to browse from your computer
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="file-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center pointer-events-none w-full px-8"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/10 bg-[#080808]">
                    <FileType className="w-5 h-5 text-white/40 shrink-0" />
                    <div className="flex flex-col overflow-hidden text-left flex-1">
                      <span className="text-[13px] text-white font-medium truncate">{file.name}</span>
                      <span className="text-[11px] text-white/40 font-mono tracking-wider">{formatSize(file.size)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="mt-4 text-[12px] text-white/40 hover:text-white/80 transition-colors pointer-events-auto"
                  >
                    Remove file
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleContinue}
            disabled={!file}
            className={`
              group relative w-full px-5 py-[14px] text-[13px] font-medium tracking-[0.05em] 
              rounded-[6px] overflow-hidden transition-all duration-300 flex items-center justify-center gap-2
              ${file
                ? "bg-white text-black hover:bg-[#e0e0e0] shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer"
                : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"}
            `}
          >
            Continue to Analysis
            <ArrowRight className={`w-4 h-4 transition-all ${file ? "opacity-100 group-hover:translate-x-1" : "opacity-30"}`} />
          </button>
        </div>
      </motion.div>

      {/* ── Analyzing Modal Overlay ── */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-xl"
            style={{ background: "rgba(0,0,0,0.8)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 20 }}
              className="glass-card p-10 flex flex-col items-center gap-6 max-w-[320px] text-center"
              style={{ background: "rgba(10, 10, 10, 0.9)" }}
            >
              <div className="relative w-16 h-16 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent-cyan animate-spin absolute z-10" />
                <div className="absolute inset-0 rounded-full border border-accent-cyan/20 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-2 rounded-full border border-accent-cyan/10 animate-ping opacity-40" style={{ animationDuration: '2s' }} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[16px] font-medium text-white">Analyzing your data...</h3>
                <p className="text-[12px] text-white/40 leading-relaxed font-light">
                  Lumina AI is inferring semantic structures and data types.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
