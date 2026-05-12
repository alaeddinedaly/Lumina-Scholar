"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Plus, Hash, Trash2, Loader2, ChevronRight, 
  Sparkles, X, UserPlus, Lock, GraduationCap
} from "lucide-react";
import api from "@/lib/api";
import { socketService } from "@/lib/socket";

type Course = { id: string; name: string; enrollments: { student: { id: string } }[] };
type Channel = { id: string; name: string; type: "COURSE" | "PRIVATE"; description?: string; courseId?: string; createdBy: { id: string; name: string; role: string } };
type ChannelMsg = { id: string; content: string; createdAt: string; user: { id: string; name: string; role: string } };
type TutorMsg = { role: "user" | "ai"; text: string };
type User = { id: string; name: string; role: string; email: string };

export default function ProfessorCommunication() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeView, setActiveView] = useState<"ai" | { channel: Channel }>("ai");

  const [courseChannels, setCourseChannels] = useState<Channel[]>([]);
  const [privateChannels, setPrivateChannels] = useState<Channel[]>([]);
  const [tenantUsers, setTenantUsers] = useState<User[]>([]);

  // Create Class Modal
  const [showNewCourseChannel, setShowNewCourseChannel] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseStudentIds, setNewCourseStudentIds] = useState<string[]>([]);
  const [creatingCourseCh, setCreatingCourseCh] = useState(false);

  // Add Students to Class Modal
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [addStudentIds, setAddStudentIds] = useState<string[]>([]);
  const [addingStudents, setAddingStudents] = useState(false);

  // Create Private Channel
  const [showNewPrivate, setShowNewPrivate] = useState(false);
  const [newPrivateName, setNewPrivateName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [creatingPrivate, setCreatingPrivate] = useState(false);

  const [channelMsgs, setChannelMsgs] = useState<ChannelMsg[]>([]);
  const [channelInput, setChannelInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const channelPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tutorMsgs, setTutorMsgs] = useState<TutorMsg[]>([
    { role: "ai", text: "Hi Professor! I'm Lumina, your AI teaching assistant. I can help with grading rubrics, lesson planning, explaining concepts, drafting feedback, and more." }
  ]);
  const [tutorInput, setTutorInput] = useState("");
  const sessionId = useRef(crypto.randomUUID()).current;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<{ userId: string; name: string; role: string } | null>(null);

  const fetchCourses = () => {
    api.get("/courses").then(async r => {
      const fetchedCourses = r.data;
      setCourses(fetchedCourses);

      // Fetch course channels flatly
      if (courseChannels.length === 0) {
        let allChannels: Channel[] = [];
        for (const course of fetchedCourses) {
          try {
            const res = await api.get(`/channels/course/${course.id}`);
            const channelsWithCourseId = res.data.map((c: Channel) => ({ ...c, courseId: course.id }));
            allChannels = [...allChannels, ...channelsWithCourseId];
          } catch(e) {}
        }
        setCourseChannels(allChannels);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    api.get("/auth/me").then(r => setMe({ userId: r.data.userId, name: r.data.name, role: r.data.role })).catch(() => {});
    fetchCourses();
    api.get("/channels/private").then(r => setPrivateChannels(r.data)).catch(() => {});
    api.get("/channels/users").then(r => setTenantUsers(r.data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [tutorMsgs, channelMsgs]);

  const loadChannelMessages = useCallback(async (channelId: string) => {
    const r = await api.get(`/channels/${channelId}/messages`);
    setChannelMsgs(r.data);
  }, []);

  useEffect(() => {
    if (activeView === "ai") { if (channelPollRef.current) clearInterval(channelPollRef.current); return; }
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

  const handleCreateCourseCh = async () => {
    if (!newCourseName.trim() || newCourseStudentIds.length === 0) return;
    setCreatingCourseCh(true);
    try {
      // Create new backend course which automatically creates a default course channel
      const r = await api.post(`/courses`, { name: newCourseName.trim(), studentIds: newCourseStudentIds });
      
      const newCourse = r.data;
      setCourses(prev => [...prev, newCourse]);

      // Fetch the newly created channel for this course
      const chRes = await api.get(`/channels/course/${newCourse.id}`);
      const newChannels = chRes.data.map((c: Channel) => ({ ...c, courseId: newCourse.id }));
      
      setCourseChannels(prev => [...prev, ...newChannels]);
      
      setShowNewCourseChannel(false); 
      setNewCourseName(""); 
      setNewCourseStudentIds([]);
      if (newChannels.length > 0) setActiveView({ channel: newChannels[0] });
      
      // refresh course list so enrollments pop up properly
      fetchCourses();
    } finally { setCreatingCourseCh(false); }
  };

  const activeChannel = activeView !== "ai" ? activeView.channel : null;
  const activeCourse = activeChannel?.courseId ? courses.find(c => c.id === activeChannel.courseId) : null;

  const handleAddStudentsToClass = async () => {
    if (!activeCourse || addStudentIds.length === 0) return;
    setAddingStudents(true);
    try {
      await api.post(`/courses/${activeCourse.id}/enroll-multiple`, { studentIds: addStudentIds });
      setShowAddStudents(false);
      setAddStudentIds([]);
      fetchCourses(); // refresh the course list to get updated enrollments
    } finally {
      setAddingStudents(false);
    }
  };

  const handleCreatePrivate = async () => {
    if (!newPrivateName.trim() || selectedUsers.length === 0) return;
    setCreatingPrivate(true);
    try {
      const r = await api.post("/channels/private", { name: newPrivateName.trim(), memberIds: selectedUsers });
      setPrivateChannels(prev => [r.data, ...prev]);
      setShowNewPrivate(false); setNewPrivateName(""); setSelectedUsers([]);
      setActiveView({ channel: r.data });
    } finally { setCreatingPrivate(false); }
  };

  const handleDeleteChannel = async (channelId: string, type: "COURSE" | "PRIVATE") => {
    await api.delete(`/channels/${channelId}`);
    if (type === "COURSE") {
      setCourseChannels(prev => prev.filter(c => c.id !== channelId));
    } else {
      setPrivateChannels(prev => prev.filter(c => c.id !== channelId));
    }
    if (activeView !== "ai" && activeView.channel.id === channelId) setActiveView("ai");
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (iso: string) => {
    const d = new Date(iso), today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const y = new Date(today); y.setDate(today.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };
  const groupedMsgs = channelMsgs.reduce<{ date: string; msgs: ChannelMsg[] }[]>((g, msg) => {
    const date = fmtDate(msg.createdAt);
    const last = g[g.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else g.push({ date, msgs: [msg] });
    return g;
  }, []);

  const getAvailableStudentsForActiveCourse = () => {
    if (!activeCourse) return [];
    const enrolledIds = activeCourse.enrollments?.map(e => e.student.id) || [];
    return tenantUsers.filter(u => u.role === 'STUDENT' && !enrolledIds.includes(u.id));
  };

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row gap-4 md:gap-6 max-w-[1280px] h-[calc(100vh-100px)] md:h-[calc(100vh-130px)]">

      {/* ── LEFT: Sidebar ── */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2 overflow-hidden">
        <div className="flex flex-col gap-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>

          <button onClick={() => setActiveView("ai")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left
              ${activeView === "ai" ? "bg-violet-500/10 border border-violet-500/20 dark:border-violet-400/20 text-slate-900 dark:text-white" : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${activeView === "ai" ? "bg-violet-500/10 border border-violet-500/20 dark:bg-violet-400/20 dark:border-violet-400/30" : "bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10"}`}>
              <Bot className={`w-3.5 h-3.5 ${activeView === "ai" ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-white/40"}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium truncate">AI Teaching Assistant</span>
              <span className="text-[10px] text-slate-500 dark:text-white/30">Private · Grading & Planning</span>
            </div>
          </button>

          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />
          
          {/* PRIVATE CHANNELS */}
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-white/25">My Conversations</p>
            <button onClick={() => setShowNewPrivate(true)} className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {privateChannels.length === 0 && (
            <p className="text-[11px] text-slate-500 dark:text-white/20 px-3 py-1 italic">No private conversations.</p>
          )}
          {privateChannels.map(ch => {
            const isActive = activeView !== "ai" && activeView.channel.id === ch.id;
            return (
              <div key={ch.id} className="group flex items-center gap-1">
                <button onClick={() => { setActiveView({ channel: ch }); setChannelMsgs([]); }}
                  className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all min-w-0
                  ${isActive ? "bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-400/20 text-slate-900 dark:text-white" : "hover:bg-slate-100 text-slate-600 hover:text-slate-800 dark:hover:bg-white/5 dark:text-white/40 dark:hover:text-white/70"}`}>
                  <Lock className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-white/30"}`} />
                  <span className="text-[12px] truncate">{ch.name}</span>
                </button>
                {me && ch.createdBy.id === me.userId && (
                  <button onClick={() => handleDeleteChannel(ch.id, "PRIVATE")} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-400/10 text-red-400/60 hover:text-red-400 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <div className="h-px bg-black/5 dark:bg-white/5 my-2" />
          
          {/* COURSE CHANNELS (Flat view) */}
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-white/25">Class Channels</p>
            <button onClick={() => setShowNewCourseChannel(true)} className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/30 dark:hover:bg-white/10 dark:hover:text-white transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {courseChannels.length === 0 && (
            <p className="text-[11px] text-slate-500 dark:text-white/20 px-3 py-1 italic">No class channels yet.</p>
          )}

          {courseChannels.map(ch => {
            const isActive = activeView !== "ai" && activeView.channel.id === ch.id;
            
            return (
              <div key={ch.id} className="group flex items-center gap-1">
                <button onClick={() => { setActiveView({ channel: ch }); setChannelMsgs([]); }}
                  className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all min-w-0
                  ${isActive ? "bg-emerald-500/10 border border-emerald-500/20 dark:border-emerald-400/20 text-slate-900 dark:text-white" : "hover:bg-slate-100 text-slate-600 hover:text-slate-800 dark:hover:bg-white/5 dark:text-white/40 dark:hover:text-white/70"}`}>
                  <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-white/30"}`} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[12px] font-medium truncate">{ch.name}</span>
                  </div>
                </button>
                {me && ch.createdBy.id === me.userId && (
                  <button onClick={() => handleDeleteChannel(ch.id, "COURSE")} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-400/10 text-red-400/60 hover:text-red-400 transition-all">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

        </div>
      </div>

      {/* ── RIGHT: Chat Area ── */}
      <motion.div key={activeView === "ai" ? "ai" : activeChannel?.id}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="glass-card flex-1 flex flex-col overflow-hidden min-h-0"
        >

        <div className="p-4 shrink-0 border-b border-black/5 bg-slate-50/50 dark:border-white/5 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeView === "ai" ? (
              <>
                <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 dark:bg-violet-400/10 dark:border-violet-400/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div><h3 className="text-[15px] font-medium text-slate-900 dark:text-white">AI Teaching Assistant</h3><span className="text-[10px] text-violet-500/80 dark:text-violet-400/60 font-mono">Private</span></div>
              </>
            ) : activeChannel?.type === "PRIVATE" ? (
              <>
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 dark:bg-indigo-400/10 dark:border-indigo-400/20 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div><h3 className="text-[15px] font-medium text-slate-900 dark:text-white">{activeChannel.name}</h3><span className="text-[10px] text-slate-600 dark:text-white/40">Private</span></div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 dark:bg-emerald-400/10 dark:border-emerald-400/20 flex items-center justify-center">
                  <Hash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-slate-900 dark:text-white">{activeChannel?.name}</h3>
                  <span className="text-[10px] text-slate-600 dark:text-white/30">
                    Public Class Channel {activeCourse?.enrollments ? `· ${activeCourse.enrollments.length} Students` : ""}
                  </span>
                </div>
              </>
            )}
          </div>
          
          {activeView !== "ai" && activeChannel?.type === "COURSE" && activeCourse && (
             <button onClick={() => setShowAddStudents(true)} className="text-[11px] font-medium px-3 py-1.5 rounded-md border border-black/10 bg-black/5 hover:bg-emerald-500/10 text-slate-600 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:hover:bg-emerald-400/10 dark:text-white/60 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors">
               <UserPlus className="w-3.5 h-3.5" />
               Add Students
             </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 min-h-0" style={{ scrollbarWidth: "thin" }}>
          {activeView === "ai" && (
            <AnimatePresence initial={false}>
              {tutorMsgs.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold
                    ${msg.role === "user" ? "bg-slate-100 border border-black/10 text-slate-600 dark:bg-white/10 dark:border-white/20 dark:text-white/60" : "bg-violet-500/10 border border-violet-500/20 dark:bg-violet-400/10 dark:border-violet-400/20"}`}>
                    {msg.role === "user" ? "ME" : <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
                  </div>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed
                    ${msg.role === "user" ? "bg-slate-900 border border-transparent text-white dark:bg-white/10 dark:text-white rounded-tr-sm" : "bg-white text-slate-800 border border-black/5 dark:bg-white/[0.04] dark:text-white/85 dark:border-white/5 rounded-tl-sm"}`}>
                    {msg.text === "Thinking..." ? <span><Loader2 className="w-3 h-3 animate-spin"/> Thinking...</span> : <span className="whitespace-pre-wrap">{msg.text}</span>}
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
                  <p className="text-[13px]">No messages yet.</p>
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
                            ${isProfessor ? "bg-violet-500/15 border border-violet-500/25 text-violet-600 dark:bg-violet-400/15 dark:border-violet-400/25 dark:text-violet-400" : "bg-slate-100 border border-black/10 text-slate-600 dark:bg-white/10 dark:border-white/15 dark:text-white/50"}`}>
                            {msg.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className={`flex flex-col gap-0.5 max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                            {showAvatar && !isMe && (
                              <span className={`text-[10px] font-medium px-1 ${isProfessor ? "text-violet-600/80 dark:text-violet-400/80" : "text-slate-600 dark:text-white/40"}`}>
                                {msg.user.name}{isProfessor && " · Professor"}
                              </span>
                            )}
                            <div className={`px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed
                              ${isMe ? "bg-violet-500 text-white border border-transparent dark:bg-violet-500/20 dark:border-violet-400/20 text-white rounded-tr-sm"
                                : isProfessor ? "bg-violet-500/10 border border-violet-500/15 text-slate-900 dark:bg-violet-400/10 dark:border-violet-400/15 dark:text-white/90 rounded-tl-sm"
                                : "bg-white border border-black/5 text-slate-800 dark:bg-white/[0.06] dark:border-white/8 dark:text-white/80 rounded-tl-sm"}`}>
                              {msg.content}
                            </div>
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
                <input value={tutorInput} onChange={e => setTutorInput(e.target.value)} placeholder="Ask AI..." className="flex-1 bg-white border border-black/10 text-slate-900 dark:bg-white/[0.04] dark:border-white/10 rounded-xl py-2.5 px-4 text-[13px] dark:text-white outline-none focus:border-violet-500/40 dark:focus:border-violet-400/40 shadow-sm dark:shadow-none" />
                <button type="submit" disabled={!tutorInput.trim()} className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400"><Send className="w-4 h-4" /></button>
             </form>
          ) : (
             <form onSubmit={handleSendChannelMsg} className="flex items-center gap-2">
                <input value={channelInput} onChange={e => setChannelInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white border border-black/10 text-slate-900 dark:bg-white/[0.04] dark:border-white/10 rounded-xl py-2.5 px-4 text-[13px] dark:text-white outline-none focus:border-emerald-500/40 dark:focus:border-emerald-400/40 shadow-sm dark:shadow-none" />
                <button type="submit" disabled={!channelInput.trim() || sendingMsg} className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
                  {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                </button>
             </form>
          )}
        </div>
      </motion.div>

      {/* ── New Class Channel Modal ── */}
      <AnimatePresence>
        {showNewCourseChannel && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/40 dark:bg-black/60">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 p-6 flex flex-col shadow-2xl bg-white dark:bg-[#0f0f0f]/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">Create New Class Channel</h2>
                <button onClick={() => setShowNewCourseChannel(false)} className="text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              
              <input value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="Class / Subject Name (e.g. Mathematics 101)" autoFocus
                className="w-full bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-lg py-2.5 px-3 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50 dark:focus:border-emerald-400/50 mb-4" />
              
              <p className="text-[11px] uppercase text-slate-600 dark:text-white/30 font-medium mb-2">Select Students</p>
              <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto mb-6" style={{ scrollbarWidth: "thin" }}>
                {tenantUsers.filter(u => u.role === 'STUDENT').map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-white/[0.03] cursor-pointer">
                    <input type="checkbox" checked={newCourseStudentIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setNewCourseStudentIds(s => [...s, u.id]);
                        else setNewCourseStudentIds(s => s.filter(id => id !== u.id));
                      }}
                      className="accent-emerald-500 dark:accent-emerald-400"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] text-slate-900 dark:text-white/90">{u.name}</span>
                      <span className="text-[10px] text-slate-600 dark:text-white/40">{u.email}</span>
                    </div>
                  </label>
                ))}
            </div>

            <div className="flex justify-end gap-3 tracking-wide mt-auto">
              <button onClick={() => setShowNewCourseChannel(false)} className="text-xs text-slate-600 hover:text-slate-900 px-4 py-2 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5 rounded">Cancel</button>
              <button onClick={handleCreateCourseCh} disabled={!newCourseName.trim() || newCourseStudentIds.length === 0 || creatingCourseCh} 
                className="text-xs bg-emerald-500 text-white font-medium disabled:opacity-50 px-5 py-2 rounded flex items-center gap-2">
                {creatingCourseCh ? <Loader2 className="w-3 h-3 animate-spin"/> : <GraduationCap className="w-3 h-3"/>}
                Create Class
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Students to Existing Class Modal ── */}
      <AnimatePresence>
        {showAddStudents && activeCourse && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/40 dark:bg-black/60">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 p-6 flex flex-col shadow-2xl bg-white dark:bg-[#0f0f0f]/95">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">Add Students to Class</h2>
                <button onClick={() => { setShowAddStudents(false); setAddStudentIds([]); }} className="text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-[12px] text-slate-600 dark:text-white/50 mb-4 font-medium">{activeCourse.name}</p>

              <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto mb-6" style={{ scrollbarWidth: "thin" }}>
                {getAvailableStudentsForActiveCourse().length === 0 ? (
                  <p className="text-[12px] text-slate-600 dark:text-white/40 text-center py-4 italic">All students in your workspace are already enrolled in this class.</p>
                ) : (
                  getAvailableStudentsForActiveCourse().map(u => (
                    <label key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-white/[0.03] cursor-pointer">
                      <input type="checkbox" checked={addStudentIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setAddStudentIds(s => [...s, u.id]);
                          else setAddStudentIds(s => s.filter(id => id !== u.id));
                        }}
                        className="accent-emerald-500 dark:accent-emerald-400"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] text-slate-900 dark:text-white/90 truncate">{u.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-white/40 truncate">{u.email}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-3 tracking-wide mt-auto">
                <button onClick={() => { setShowAddStudents(false); setAddStudentIds([]); }} className="text-xs text-slate-500 hover:text-slate-900 px-4 py-2 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5 rounded">Cancel</button>
                <button onClick={handleAddStudentsToClass} disabled={addStudentIds.length === 0 || addingStudents} 
                  className="text-xs bg-emerald-500 text-white font-medium disabled:opacity-50 px-5 py-2 rounded flex items-center gap-2">
                  {addingStudents ? <Loader2 className="w-3 h-3 animate-spin"/> : <UserPlus className="w-3 h-3"/>}
                  Enroll Students
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New Private Message Modal ── */}
      <AnimatePresence>
        {showNewPrivate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/40 dark:bg-black/60">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 p-6 flex flex-col shadow-2xl bg-white dark:bg-[#0f0f0f]/95">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white">New Conversation</h2>
                <button onClick={() => setShowNewPrivate(false)} className="text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              
              <input value={newPrivateName} onChange={e => setNewPrivateName(e.target.value)} placeholder="Conversation Group Name..." autoFocus
                className="w-full bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-lg py-2.5 px-3 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 dark:focus:border-indigo-400/50 mb-4" />
              
              <p className="text-[11px] uppercase text-slate-500 dark:text-white/30 font-medium mb-2">Select Members</p>
              <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto mb-6" style={{ scrollbarWidth: "thin" }}>
                {tenantUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-white/[0.03] cursor-pointer">
                    <input type="checkbox" checked={selectedUsers.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUsers(s => [...s, u.id]);
                        else setSelectedUsers(s => s.filter(id => id !== u.id));
                      }}
                      className="accent-indigo-500 dark:accent-indigo-400"
                    />
                    <div className="flex flex-col">
                      <span className="text-[13px] text-slate-900 dark:text-white/90">{u.name}</span>
                      <span className="text-[10px] text-slate-500 dark:text-white/40">{u.role} · {u.email}</span>
                    </div>
                  </label>
                ))}
            </div>

            <div className="flex justify-end gap-3 tracking-wide mt-auto">
              <button onClick={() => setShowNewPrivate(false)} className="text-xs text-slate-500 hover:text-slate-900 px-4 py-2 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5 rounded">Cancel</button>
              <button onClick={handleCreatePrivate} disabled={!newPrivateName.trim() || selectedUsers.length === 0 || creatingPrivate} 
                className="text-xs bg-indigo-500 text-white font-medium disabled:opacity-50 px-5 py-2 rounded flex items-center gap-2">
                {creatingPrivate ? <Loader2 className="w-3 h-3 animate-spin"/> : <UserPlus className="w-3 h-3"/>}
                Create
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
