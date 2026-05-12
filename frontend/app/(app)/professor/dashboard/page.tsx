"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, FileText, Activity, ChevronDown, ChevronRight,
  GraduationCap, Mail, BookOpen, FileCheck
} from "lucide-react";
import api from "@/lib/api";

type Student = { id: string; name: string; email: string; role: string };
type Course = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count: { enrollments: number; documents: number };
  enrollments: { student: Student }[];
};

export default function ProfessorDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/courses")
      .then(res => {
        setCourses(res.data);
        if (res.data.length > 0) setExpandedCourse(res.data[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter out the professor themselves from the student calculations
  // and deduplicate across courses
  const allStudents = Array.from(
    new Map(
      courses
        .flatMap(c => c.enrollments.map(e => e.student))
        .filter(s => s.role === 'STUDENT')
        .map(s => [s.id, s])
    ).values()
  );

  const totalStudents = allStudents.length;
  const totalDocs = courses.reduce((acc, c) => acc + (c._count?.documents || 0), 0);

  const stats = [
    { label: "Active Students", value: totalStudents, icon: Users, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20" },
    { label: "Documents Shared", value: totalDocs, icon: FileText, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
    { label: "Active Courses", value: courses.length, icon: Activity, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" },
  ];

  return (
    <div className="w-full flex-1 flex flex-col gap-6 max-w-[1100px] pb-12">

      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-black/5 dark:border-white/5 pb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white/90">Course Overview</h1>
        <p className="text-[13px] text-slate-600 dark:text-white/35 font-light">Monitor student engagement and manage your academic materials.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card p-5 flex items-center justify-between"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-slate-600 dark:text-white/40 font-medium">{stat.label}</span>
              <span className="text-[30px] font-mono tracking-tighter text-slate-900 dark:text-white/90">{stat.value}</span>
            </div>
            <div className={`w-11 h-11 rounded-full border flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Courses + Students per course ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-3 glass-card flex flex-col overflow-hidden"
        >
          <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <h2 className="text-[14px] font-medium text-slate-800 dark:text-white">Courses & Enrolled Students</h2>
          </div>

          <div className="overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {loading && (
              <div className="p-6 text-[12px] text-slate-500 dark:text-white/30 text-center">Loading...</div>
            )}
            {!loading && courses.length === 0 && (
              <div className="p-6 text-[12px] text-slate-500 dark:text-white/30 text-center">No courses yet.</div>
            )}
            {courses.map(course => {
              const isOpen = expandedCourse === course.id;
              // Filter out professors from the course-level list too
              const students = course.enrollments.map(e => e.student).filter(s => s.role === 'STUDENT');
              
              return (
                <div key={course.id} className="border-b border-black/5 dark:border-white/[0.04] last:border-0">
                  {/* Course row */}
                  <button
                    onClick={() => setExpandedCourse(isOpen ? null : course.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors text-left"
                  >
                    {isOpen
                      ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-white/30 shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-white/30 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 dark:text-white/85 truncate">{course.name}</p>
                      {course.description && (
                         <p className="text-[11px] text-slate-600 dark:text-white/30 truncate">{course.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-white/35">
                        <Users className="w-3 h-3" />{students.length}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-white/35">
                        <FileCheck className="w-3 h-3" />{course._count.documents}
                      </span>
                    </div>
                  </button>

                  {/* Students list */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {students.length === 0 ? (
                          <p className="px-12 py-3 text-[11px] text-slate-500 dark:text-white/25 italic">No students enrolled yet.</p>
                        ) : (
                          students.map(student => (
                            <div
                              key={student.id}
                              className="flex items-center gap-3 px-12 py-2.5 border-t border-black/5 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.015] transition-colors"
                            >
                              <div className="w-6 h-6 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 dark:border-emerald-400/20 flex items-center justify-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-slate-800 dark:text-white/75 truncate">{student.name}</p>
                                <p className="text-[10px] text-slate-600 dark:text-white/30 truncate">{student.email}</p>
                              </div>
                              <GraduationCap className="w-3 h-3 text-slate-300 dark:text-white/20 shrink-0" />
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── All Students roster ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 glass-card flex flex-col overflow-hidden"
        >
          <div className="p-5 border-b border-black/5 dark:border-white/5 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-[14px] font-medium text-slate-800 dark:text-white">All Students</h2>
            <span className="ml-auto text-[11px] text-slate-600 dark:text-white/30 font-mono">{allStudents.length} total</span>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {allStudents.length === 0 && !loading && (
              <div className="p-6 text-[12px] text-slate-500 dark:text-white/30 text-center">No students yet.</div>
            )}
            {allStudents.map(student => {
              const courseCount = courses.filter(c =>
                c.enrollments.some(e => e.student.id === student.id)
              ).length;
              return (
                <div
                  key={student.id}
                  className="flex items-center gap-3 px-5 py-3.5 border-b border-black/5 dark:border-white/[0.04] last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 border border-cyan-500/20 dark:border-cyan-400/20 flex items-center justify-center text-[11px] font-bold text-cyan-600 dark:text-cyan-400 shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-800 dark:text-white/80 truncate">{student.name}</p>
                    <p className="text-[10px] text-slate-600 dark:text-white/30 truncate flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5" />{student.email}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-slate-600 dark:text-white/25">{courseCount} course{courseCount !== 1 ? "s" : ""}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400/60" title="Enrolled" />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
