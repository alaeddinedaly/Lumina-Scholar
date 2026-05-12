"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Bot, Send, Users, Plus, Hash,
  Trash2, Loader2, ChevronRight, Sparkles, X, UserPlus, Lock
} from "lucide-react";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";
import { useSettings } from "@/lib/SettingsContext";

type Course = { id: string; name: string };
type Channel = { id: string; name: string; type: "COURSE" | "PRIVATE"; description?: string; courseId?: string; createdBy: { id: string; name: string; role: string } };
type ChannelMsg = { id: string; content: string; createdAt: string; expiresAt: string; user: { id: string; name: string; role: string } };
type TutorMsg = { role: "user" | "ai"; text: string };
type User = { id: string; name: string; role: string; email: string };

export default function StudentCommunication() {
  const { t, language } = useSettings();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeView, setActiveView] = useState<"ai" | { channel: Channel }>("ai");

  const [courseChannels, setCourseChannels] = useState<Channel[]>([]);
  const [privateChannels, setPrivateChannels] = useState<Channel[]>([]);
  const [tenantUsers, setTenantUsers] = useState<User[]>([]);
  
  // Create Private Channel Modal
  const [showNewPrivate, setShowNewPrivate] = useState(false);
  const [newPrivateName, setNewPrivateName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creatingPrivate, setCreatingPrivate] = useState(false);

  // Messaging State
  const [channelMsgs, setChannelMsgs] = useState<ChannelMsg[]>([]);
  const [channelInput, setChannelInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const channelPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI Tutor State
  const [tutorMsgs, setTutorMsgs] = useState<TutorMsg[]>([
    { role: "ai", text: "Hi! I'm Lumina, your AI tutor. Ask me anything about your studies — concepts, explanations, problem-solving, or general questions." }
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const sessionId = useRef(crypto.randomUUID()).current;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<{ userId: string; name: string; role: string } | null>(null);

  useEffect(() => {
    api.get("/auth/me").then(r => setMe({ userId: r.data.userId, name: r.data.name, role: r.data.role })).catch(() => {});
    api.get("/courses").then(async r => {
      const fetchedCourses = r.data;
      setCourses(fetchedCourses);
      
      // Fetch course channels flatly for all enrolled courses
      let allChannels: Channel[] = [];
      for (const course of fetchedCourses) {
        try {
          const res = await api.get(`/channels/course/${course.id}`);
          // keep course ID on it just in case
          const channelsWithCourseId = res.data.map((c: Channel) => ({ ...c, courseId: course.id }));
          allChannels = [...allChannels, ...channelsWithCourseId];
        } catch(e) {}
      }
      setCourseChannels(allChannels);

    }).catch(() => {});
    
    // Load private channels
    api.get("/channels/private").then(r => setPrivateChannels(r.data)).catch(() => {});
    // Load target users for DMs
    api.get("/channels/users").then(r => setTenantUsers(r.data)).catch(() => {});
  }, []);

  // WebSocket for AI Streaming
  useEffect(() => {
    socketService.connect("", sessionId);
    const socket = socketService.socket;
    if (!socket) return;
    socket.on("token_chunk", (content: string) => {
      if (activeView !== "ai") return;
      setTutorMsgs(prev => {
        const last = prev[prev.length - 1];
        if (last.role === "ai" && last.text === "Thinking...") return [...prev.slice(0, -1), { role: "ai", text: content }];
        if (last.role === "ai") return [...prev.slice(0, -1), { role: "ai", text: last.text + content }];
        return [...prev, { role: "ai", text: content }];
      });
    });
    return () => { socket.off("token_chunk"); };
  }, [sessionId, activeView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tutorMsgs, channelMsgs]);

  const loadChannelMessages = useCallback(async (channelId: string) => {
    const r = await api.get(`/channels/${channelId}/messages`);
    setChannelMsgs(r.data);
  }, []);

  useEffect(() => {
    if (activeView === "ai") {
      if (channelPollRef.current) clearInterval(channelPollRef.current);
      return;
    }
    loadChannelMessages(activeView.channel.id);
    channelPollRef.current = setInterval(() => loadChannelMessages(activeView.channel.id), 5000);
    return () => { if (channelPollRef.current) clearInterval(channelPollRef.current); };
  }, [activeView, loadChannelMessages]);

  const handleSendChannelMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim() || activeView === "ai" || sendingMsg) return;
    setSendingMsg(true);
    try {
      const r = await api.post(`/channels/${activeView.channel.id}/messages`, { content: channelInput });
      setChannelMsgs(prev => [...prev, r.data]);
      setChannelInput("");
    } finally { setSendingMsg(false); }
  };

  const handleSendTutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorInput.trim() || !socketService.socket) return;
    const history = tutorMsgs.filter(m => m.text !== "Thinking...").map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
    setTutorMsgs(prev => [...prev, { role: "user", text: tutorInput }, { role: "ai", text: "Thinking..." }]);
    socketService.socket.emit("tutor_chat", { query: tutorInput, sessionId, history });
    setTutorInput("");
  };

  const handleCreatePrivate = async () => {
    if (!newPrivateName.trim() || selectedUsers.length === 0) return;
    setCreatingPrivate(true);
    try {
      const r = await api.post("/channels/private", { name: newPrivateName.trim(), memberIds: selectedUsers });
      setPrivateChannels(prev => [r.data, ...prev]);
      setShowNewPrivate(false);
      setNewPrivateName("");
      setSelectedUsers([]);
      setActiveView({ channel: r.data });
    } finally { setCreatingPrivate(false); }
  };

  const activeChannel = activeView !== "ai" ? activeView.channel : null;
  const activeCourse = activeChannel?.courseId ? courses.find(c => c.id === activeChannel.courseId) : null;

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (iso: string) => {
    const d = new Date(iso), today = new Date();
    if (d.toDateString() === today.toDateString()) return language === "fr" ? "Aujourd'hui" : "Today";
    const y = new Date(today); y.setDate(today.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return language === "fr" ? "Hier" : "Yesterday";
    return d.toLocaleDateString();
  };
  const groupedMsgs = channelMsgs.reduce<{ date: string; msgs: ChannelMsg[] }[]>((g, msg) => {
    const date = fmtDate(msg.createdAt);
    const last = g[g.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else g.push({ date, msgs: [msg] });
    return g;
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row gap-4 md:gap-6 max-w-[1280px] h-[calc(100vh-100px)] md:h-[calc(100vh-130px)]">

      {/* ── LEFT: Channel Sidebar ── */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 overflow-hidden">
        <div className="flex flex-col gap-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

          <button onClick={() => setActiveView("ai")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left
              ${activeView === "ai" ? "bg-cyan-500/10 border border-cyan-500/20 text-slate-900 dark:bg-cyan-400/10 dark:border-cyan-400/20 dark:text-white" : "hover:bg-slate-100 text-slate-600 hover:text-slate-900 dark:hover:bg-white/5 dark:text-white/50 dark:hover:text-white"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${activeView === "ai" ? "bg-cyan-500/20 border border-cyan-500/30 dark:bg-cyan-400/20 dark:border-cyan-400/30" : "bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10"}`}>
              <Bot className={`w-3.5 h-3.5 ${activeView === "ai" ? "text-cyan-600 dark:text-cyan-400" : "text-slate-500 dark:text-white/40"}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium truncate">{t("tutorAI")}</span>
              <span className="text-[10px] text-slate-500 dark:text-white/30">{t("tutorAISubtitle")}</span>
            </div>
          </button>

          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />
          
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-white/25">{t("myConversations")}</p>
            <button onClick={() => setShowNewPrivate(true)} className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {privateChannels.length === 0 && (
            <p className="text-[11px] text-slate-500 dark:text-white/20 px-3 py-1 italic">{t("noPrivateConversations")}</p>
          )}
          {privateChannels.map(ch => {
            const isActive = activeView !== "ai" && activeView.channel.id === ch.id;
            return (
              <button key={ch.id} onClick={() => { setActiveView({ channel: ch }); setChannelMsgs([]); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all min-w-0
                ${isActive ? "bg-indigo-500/10 border border-indigo-500/20 text-slate-900 dark:bg-indigo-400/10 dark:border-indigo-400/20 dark:text-white" : "hover:bg-slate-100 text-slate-600 hover:text-slate-800 dark:hover:bg-white/5 dark:text-white/40 dark:hover:text-white/70"}`}>
                <Lock className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-white/30"}`} />
                <span className="text-[12px] truncate">{ch.name}</span>
              </button>
            );
          })}

          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />
          <p className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-white/25 px-2 py-1">{t("classChannels")}</p>

          {courseChannels.length === 0 && (
            <p className="text-[11px] text-slate-500 dark:text-white/20 px-3 py-1 italic">{t("noClassChannels")}</p>
          )}
          
          {courseChannels.map(ch => {
            const isActive = activeView !== "ai" && activeView.channel.id === ch.id;
            const courseName = courses.find(c => c.id === ch.courseId)?.name || "Course";
            
            return (
              <button key={ch.id} onClick={() => { setActiveView({ channel: ch }); setChannelMsgs([]); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all min-w-0
                ${isActive ? "bg-emerald-500/10 border border-emerald-500/20 text-slate-900 dark:bg-emerald-400/10 dark:border-emerald-400/20 dark:text-white" : "hover:bg-slate-100 text-slate-600 hover:text-slate-800 dark:hover:bg-white/5 dark:text-white/40 dark:hover:text-white/70"}`}>
                <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-white/30"}`} />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[12px] font-medium truncate">{ch.name}</span>
                  <span className="text-[9px] text-slate-500 dark:text-white/30 truncate">{courseName}</span>
                </div>
              </button>
            );
          })}

        </div>
      </div>

      {/* ── RIGHT: Chat Area ── */}
      <motion.div key={activeView === "ai" ? "ai" : activeChannel?.id}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="glass-card flex-1 flex flex-col overflow-hidden min-h-0"
        >

        <div className="p-4 shrink-0 border-b border-black/5 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02] flex items-center gap-3">
          {activeView === "ai" ? (
            <>
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 dark:bg-cyan-400/10 dark:border-cyan-400/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-slate-900 dark:text-white">Tutor AI — Lumina</h3>
                <span className="text-[10px] text-cyan-600/80 dark:text-cyan-400/60 font-mono">{t("privateOnly")}</span>
              </div>
            </>
          ) : activeChannel?.type === "PRIVATE" ? (
            <>
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 dark:bg-indigo-400/10 dark:border-indigo-400/20 flex items-center justify-center">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-slate-900 dark:text-white">{activeChannel.name}</h3>
                <span className="text-[10px] text-slate-600 dark:text-white/40">{t("privateConversation")}</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 dark:bg-emerald-400/10 dark:border-emerald-400/20 flex items-center justify-center">
                <Hash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-slate-900 dark:text-white">{activeChannel?.name}</h3>
                <span className="text-[10px] text-slate-600 dark:text-white/30">{activeCourse?.name} · {t("publicClassChannel")}</span>
              </div>
            </>
          )}
          <div className="ml-auto text-[10px] text-slate-500 dark:text-white/20">
            {activeView === "ai" ? `${tutorMsgs.length - 1} ${t("msgs")}` : `${channelMsgs.length} ${t("msgs")}`}
            {activeView !== "ai" && ` ${t("expires7d")}`}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-h-0" style={{ scrollbarWidth: "thin" }}>
          {activeView === "ai" && (
            <AnimatePresence initial={false}>
              {tutorMsgs.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold
                    ${msg.role === "user" ? "bg-slate-100 border border-black/10 text-slate-600 dark:bg-white/10 dark:border-white/20 dark:text-white/60" : "bg-cyan-500/10 border border-cyan-500/20 dark:bg-cyan-400/10 dark:border-cyan-400/20"}`}>
                    {msg.role === "user" ? "ME" : <Bot className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                  </div>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed
                    ${msg.role === "user" ? "bg-slate-900 border border-transparent text-white dark:bg-white/10 dark:text-white rounded-tr-sm" : "bg-white text-slate-800 border border-black/5 dark:bg-white/[0.04] dark:border-white/5 dark:text-white/85 rounded-tl-sm"}`}>
                    {msg.text === "Thinking..." ? <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Thinking...</span> : <span className="whitespace-pre-wrap">{msg.text}</span>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {activeView !== "ai" && (
            <>
              {channelMsgs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                  {activeChannel?.type === "PRIVATE" ? <Lock className="w-10 h-10 mb-3" /> : <Hash className="w-10 h-10 mb-3" />}
                  <p className="text-[13px]">{t("noMessages")}</p>
                </div>
              ) : (
                groupedMsgs.map(({ date, msgs }) => (
                  <div key={date} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                      <span className="text-[10px] text-slate-500 dark:text-white/25 font-mono">{date}</span>
                      <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                    </div>
                    {msgs.map((msg, i) => {
                      const isMe = me && msg.user.id === me?.userId;
                      const isProfessor = msg.user.role === "PROFESSOR";
                      const showAvatar = i === 0 || msgs[i - 1]?.user.id !== msg.user.id;
                      return (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 self-end mb-0.5 text-[9px] font-bold
                            ${!showAvatar ? "opacity-0" : ""}
                            ${isProfessor ? "bg-amber-500/15 border border-amber-500/25 text-amber-600 dark:bg-amber-400/15 dark:border-amber-400/25 dark:text-amber-400" : "bg-slate-100 border border-black/10 text-slate-600 dark:bg-white/10 dark:border-white/15 dark:text-white/50"}`}>
                            {msg.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className={`flex flex-col gap-0.5 max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                            {showAvatar && !isMe && (
                              <span className={`text-[10px] font-medium px-1 ${isProfessor ? "text-amber-600/80 dark:text-amber-400/80" : "text-slate-600 dark:text-white/40"}`}>
                                {msg.user.name} {isProfessor && `· ${t("professor")}`}
                              </span>
                            )}
                            <div className={`px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed
                              ${isMe ? "bg-emerald-500 border border-transparent text-white dark:bg-emerald-500/20 dark:border-emerald-400/20 dark:text-white rounded-tr-sm"
                                : isProfessor ? "bg-amber-500/10 border border-amber-500/15 text-slate-900 dark:bg-amber-400/10 dark:border-amber-400/15 dark:text-white/90 rounded-tl-sm"
                                : "bg-white border border-black/5 text-slate-800 dark:bg-white/[0.06] dark:border-white/8 dark:text-white/80 rounded-tl-sm"}`}>
                              {msg.content}
                            </div>
                            <span className="text-[9px] text-slate-500 dark:text-white/20 px-1">{fmtTime(msg.createdAt)}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 shrink-0 border-t border-black/5 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.01]">
          {activeView === "ai" ? (
             <form onSubmit={handleSendTutor} className="flex items-center gap-2">
                <input value={tutorInput} onChange={e => setTutorInput(e.target.value)} placeholder={t("askAI")} className="flex-1 bg-white border border-black/10 text-slate-900 rounded-xl py-2.5 px-4 text-[13px] shadow-sm focus:outline-none focus:border-cyan-500/40 dark:bg-white/[0.04] dark:border-white/10 dark:text-white dark:shadow-none dark:focus:border-cyan-400/40 transition-colors" />
                <button type="submit" disabled={!tutorInput.trim()} className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 disabled:opacity-30 dark:bg-cyan-400/10 dark:text-cyan-400"><Send className="w-4 h-4" /></button>
             </form>
          ) : (
             <form onSubmit={handleSendChannelMsg} className="flex items-center gap-2">
                <input value={channelInput} onChange={e => setChannelInput(e.target.value)} placeholder={t("typeMessage")} className="flex-1 bg-white border border-black/10 text-slate-900 rounded-xl py-2.5 px-4 text-[13px] shadow-sm focus:outline-none focus:border-emerald-500/40 dark:bg-white/[0.04] dark:border-white/10 dark:text-white dark:shadow-none dark:focus:border-emerald-400/40 transition-colors" />
                <button type="submit" disabled={!channelInput.trim() || sendingMsg} className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 disabled:opacity-30 dark:bg-emerald-400/10 dark:text-emerald-400">
                  {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                </button>
             </form>
          )}
        </div>
      </motion.div>

      {/* ── New Private Message Modal ── */}
      <AnimatePresence>
        {showNewPrivate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/40 dark:bg-black/60">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 p-6 flex flex-col shadow-2xl bg-white dark:bg-[#0f0f0f]/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">{t("newConversation")}</h2>
                <button onClick={() => setShowNewPrivate(false)} className="text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              
              <input value={newPrivateName} onChange={e => setNewPrivateName(e.target.value)} placeholder={t("conversationGroupName")} autoFocus
                className="w-full bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-lg py-2.5 px-3 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 dark:focus:border-indigo-400/50 mb-4" />
              
              <p className="text-[11px] uppercase text-slate-600 dark:text-white/30 font-medium mb-2">{t("selectMembers")}</p>
              <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto mb-6" style={{ scrollbarWidth: "thin" }}>
                {tenantUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer">
                    <input type="checkbox" checked={selectedUsers.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUsers(s => [...s, u.id]);
                        else setSelectedUsers(s => s.filter(id => id !== u.id));
                      }}
                      className="accent-indigo-500 dark:accent-indigo-400"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] text-slate-900 dark:text-white/90">{u.name}</span>
                      <span className="text-[10px] text-slate-600 dark:text-white/40">{u.role} · {u.email}</span>
                    </div>
                  </label>
                ))}
            </div>

            <div className="flex justify-end gap-3 tracking-wide mt-auto">
              <button onClick={() => setShowNewPrivate(false)} className="text-xs text-slate-600 hover:text-slate-900 px-4 py-2 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5 rounded">{t("cancel")}</button>
              <button onClick={handleCreatePrivate} disabled={!newPrivateName.trim() || selectedUsers.length === 0 || creatingPrivate} 
                className="text-xs bg-indigo-500 text-white font-medium disabled:opacity-50 px-5 py-2 rounded flex items-center gap-2">
                {creatingPrivate ? <Loader2 className="w-3 h-3 animate-spin"/> : <UserPlus className="w-3 h-3"/>}
                {t("create")}
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
