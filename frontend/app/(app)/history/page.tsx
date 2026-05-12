"use client";

import { motion } from "framer-motion";
import { History, Database, ArrowRight, Star, Clock, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const router = useRouter();

  const sessions = [
    {
      id: 1,
      title: "Midterm Review: Classical Mechanics",
      documents: ["Physics101_Syllabus.pdf", "Chapter4_Slides.pptx"],
      date: "2 hours ago",
      queries: 14,
      isStarred: true
    },
    {
      id: 2,
      title: "Plagiarism Screening & Feedback",
      documents: ["Assignment_4_Submissions.zip"],
      date: "Yesterday",
      queries: 32,
      isStarred: false
    },
    {
      id: 3,
      title: "Homework 2 Concepts Breakdown",
      documents: ["HW2_Questions.pdf", "Lecture_Notes_Wk3.docx"],
      date: "Oct 12, 2026",
      queries: 8,
      isStarred: false
    },
    {
      id: 4,
      title: "Final Project Guidelines Analysis",
      documents: ["Project_Rubric_Fall.pdf"],
      date: "Sep 28, 2026",
      queries: 19,
      isStarred: true
    }
  ];

  return (
    <div className="w-full flex-1 flex flex-col gap-6 max-w-[1024px] pb-12">
      {/* Header Section */}
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div className="flex flex-col gap-2">
          <div className="w-10 h-10 rounded-full bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center mb-2">
            <History className="w-5 h-5 text-accent-violet" />
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#f0f0f2]">
            Study Sessions
          </h1>
          <p className="text-[14px] text-white/40 font-light leading-relaxed max-w-[400px]">
            Review, continue, or export your previous AI tutoring and grading sessions.
          </p>
        </div>
        
        <button 
          onClick={() => router.push("/upload")}
          className="px-5 py-2.5 rounded-md bg-white text-black text-[13px] font-medium tracking-wide hover:bg-[#e0e0e0] shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all flex items-center gap-2"
        >
          New Session
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {sessions.map((session, idx) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className="group glass-card p-6 flex flex-col gap-4 relative overflow-hidden transition-all hover:border-white/20 hover:bg-white/[0.06] cursor-pointer"
            style={{ background: "rgba(10, 10, 10, 0.5)" }}
            onClick={() => router.push("/query")}
          >
            {/* Glow on hover effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-violet/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
              <h3 className="text-[16px] font-medium text-white/90 group-hover:text-white transition-colors line-clamp-1 pr-8">
                {session.title}
              </h3>
              <div className="flex items-center gap-2">
                {session.isStarred && (
                  <Star className="w-4 h-4 text-yellow-500/80 fill-yellow-500/20" />
                )}
                <button className="p-1 px-1.5 rounded bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-colors" onClick={(e) => { e.stopPropagation(); }}>
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 relative z-10">
              <div className="flex items-center gap-2 text-white/40">
                <Database className="w-3.5 h-3.5 hidden" />
                <span className="text-[12px] font-mono tracking-wide truncate">
                  {session.documents.join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-white/30">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">
                  {session.date} • {session.queries} queries
                </span>
              </div>
            </div>
            
          </motion.div>
        ))}
      </div>
    </div>
  );
}
