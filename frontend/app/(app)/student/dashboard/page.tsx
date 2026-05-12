"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Calendar, Clock, Bell, Download, Loader2,
  Upload, FileText, CheckCircle2, X, AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useSettings } from "@/lib/SettingsContext";

export default function StudentDashboard() {
  const { t, language } = useSettings();
  const [courses, setCourses] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Per-assignment submission state
  const [pendingSubmit, setPendingSubmit] = useState<string | null>(null);   // docId with open file picker
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/courses')
      .then(res => setCourses(res.data))
      .catch(err => console.error(err));
    api.get('/documents')
      .then(res => setDocuments(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleDownload = async (docId: string, filename: string) => {
    if (downloading) return;
    setDownloading(docId);
    try {
      const response = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'document.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error("Failed to download doc:", err);
    } finally {
      setDownloading(null);
    }
  };

  const openSubmitPanel = (docId: string) => {
    setPendingSubmit(docId);
    setSelectedFile(null);
    setSubmitError("");
  };

  const cancelSubmit = () => {
    setPendingSubmit(null);
    setSelectedFile(null);
    setSubmitError("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSubmitError("");
    if (file && file.type !== "application/pdf") {
      setSubmitError(t("textPDFOnly"));
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleConfirmSubmit = async (docId: string) => {
    if (!selectedFile) {
      setSubmitError(t("selectFile"));
      return;
    }
    setSubmitting(docId);
    setSubmitError("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await api.post(`/documents/${docId}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Reflect as submitted in local state
      setDocuments(docs =>
        docs.map(d =>
          d.id === docId ? { ...d, submissions: [{ id: "temp" }] } : d
        )
      );
      setPendingSubmit(null);
      setSelectedFile(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? (language === "fr" ? "Soumission échouée. Vous avez peut-être déjà soumis ce devoir." : "Submission failed.");
      setSubmitError(msg);
    } finally {
      setSubmitting(null);
    }
  };

  const assignments = documents.filter(d => d.isAssignment);

  return (
    <div className="w-full flex-1 flex flex-col gap-6 max-w-[1024px] pb-12">
      <div className="flex flex-col gap-2 border-b border-black/5 dark:border-white/5 pb-6">
        <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 dark:text-[#f0f0f2]">
          {t("myCourses")}
        </h1>
        <p className="text-[14px] text-slate-600 dark:text-white/40 font-light leading-relaxed max-w-[400px]">
          {language === "fr" ? "Accédez à vos supports de cours, délais et guides d'étude générés par IA." : "Access your reading materials, deadlines, and AI-generated study guides."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Recent Documents Panel */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card flex flex-col overflow-hidden"
        >
          <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
            <h2 className="text-[14px] font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> {t("documents")}
            </h2>
            <span className="text-[11px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400 px-2 py-0.5 rounded dark:border-emerald-400/20">
              {documents.length} Docs
            </span>
          </div>
          <div className="flex flex-col p-2">
            {documents.length === 0 && (
              <div className="p-4 text-[12px] text-slate-500 dark:text-white/40 text-center">{t("noDocuments")}</div>
            )}
            {documents.map((doc, i) => (
              <div key={doc.id || i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                  <span className="text-[13px] font-medium text-slate-800 dark:text-white/90 group-hover:text-black dark:group-hover:text-white transition-colors truncate">{doc.originalName}</span>
                  <span className="text-[11px] text-slate-600 dark:text-white/40">{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={() => handleDownload(doc.id, doc.originalName)}
                  disabled={downloading === doc.id}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-black/10 bg-black/5 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-400 dark:hover:border-emerald-400/30 dark:text-white/50 transition-all shrink-0 disabled:opacity-50 disabled:group-hover:opacity-50"
                  title="Download File"
                >
                  {downloading === doc.id ? (
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {downloading === doc.id ? (language === "fr" ? "Téléchargement..." : "Downloading...") : t("download")}
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Deadlines Panel */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card flex flex-col overflow-hidden"
        >
          <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.01]">
            <h2 className="text-[14px] font-medium text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent-violet" /> {t("upcomingDeadlines")}
            </h2>
          </div>
          <div className="flex flex-col p-2">
            {assignments.length === 0 && (
              <div className="p-4 text-[12px] text-slate-500 dark:text-white/40 text-center">{t("noDeadlines")}</div>
            )}
            {assignments.map((doc, i) => {
              const isSubmitted = doc.submissions && doc.submissions.length > 0;
              const isPastDue = doc.deadline && new Date(doc.deadline) < new Date();
              const isOpen = pendingSubmit === doc.id;

              return (
                <div key={i} className="flex flex-col border-b border-black/5 dark:border-white/5 last:border-0">

                  {/* Assignment row */}
                  <div className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <Bell className={`w-4 h-4 ${isSubmitted ? 'text-emerald-500 dark:text-emerald-400' : isPastDue ? 'text-red-500 dark:text-red-400' : 'text-yellow-500 dark:text-yellow-400'}`} />
                      <div className="flex flex-col">
                        <span className={`text-[13px] font-medium ${isSubmitted ? 'text-slate-500 dark:text-white/40 line-through' : 'text-slate-800 dark:text-white/80'}`}>
                          {doc.originalName}
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-white/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {doc.deadline ? new Date(doc.deadline).toLocaleDateString() : (language === "fr" ? "Pas d'échéance" : "No Due Date")}
                          {isPastDue && !isSubmitted && (
                            <span className="text-rose-500 dark:text-rose-400 font-medium ml-1">· {language === "fr" ? "En retard" : "Overdue"}</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {!isSubmitted && (
                      <button
                        onClick={() => isOpen ? cancelSubmit() : openSubmitPanel(doc.id)}
                        className={`px-3 py-1.5 rounded-md border text-[11px] font-medium transition-all shrink-0
                          ${isOpen
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:border-rose-400/30 dark:bg-rose-400/10"
                            : "border-black/10 bg-black/5 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 text-slate-600 dark:text-white/70 dark:border-white/10 dark:bg-white/5 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-400 dark:hover:border-emerald-400/30"
                          }`}
                      >
                        {isOpen ? t("cancel") : t("turnIn")}
                      </button>
                    )}
                    {isSubmitted && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 dark:bg-emerald-400/10 rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {t("turnedIn")}
                      </span>
                    )}
                  </div>

                  {/* Inline submission panel */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mx-3 mb-3 p-4 rounded-xl border border-accent-violet/20 bg-accent-violet/[0.03] flex flex-col gap-3">

                          <p className="text-[12px] text-slate-600 dark:text-white/50 font-medium">
                            Attach your completed work as a PDF to submit:
                          </p>

                          {/* File drop area */}
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative w-full rounded-lg border border-dashed flex flex-col items-center justify-center gap-2 py-5 cursor-pointer transition-all
                              ${selectedFile
                                ? "border-emerald-500/40 bg-emerald-500/5"
                                : "border-black/15 dark:border-white/15 hover:border-accent-violet/40 bg-black/[0.01] dark:bg-white/[0.02]"
                              }`}
                          >
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                            {selectedFile ? (
                              <>
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                                <div className="flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span className="text-[12px] text-emerald-700 dark:text-emerald-400 font-medium max-w-[200px] truncate">{selectedFile.name}</span>
                                </div>
                                <button
                                  onClick={e => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                  className="text-[10px] text-slate-500 dark:text-white/30 hover:text-rose-500 transition-colors flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> Remove file
                                </button>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-slate-400 dark:text-white/20" />
                                <p className="text-[12px] text-slate-500 dark:text-white/40 text-center">
                                  Click to select your PDF
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-white/25">.PDF files only</p>
                              </>
                            )}
                          </div>

                          {/* Error */}
                          {submitError && (
                            <div className="flex items-center gap-2 text-[11px] text-rose-600 dark:text-rose-400">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              {submitError}
                            </div>
                          )}

                          {/* Confirm button */}
                          <button
                            onClick={() => handleConfirmSubmit(doc.id)}
                            disabled={submitting === doc.id || !selectedFile}
                            className="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-black text-[12px] font-medium hover:bg-slate-800 dark:hover:bg-[#e0e0e0] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {submitting === doc.id ? (
                           <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("submitting")}</>
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> {t("confirmSubmit")}</>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
