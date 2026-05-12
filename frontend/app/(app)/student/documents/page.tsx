"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Bot, Send, FileBox, BookOpen, User, ChevronDown, ChevronUp, Quote } from "lucide-react";

import api from "@/lib/api";
import { socketService } from "@/lib/socket";

type Doc = {
  id: string;
  originalName: string;
  status: string;
  courseId?: string | null;
  isPersonal?: boolean;
  chunkCount: number;
  createdAt: string;
};

export default function StudentDocuments() {
  const [courseDocs, setCourseDocs] = useState<Doc[]>([]);
  const [personalDocs, setPersonalDocs] = useState<Doc[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  type Citation = {
    sourceFile: string;
    pageNumber: number;
    similarityScore: number;
    chunkText: string;
  };
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; citations?: Citation[] }[]>([
    { role: "ai", text: "Select a document and ask me anything about it." }
  ]);
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    setSessionId(crypto.randomUUID());

    // Fetch course docs and personal docs in parallel
    Promise.all([
      api.get("/documents").catch(() => ({ data: [] })),
      api.get("/documents/personal").catch(() => ({ data: [] }))
    ]).then(([courseRes, personalRes]) => {
      const cDocs: Doc[] = courseRes.data;
      const pDocs: Doc[] = personalRes.data.map((d: Doc) => ({ ...d, isPersonal: true }));
      setCourseDocs(cDocs);
      setPersonalDocs(pDocs);

      // Auto-select first available
      const all = [...cDocs, ...pDocs];
      if (all.length > 0) setActiveDocId(all[0].id);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    socketService.connect("", sessionId);
    const socket = socketService.socket;
    if (!socket) return;

    socket.on("token_chunk", (content: string) => {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.role === "ai" && last.text === "Thinking...") {
          return [...prev.slice(0, -1), { ...last, text: content }];
        } else if (last.role === "ai") {
          return [...prev.slice(0, -1), { ...last, text: last.text + content }];
        }
        return [...prev, { role: "ai", text: content }];
      });
    });

    socket.on("stream_end", (citations: any[]) => {
      setMessages(prev => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = { ...newArr[newArr.length - 1], citations };
        return newArr;
      });
    });

    return () => {
      socket.off("token_chunk");
      socket.off("stream_end");
    };
  }, [sessionId]);

  const allDocs = [...courseDocs, ...personalDocs];
  const activeDoc = allDocs.find(d => d.id === activeDocId);

  const handleDocChange = (id: string) => {
    if (activeDocId === id) return;
    setActiveDocId(id);
    setMessages([{ role: "ai", text: "Document loaded. What would you like to know?" }]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeDoc || !socketService.socket) return;

    setMessages(prev => [...prev, { role: "user", text: chatInput }, { role: "ai", text: "Thinking..." }]);

    socketService.socket.emit("chat_message", {
      query: chatInput,
      courseId: activeDoc.isPersonal ? "personal" : activeDoc.courseId,
      sessionId,
      documentId: activeDocId,
      isPersonal: activeDoc.isPersonal ?? false,
    });

    setChatInput("");
  };

  const DocCard = ({ doc }: { doc: Doc }) => {
    const isActive = activeDocId === doc.id;
    const isPersonal = doc.isPersonal;

    return (
      <motion.div
        key={doc.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={() => handleDocChange(doc.id)}
        className={`group flex flex-col p-3 rounded-lg border cursor-pointer min-w-[200px] md:min-w-0 transition-all
          ${isActive
            ? isPersonal
              ? "bg-violet-500/10 border-violet-500/20 dark:border-violet-400/30 shadow-[0_0_15px_rgba(139,92,246,0.08)]"
              : "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.08)] dark:bg-emerald-400/10 dark:border-emerald-400/30 dark:shadow-[0_0_15px_rgba(52,211,153,0.05)]"
            : "bg-black/5 border-black/5 hover:bg-black/10 dark:bg-white/[0.03] dark:border-white/5 dark:hover:bg-white/[0.07]"
          }`}
      >
        <div className="flex items-center gap-2 overflow-hidden mb-2">
          <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? (isPersonal ? "text-violet-600 dark:text-violet-400" : "text-emerald-600 dark:text-emerald-400") : "text-slate-500 dark:text-white/30"}`} />
          <span className="text-[12px] font-medium text-slate-900 dark:text-white truncate">{doc.originalName}</span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider font-medium
            ${isPersonal
              ? "bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400/80"
              : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400/80"
            }`}>
            {isPersonal ? "Personal" : doc.status}
          </span>
          <span className="text-slate-600 dark:text-white/25">{new Date(doc.createdAt).toLocaleDateString()}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row gap-4 md:gap-6 max-w-[1400px] h-[calc(100vh-100px)] md:h-[calc(100vh-130px)]">

      {/* ── PANE 1: Document List ── */}
      <div className="w-full md:w-60 lg:w-72 flex flex-col gap-3 shrink-0 md:h-full overflow-hidden">
        <div className="flex flex-col gap-3 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

          {/* Course documents section */}
          {courseDocs.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <BookOpen className="w-3 h-3 text-emerald-400/60" />
                <span className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-medium">Course Materials</span>
              </div>
              <AnimatePresence>
                {courseDocs.map(doc => <DocCard key={doc.id} doc={doc} />)}
              </AnimatePresence>
            </div>
          )}

          {/* Divider between sections */}
          {courseDocs.length > 0 && personalDocs.length > 0 && (
            <div className="h-px bg-black/5 dark:bg-white/5 mx-1" />
          )}

          {/* Personal documents section */}
          {personalDocs.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <User className="w-3 h-3 text-violet-400/60" />
                <span className="text-[10px] uppercase tracking-widest text-violet-400/60 font-medium">My Uploads</span>
              </div>
              <AnimatePresence>
                {personalDocs.map(doc => <DocCard key={doc.id} doc={doc} />)}
              </AnimatePresence>
            </div>
          )}

          {/* Empty state */}
          {courseDocs.length === 0 && personalDocs.length === 0 && (
            <div className="p-4 text-[12px] text-slate-500 dark:text-white/30 text-center">
              No documents yet. Upload one from Study Hub.
            </div>
          )}
        </div>
      </div>

      {/* ── PANE 2: Document Viewer ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 md:h-full">
        <div className="glass-card flex-1 flex flex-col overflow-hidden min-h-0 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]">

          <div className="h-12 shrink-0 border-b border-black/10 bg-slate-50/50 dark:border-white/10 flex items-center px-4 gap-2 dark:bg-white/[0.02]">
            <FileBox className="w-4 h-4 text-slate-500 dark:text-white/40" />
            <span className="text-[13px] text-slate-600 dark:text-white/60 truncate flex-1">
              {activeDoc ? activeDoc.originalName : "No document selected"}
            </span>
            {activeDoc?.isPersonal && (
              <span className="text-[9px] uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400/80 px-2 py-0.5 rounded shrink-0">
                My Upload
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {activeDoc ? (
              <iframe
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/documents/${activeDoc.id}/download`}
                className="w-full h-full border-0"
                title="Document Preview"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                <FileBox className="w-12 h-12 mb-4" />
                <p className="text-sm">Select a document to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PANE 3: Chatbot ── */}
      <div className="w-full md:w-80 lg:w-96 shrink-0 flex flex-col md:h-full">
        <div className="glass-card flex-1 flex flex-col overflow-hidden min-h-0 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]">

          <div className="p-4 shrink-0 border-b border-black/10 bg-slate-50/50 dark:border-white/10 flex items-center gap-3 dark:bg-white/[0.02]">
            <Bot className={`w-5 h-5 ${activeDoc?.isPersonal ? "text-violet-600 dark:text-violet-400" : "text-emerald-600 dark:text-emerald-400"}`} />
            <div>
              <h3 className="text-[14px] font-medium text-slate-900 dark:text-white">Document Assistant</h3>
              <span className={`text-[10px] font-mono ${activeDoc?.isPersonal ? "text-violet-600/70 dark:text-violet-400/70" : "text-emerald-600/70 dark:text-emerald-400/70"}`}>
                {activeDoc?.isPersonal ? "Personal RAG" : "RAG Active"}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0" style={{ scrollbarWidth: "none" }}>
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 text-[9px] font-bold
                    ${msg.role === "user"
                      ? "bg-slate-100 border border-black/10 text-slate-600 dark:bg-white/10 dark:border-white/20 dark:text-white/60"
                      : activeDoc?.isPersonal
                        ? "bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:bg-violet-400/10 dark:border-violet-400/20 dark:text-violet-400"
                        : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:bg-emerald-400/10 dark:border-emerald-400/20 dark:text-emerald-400"}`}
                  >
                    {msg.role === "user" ? "ME" : <Bot className={`w-3 h-3`} />}
                  </div>

                  <div className="flex flex-col gap-1.5 max-w-[85%]">
                    <div className={`p-3 rounded-lg text-[13px] leading-relaxed
                      ${msg.role === "user" ? "bg-slate-900 border border-transparent text-white dark:bg-white/10 dark:text-white" : "bg-white border border-black/5 text-slate-800 dark:bg-white/[0.04] dark:border-white/5 dark:text-white/80"}`}
                    >
                      {msg.text}
                    </div>

                    {/* Citations panel */}
                    {msg.role === "ai" && msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setExpandedCitations(prev => ({ ...prev, [i]: !prev[i] }))}
                          className="flex items-center gap-1.5 text-[10px] text-slate-600 hover:text-slate-900 dark:text-white/30 dark:hover:text-white/60 transition-colors self-start px-1"
                        >
                          <Quote className="w-3 h-3" />
                          <span>{msg.citations.length} source{msg.citations.length > 1 ? 's' : ''}</span>
                          {expandedCitations[i] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        <AnimatePresence>
                          {expandedCitations[i] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="flex flex-col gap-1.5 overflow-hidden"
                            >
                              {msg.citations.map((c, ci) => (
                                <div
                                  key={ci}
                                  className="rounded-md border border-black/5 bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] p-2.5 flex flex-col gap-1"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <FileText className="w-3 h-3 text-emerald-500 dark:text-emerald-400/60 shrink-0" />
                                      <span className="text-[10px] text-slate-700 dark:text-white/60 truncate font-medium">{c.sourceFile}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[9px] text-slate-600 dark:text-white/30">p.{c.pageNumber}</span>
                                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                        c.similarityScore > 0.8 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20' :
                                        c.similarityScore > 0.6 ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20' :
                                        'bg-black/5 border-black/10 text-slate-600 dark:bg-white/5 dark:text-white/30 dark:border-white/10'
                                      }`}>
                                        {Math.round(c.similarityScore * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-slate-600 dark:text-white/30 leading-relaxed line-clamp-3">
                                    {c.chunkText}
                                  </p>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSendMessage} className="p-3 shrink-0 border-t border-black/10 bg-slate-50/50 dark:border-white/10 dark:bg-white/[0.02] flex gap-2 relative">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!activeDoc}
              placeholder={activeDoc ? "Ask about this doc..." : "Select a document..."}
              className="w-full bg-white border border-black/10 text-slate-900 rounded py-2 pl-3 pr-10 text-[13px] dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder-white/30 focus:outline-none focus:border-emerald-500/50 dark:focus:border-emerald-400/50 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!activeDoc || !chatInput.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
