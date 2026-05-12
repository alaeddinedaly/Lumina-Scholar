"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, UploadCloud, ArrowRight, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";
import { useSettings } from "@/lib/SettingsContext";

type Stage = "idle" | "uploading" | "indexing" | "summarizing" | "done" | "error";

type PersonalDoc = {
  id: string;
  originalName: string;
  status: string;
  chunkCount: number;
  createdAt: string;
};

export default function StudentStudyHub() {
  const { t } = useSettings();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [summary, setSummary] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [pastDocs, setPastDocs] = useState<PersonalDoc[]>([]);
  const sessionId = useRef(crypto.randomUUID()).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load previously uploaded personal docs
  useEffect(() => {
    api.get("/documents/personal")
      .then(res => setPastDocs(res.data))
      .catch(() => {});
  }, []);

  // Socket for streaming summary
  useEffect(() => {
    socketService.connect("", sessionId);
    const socket = socketService.socket;
    if (!socket) return;

    socket.on("token_chunk", (content: string) => {
      setSummary(prev => prev + content);
    });

    socket.on("stream_end", () => {
      setStage("done");
    });

    return () => {
      socket.off("token_chunk");
      socket.off("stream_end");
    };
  }, [sessionId]);

  const handleGenerate = async () => {
    if (!file) return;

    try {
      setStage("uploading");
      setSummary("");
      setErrorMsg("");

      // Step 1: Personal upload (no courseId needed)
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/documents/personal-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const newDocId = uploadRes.data.documentId;

      // Step 2: Poll for INDEXED  
      setStage("indexing");
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get(`/documents/${newDocId}/status`);
          const status = statusRes.data.status;

          if (status === "INDEXED") {
            clearInterval(pollRef.current!);

            // Refresh personal docs list
            api.get("/documents/personal").then(res => setPastDocs(res.data)).catch(() => {});

            // Step 3: Stream summary via WebSocket (personal collection — pass isPersonal flag)
            setStage("summarizing");
            const socket = socketService.socket;
            if (socket) {
              socket.emit("chat_message", {
                query: "Please provide a comprehensive summary of this document. Cover the main topics, core concepts, key findings, and any conclusions. Use clear headings and concise language.",
                // For personal docs: courseId is empty, documentId scopes the retrieval
                courseId: "personal",
                sessionId,
                documentId: newDocId,
                isPersonal: true,
              });
            }
          } else if (status === "FAILED") {
            clearInterval(pollRef.current!);
            setStage("error");
            setErrorMsg(t("processingFailed"));
          }
        } catch {
          clearInterval(pollRef.current!);
          setStage("error");
          setErrorMsg(t("connectionLost"));
        }
      }, 3000);

    } catch (err: any) {
      setStage("error");
      setErrorMsg(err?.response?.data?.message || t("uploadFailed"));
    }
  };

  const summarizePast = (doc: PersonalDoc) => {
    if (doc.status !== "INDEXED") return;
    setSummary("");
    setStage("summarizing");
    const socket = socketService.socket;
    if (socket) {
      socket.emit("chat_message", {
        query: "Please provide a comprehensive summary of this document. Cover the main topics, core concepts, key findings, and any conclusions. Use clear headings and concise language.",
        courseId: "personal",
        sessionId,
        documentId: doc.id,
        isPersonal: true,
      });
    }
  };

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setFile(null);
    setStage("idle");
    setSummary("");
    setErrorMsg("");
  };

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row gap-6 max-w-[1280px]">

      {/* ── LEFT PANEL ── */}
      <div className="w-full md:w-[38%] flex flex-col gap-4">

        {/* Upload card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card flex flex-col shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 dark:bg-emerald-400/10 dark:border-emerald-400/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">{t("documentSummarizer")}</h2>
              <p className="text-[11px] text-slate-600 dark:text-white/40 mt-0.5">{t("personalOnly")}</p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`relative w-full h-[150px] rounded-xl border flex flex-col items-center justify-center gap-3 transition-all duration-300
              ${file ? "border-solid border-emerald-500/30 bg-emerald-500/5" : "border-black/10 border-dashed bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"}
              ${stage !== "idle" ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              type="file"
              accept=".pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
              disabled={!!file || stage !== "idle"}
            />
            {!file ? (
              <div className="flex flex-col items-center pointer-events-none text-center">
                <UploadCloud className="w-7 h-7 text-slate-300 dark:text-white/20 mb-2" />
                <p className="text-[13px] font-medium text-slate-600 dark:text-white/60">{t("dropPDF")}</p>
                <p className="text-[11px] text-slate-500 dark:text-white/30 mt-1">{t("textPDFOnly")}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center pointer-events-none text-center px-4">
                <FileText className="w-7 h-7 text-emerald-500 dark:text-emerald-400 mb-2" />
                <p className="text-[13px] font-medium text-slate-700 dark:text-white/80 truncate max-w-[220px]">{file.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-white/30 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            )}
          </div>

          {/* Status feedback */}
          {stage !== "idle" && stage !== "done" && stage !== "error" && (
            <div className="mt-4 flex items-center gap-2 text-[12px] text-slate-600 dark:text-white/50">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500 dark:text-emerald-400" />
              <span>
                {stage === "uploading" && t("uploading")}
                {stage === "indexing" && t("chunking")}
                {stage === "summarizing" && t("generatingSummary")}
              </span>
            </div>
          )}
          {stage === "error" && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-600 dark:bg-red-400/5 dark:border-red-400/20 dark:text-red-400">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {stage === "done" && (
            <div className="mt-4 flex items-center gap-2 text-[12px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" /><span>{t("summaryComplete")}</span>
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={handleGenerate}
              disabled={!file || stage !== "idle"}
              className="flex-1 py-[13px] text-[13px] font-medium rounded-[6px] bg-slate-900 text-white hover:bg-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:bg-white dark:text-black dark:hover:bg-[#e0e0e0] dark:shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed group flex gap-2 justify-center items-center transition-all"
            >
              {t("generateAISummary")}
              <ArrowRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
            {(file || stage !== "idle") && (
              <button onClick={reset} className="px-4 py-[13px] text-[13px] font-medium rounded-[6px] bg-slate-100 border border-black/10 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10 transition-all">
                {t("reset")}
              </button>
            )}
          </div>
        </motion.div>

        {/* Past documents */}
        {pastDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card flex flex-col overflow-hidden p-4"
          >
            <h3 className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-white/40 mb-3">{t("previouslyUploaded")}</h3>
            <div className="flex flex-col gap-2">
              {pastDocs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => summarizePast(doc)}
                  disabled={doc.status !== "INDEXED"}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-black/5 hover:bg-slate-100 dark:bg-white/[0.03] dark:border-white/5 dark:hover:bg-white/[0.06] transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-white/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-slate-700 dark:text-white/80 truncate">{doc.originalName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/30">{new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-medium shrink-0
                    ${doc.status === "INDEXED" ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400" :
                      doc.status === "FAILED" ? "bg-red-500/10 text-red-600 dark:bg-red-400/10 dark:text-red-400" : "bg-black/5 text-slate-600 dark:bg-white/5 dark:text-white/40"}`}>
                    {doc.status === "INDEXED" ? t("ready") : doc.status === "FAILED" ? t("failed") : t("processing")}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── RIGHT PANEL: Summary output ── */}
      <div className="w-full md:w-[62%] flex flex-col">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card flex-1 relative flex flex-col overflow-hidden min-h-[500px]"
        >
          <AnimatePresence mode="wait">

            {stage === "idle" && !summary && (
              <motion.div key="empty" className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center opacity-40">
                <Sparkles className="w-8 h-8 mb-4 border border-black/10 bg-black/5 text-slate-500 dark:border-white/20 p-1.5 rounded dark:bg-white/5 dark:text-white" />
                <p className="text-[14px] text-slate-600 dark:text-white">{t("summaryAppearHere")}</p>
                <p className="text-[12px] text-slate-600 dark:text-white/60 mt-2">{t("uploadOrClick")}</p>
              </motion.div>
            )}

            {(stage === "uploading" || stage === "indexing") && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col p-8 overflow-hidden gap-6">
                <div className="flex items-center gap-3 pb-4 border-b border-black/5 dark:border-white/5">
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 animate-pulse" />
                  <div className="w-48 h-5 rounded bg-slate-200 dark:bg-white/10 animate-pulse" />
                </div>
                {[1, 0.9, 0.8, 0.7, 0.85].map((w, i) => (
                  <div key={i} className="h-4 rounded bg-slate-100 dark:bg-white/5 animate-pulse" style={{ width: `${w * 100}%`, animationDelay: `${i * 0.1}s` }} />
                ))}
                <motion.div
                  className="absolute left-0 right-0 h-[2px] bg-emerald-500/50 dark:bg-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.8)] dark:shadow-[0_0_15px_rgba(52,211,153,0.8)] z-10"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                />
              </motion.div>
            )}

            {(stage === "summarizing" || stage === "done") && (
              <motion.div key="filled" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 p-8 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-black/5 dark:border-white/5">
                  <Sparkles className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                  <h2 className="text-[16px] font-medium text-slate-800 dark:text-white/90 truncate flex-1">
                    {file?.name || "Document Summary"}
                  </h2>
                  {stage === "summarizing" && <Loader2 className="w-4 h-4 animate-spin text-emerald-500 dark:text-emerald-400 shrink-0" />}
                  {stage === "done" && <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />}
                </div>
                <div className="text-[14px] text-slate-600 dark:text-white/75 leading-relaxed whitespace-pre-wrap">
                  {summary}
                  {stage === "summarizing" && (
                    <span className="inline-block w-1.5 h-4 bg-emerald-500/70 dark:bg-emerald-400/70 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>

    </div>
  );
}
