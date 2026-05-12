"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle2, Users, ChevronDown, User, Info } from "lucide-react";
import api from "@/lib/api";
import { useSettings } from "@/lib/SettingsContext";

export default function ProfessorDistribution() {
  const { t, language } = useSettings();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Assignment State
  const [isAssignment, setIsAssignment] = useState(false);
  const [deadline, setDeadline] = useState("");

  // Push State
  const [isPushing, setIsPushing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPushedDetails, setLastPushedDetails] = useState({ count: 0, type: "Document" });

  const [courses, setCourses] = useState<any[]>([]);
  useEffect(() => {
    api.get("/courses").then(res => setCourses(res.data)).catch(console.error);
  }, []);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // All enrolled students in this course — these always receive the document
  const enrolledStudents: any[] = selectedCourse?.enrollments?.map((e: any) => e.student) || [];

  const canPush =
    files.length > 0 &&
    selectedCourseId !== "" &&
    !(isAssignment && !deadline) &&
    !isPushing;

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row gap-6 max-w-[1280px]">

      {/* ── LEFT PANEL: Upload ── */}
      <div className="w-full md:w-[40%] flex flex-col gap-6">
        <div className="flex flex-col gap-2 mb-2">
          <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 dark:text-[#f0f0f2]">
            {t("distribution")}
          </h1>
          <p className="text-[14px] text-slate-600 dark:text-white/40 font-light leading-relaxed">
            {language === "fr" ? "Téléchargez des syllabus, diapositives ou devoirs et envoyez-les directement à tous les étudiants d'un cours." : "Upload syllabi, slides, or assignments and push them directly to all students in a course."}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card flex flex-col shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden p-6"
        >
          {/* Dropzone */}
          <div
            className={`
              relative w-full h-[240px] rounded-xl border flex flex-col items-center justify-center gap-3 transition-all duration-300
              ${isDragging ? "border-accent-cyan bg-accent-cyan/5" : "border-black/10 dark:border-white/10 border-dashed bg-slate-100/50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04]"}
              ${files.length > 0 ? "border-solid border-emerald-500/30 bg-emerald-500/5" : ""}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
              }
            }}
          >
            <input
              type="file"
              accept=".pdf"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                }
              }}
            />
            <AnimatePresence mode="wait">
              {files.length === 0 ? (
                <motion.div key="empty" className="flex flex-col items-center pointer-events-none text-center">
                  <UploadCloud className="w-10 h-10 text-slate-300 dark:text-white/20 mb-3" />
                  <p className="text-[15px] font-medium text-slate-800 dark:text-white/80">{language === "fr" ? "Glisser-déposer les documents" : "Drag & drop course materials"}</p>
                  <p className="text-[12px] text-slate-600 dark:text-white/40 mt-1">.PDF only</p>
                </motion.div>
              ) : (
                <motion.div key="filled" className="flex flex-col items-center pointer-events-none text-center px-4 w-full h-full justify-center">
                  <div className="flex flex-wrap gap-2 justify-center max-h-[100px] overflow-y-auto mb-3" style={{ scrollbarWidth: "none" }}>
                    {files.map((file, i) => (
                      <div key={i} className="px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 dark:border-emerald-400/20 flex items-center gap-2 max-w-[200px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); setFiles([]); }}
                    className="text-[12px] text-slate-600 hover:text-slate-900 dark:text-white/40 dark:hover:text-white underline pointer-events-auto"
                  >
                    {language === "fr" ? "Réinitialiser" : "Reset Files"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Deadline Configuration ── */}
          <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer group w-fit">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                ${isAssignment ? "bg-accent-violet border-accent-violet" : "border-black/20 group-hover:border-black/40 dark:border-white/20 dark:group-hover:border-white/40 bg-black/[0.02] dark:bg-white/[0.02]"}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isAssignment}
                  onChange={(e) => setIsAssignment(e.target.checked)}
                />
                {isAssignment && <CheckCircle2 className="w-3.5 h-3.5 text-white dark:text-black" />}
              </div>
              <span className="text-[14px] font-medium text-slate-800 dark:text-white/80 group-hover:text-black dark:group-hover:text-white transition-colors">
                {language === "fr" ? "Marquer comme devoir noté" : "Mark as Graded Assignment"}
              </span>
            </label>

            <AnimatePresence>
              {isAssignment && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-2 overflow-hidden"
                >
                  <label className="text-[11px] uppercase tracking-widest text-slate-600 dark:text-white/40 font-medium">{language === "fr" ? "Date et heure limite" : "Due Date & Time"}</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-[6px] py-2.5 px-4 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-accent-violet/50 transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL: Recipients ── */}
      <div className="w-full md:w-[60%] flex flex-col pt-2 md:pt-16">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card flex-1 relative flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-accent-cyan" />
              {language === "fr" ? "Destinataires" : "Recipients"}
            </h2>

            {/* Course Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 rounded px-4 py-1.5 text-[12px] font-medium text-slate-800 dark:text-white/90 flex items-center gap-2 transition-colors min-w-[170px] justify-between"
              >
                <span className="truncate">
                  {selectedCourse ? selectedCourse.name : (language === "fr" ? "Sélectionner un cours" : "Select a course")}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-600 dark:text-white/40 transition-transform shrink-0 ${isCourseDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isCourseDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 mt-1 w-full rounded-md border border-black/10 dark:border-white/10 shadow-lg overflow-hidden z-50 backdrop-blur-md bg-white dark:bg-[#0f0f0f]/95"
                  >
                    {courses.length === 0 ? (
                      <div className="px-4 py-3 text-[12px] text-slate-500 dark:text-white/30 text-center">No courses found</div>
                    ) : (
                      courses.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCourseId(c.id); setIsCourseDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-[12px] transition-colors
                            ${selectedCourseId === c.id ? "bg-accent-cyan/10 text-accent-cyan font-medium" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"}`}
                        >
                          {c.name}
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Distribution scope notice */}
          {selectedCourse && (
            <div className="px-6 py-3 bg-accent-cyan/[0.03] border-b border-black/5 dark:border-white/5 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
              <p className="text-[12px] text-slate-600 dark:text-white/50">
                This document will be distributed to{" "}
                <span className="font-semibold text-slate-800 dark:text-white">all {enrolledStudents.length} enrolled student{enrolledStudents.length !== 1 ? "s" : ""}</span>{" "}
                in <span className="font-semibold text-slate-800 dark:text-white">{selectedCourse.name}</span>.
              </p>
            </div>
          )}

          {/* Student List (read-only — all students receive the push) */}
          <div className="p-4 flex flex-col gap-2 overflow-y-auto flex-1" style={{ scrollbarWidth: "thin" }}>
            {!selectedCourseId ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12">
                <Users className="w-8 h-8 text-slate-300 dark:text-white/15" />
                <span className="text-slate-500 dark:text-white/30 text-[13px] text-center">
                  {language === "fr" ? "Sélectionnez un cours pour voir qui recevra cette distribution." : "Select a course to see who will receive this distribution."}
                </span>
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-slate-500 dark:text-white/40 text-[13px] text-center">No students enrolled in this course yet.</span>
              </div>
            ) : (
              enrolledStudents.map((student: any) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.015] dark:bg-white/[0.015]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-[11px] font-bold text-accent-cyan">
                      {student.name?.[0] ?? "?"}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] text-slate-800 dark:text-white/90 font-medium">{student.name}</span>
                      <span className="text-[11px] text-slate-600 dark:text-white/40">{student.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {language === "fr" ? "Recevra" : "Will receive"}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Push Button */}
          <div className="p-6 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
            <button
              onClick={async () => {
                setIsPushing(true);
                setLastPushedDetails({ count: enrolledStudents.length, type: isAssignment ? "Assignment" : "Document" });

                try {
                  for (const file of files) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("courseId", selectedCourseId);
                    formData.append("isAssignment", isAssignment.toString());
                    if (isAssignment && deadline) {
                      formData.append("deadline", new Date(deadline).toISOString());
                    }
                    await api.post("/documents/upload", formData, {
                      headers: { "Content-Type": "multipart/form-data" }
                    });
                  }

                  setIsPushing(false);
                  setShowSuccessModal(true);
                  setFiles([]);
                  setIsAssignment(false);
                  setDeadline("");
                  setTimeout(() => setShowSuccessModal(false), 3000);
                } catch (err) {
                  console.error("Upload failed", err);
                  setIsPushing(false);
                  alert("Upload failed. Only PDF files are supported. Check your connection and try again.");
                }
              }}
              disabled={!canPush}
              className={`w-full py-[14px] text-[13px] font-medium rounded-[6px] transition-all relative overflow-hidden
                ${isPushing
                  ? "bg-black/10 dark:bg-white/10 text-transparent cursor-wait"
                  : "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:bg-white dark:text-black dark:hover:bg-[#e0e0e0] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"}`}
            >
              <span className={isPushing ? "opacity-0" : ""}>
                Push {isAssignment ? (language === "fr" ? "Devoir" : "Assignment") : (language === "fr" ? "Document" : "Document")}{files.length > 1 ? "s" : ""} {language === "fr" ? "vers" : "to"} {enrolledStudents.length} {language === "fr" ? `Étudiant${enrolledStudents.length !== 1 ? "s" : ""}` : `Student${enrolledStudents.length !== 1 ? "s" : ""}`}
              </span>

              {isPushing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white rounded-full animate-spin" />
                </div>
              )}
            </button>

            {isAssignment && !deadline && files.length > 0 && selectedCourseId && (
              <p className="text-center text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center justify-center gap-1">
                <Info className="w-3 h-3" />
                Set a due date to enable the push.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Success Modal ── */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-[320px] rounded-2xl border border-emerald-500/30 p-8 flex flex-col items-center relative shadow-[0_0_50px_rgba(16,185,129,0.15)] text-center bg-white dark:bg-[#0a0f0c]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
              </motion.div>

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{language === "fr" ? "Distribution réussie !" : "Successfully Distributed!"}</h2>
              <p className="text-sm text-slate-600 dark:text-white/50 font-light mb-6">
                Your {lastPushedDetails.type.toLowerCase()} has been pushed to{" "}
                <span className="text-slate-800 dark:text-white font-medium">{lastPushedDetails.count}</span> student{lastPushedDetails.count !== 1 ? "s" : ""}.
              </p>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
              >
                {t("cancel")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
