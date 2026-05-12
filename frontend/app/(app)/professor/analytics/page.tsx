"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSettings } from "@/lib/SettingsContext";
import { motion } from "framer-motion";
import {
  TrendingUp,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  MessageSquareDiff,
  ChevronDown,
  ChevronUp,
  WifiOff,
  FileDown,
  Clock,
} from "lucide-react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList
} from "recharts";
import api from "@/lib/api";

type StudentMetrics = {
  id: string;
  name: string;
  email: string;
  role: string;
  queriesAsked: number;
  averageScore: number;
  completionRate: number;
  missedDeadlines: number;
  onTimeSubmissions: number;
  lateSubmissions: number;
};

type CourseAnalytics = {
  id: string;
  name: string;
  enrollments: { student: StudentMetrics }[];
};

type GradingSubmission = {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number | null;
  submittedAt: string;
  submissionFileName: string | null;
  hasFile: boolean;
};

type GradingAssignment = {
  id: string;
  name: string;
  deadline: string | null;
  submissions: GradingSubmission[];
};

type GradingCourse = {
  id: string;
  name: string;
  assignments: GradingAssignment[];
};

// Targets used for trend computation
const CLASS_AVG_TARGET = 14;   // out of 20
const COMPLETION_TARGET = 80;
const HIGH_ENGAGEMENT_THRESHOLD = 5;
const MOD_ENGAGEMENT_THRESHOLD = 2;

export default function AnalyticsDashboard() {
  const [courses, setCourses] = useState<CourseAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllRisk, setShowAllRisk] = useState(false);
  const [showAllTop, setShowAllTop] = useState(false);

  // Global course selector — drives all panels
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target as Node)) {
        setCourseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Grading hub state
  const [gradingData, setGradingData] = useState<GradingCourse[]>([]);
  const [gradingCourseId, setGradingCourseId] = useState("");
  const [gradingAssignmentId, setGradingAssignmentId] = useState("");
  const [localScores, setLocalScores] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [gradingDropdownOpen, setGradingDropdownOpen] = useState(false);
  const [assignmentDropdownOpen, setAssignmentDropdownOpen] = useState(false);

  // When the global course selector changes, sync the grading hub to the same course
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setGradingCourseId(courseId);
    const gc = gradingData.find(c => c.id === courseId);
    setGradingAssignmentId(gc?.assignments[0]?.id ?? "");
  };

  const { theme, language, t } = useSettings();
  const isDark = theme === "dark";

  // Chart theme-aware colors — fixes invisible axes in light mode
  const chartAxisColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const chartTickColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const chartGridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const chartCursorColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  useEffect(() => {
    api.get("/analytics/courses")
      .then(res => {
        setCourses(res.data);
        // Default to first course
        if (res.data.length > 0) {
          setSelectedCourseId(res.data[0].id);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    api.get("/analytics/grading")
      .then(res => {
        setGradingData(res.data);
        if (res.data.length > 0) {
          setGradingCourseId(res.data[0].id);
          if (res.data[0].assignments.length > 0) {
            setGradingAssignmentId(res.data[0].assignments[0].id);
          }
        }
      })
      .catch(() => {}); // grading hub failure is non-critical
  }, []);

  // Only show students enrolled in the selected course
  const displayData = useMemo(() => {
    if (!selectedCourseId) return [];
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return [];
    return course.enrollments
      .filter(e => e.student.role === "STUDENT")
      .map(e => e.student);
  }, [courses, selectedCourseId]);

  const selectedCourseName = courses.find(c => c.id === selectedCourseId)?.name ?? "";

  // Derived aggregations
  const totalStudents = displayData.length;
  const classAverage = totalStudents > 0
    ? parseFloat((displayData.reduce((acc, s) => acc + s.averageScore, 0) / totalStudents).toFixed(1))
    : 0;
  const avgCompletion = totalStudents > 0
    ? Math.round(displayData.reduce((acc, s) => acc + s.completionRate, 0) / totalStudents)
    : 0;
  const totalQueries = displayData.reduce((acc, s) => acc + s.queriesAsked, 0);
  const avgQueriesPerStudent = totalStudents > 0 ? totalQueries / totalStudents : 0;

  // Real trend deltas vs targets
  const classAvgDelta = classAverage - CLASS_AVG_TARGET;
  const completionDelta = avgCompletion - COMPLETION_TARGET;
  const engagementLabel =
    avgQueriesPerStudent >= HIGH_ENGAGEMENT_THRESHOLD ? (language === "fr" ? "Engagement Élevé" : "High Engagement") :
    avgQueriesPerStudent >= MOD_ENGAGEMENT_THRESHOLD ? "Moderate" :
    (language === "fr" ? "Faible Engagement" : "Low Engagement");
  const engagementUp = avgQueriesPerStudent >= MOD_ENGAGEMENT_THRESHOLD;

  const metrics = [
    {
      title: t("classAverage"),
      value: `${classAverage}/20`,
      icon: TrendingUp,
      color: "text-pink-400",
      bg: "bg-pink-400/10 border-pink-400/20",
      trend: `${classAvgDelta >= 0 ? "+" : ""}${classAvgDelta.toFixed(1)} vs 14/20 target`,
      trendUp: classAvgDelta >= 0,
    },
    {
      title: t("assignmentCompletion"),
      value: `${avgCompletion}%`,
      icon: BookOpen,
      color: "text-accent-cyan",
      bg: "bg-accent-cyan/10 border-accent-cyan/20",
      trend: `${completionDelta >= 0 ? "+" : ""}${completionDelta}% vs 80% target`,
      trendUp: completionDelta >= 0,
    },
    {
      title: t("totalAIQueries"),
      value: totalQueries.toString(),
      icon: MessageSquareDiff,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
      trend: engagementLabel,
      trendUp: engagementUp,
    },
  ];

  // Student segments
  // Student segments — thresholds scaled to /20
  const riskStudents = displayData
    .filter(s => s.missedDeadlines > 0 || s.averageScore < 12)
    .sort((a, b) => b.missedDeadlines - a.missedDeadlines || a.averageScore - b.averageScore);

  const topStudents = displayData
    .filter(s => s.missedDeadlines === 0 && s.averageScore >= 16 && s.completionRate > 80)
    .sort((a, b) => b.averageScore - a.averageScore);

  const visibleRisk = showAllRisk ? riskStudents : riskStudents.slice(0, 5);
  const visibleTop = showAllTop ? topStudents : topStudents.slice(0, 5);

  // Scatter chart data
  const scatterData = displayData.map(s => ({
    name: s.name,
    queries: s.queriesAsked,
    score: s.averageScore,
    completion: s.completionRate,
    missed: s.missedDeadlines,
  }));

  const filteredStudents = displayData.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Scatter tooltip
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-[#0f0f0f]/95 border border-black/10 dark:border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="font-medium text-slate-900 dark:text-white mb-2">{data.name}</p>
          <div className="flex flex-col gap-1 text-[12px]">
            <span className="text-slate-600 dark:text-white/60">
              Study Queries: <span className="text-emerald-500 dark:text-emerald-400 font-medium">{data.queries}</span>
            </span>
            <span className="text-slate-600 dark:text-white/60">
              Average Score: <span className="text-pink-500 dark:text-pink-400 font-medium">{data.score}/20</span>
            </span>
            <span className="text-slate-600 dark:text-white/60">
              Missed Deadlines:{" "}
              <span className={data.missed > 0 ? "text-rose-500 dark:text-rose-400 font-medium" : "text-slate-900 dark:text-white font-medium"}>
                {data.missed}
              </span>
            </span>
            <span className="text-slate-600 dark:text-white/60">
              Completion: <span className="text-slate-900 dark:text-white font-medium">{data.completion}%</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-6 max-w-[1280px] pb-12">

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-black/5 dark:border-white/5 pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Performance Analytics{" "}
            <span className="text-[10px] uppercase font-mono tracking-widest bg-pink-500/10 text-pink-600 dark:text-pink-400 px-2 py-1 rounded border border-pink-500/20">
              {t("beta")}
            </span>
          </h1>
          <p className="text-[14px] text-slate-500 dark:text-white/40 font-light max-w-[600px]">
            Deep insights into student engagement. Correlates AI Study Hub usage with academic performance.
          </p>
        </div>

        {/* Global course selector — dropdown */}
        {courses.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-widest text-slate-400 dark:text-white/30 font-medium">{t("course")}</span>
            <div className="relative" ref={courseDropdownRef}>
              <button
                onClick={() => setCourseDropdownOpen(p => !p)}
                className="flex items-center gap-2 pl-4 pr-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/60 dark:hover:bg-white/10 text-[13px] font-medium text-slate-800 dark:text-white/90 transition-all min-w-[220px] justify-between"
              >
                <span className="truncate">
                  {courses.find(c => c.id === selectedCourseId)?.name ?? "Select a course"}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-white/30 transition-transform shrink-0 ${courseDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {courseDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-full min-w-[240px] rounded-xl border border-black/10 dark:border-white/10 shadow-2xl z-50 backdrop-blur-xl bg-white/95 dark:bg-[#0f0f0f]/95 overflow-hidden py-1">
                  {courses.map((course, i) => (
                    <button
                      key={course.id}
                      onClick={() => { handleSelectCourse(course.id); setCourseDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center gap-2 ${
                        selectedCourseId === course.id
                          ? "bg-slate-900 dark:bg-white text-white dark:text-black font-medium"
                          : "text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                        selectedCourseId === course.id
                          ? "bg-white/20 dark:bg-black/20"
                          : "bg-black/5 dark:bg-white/10 text-slate-500 dark:text-white/40"
                      }`}>{i + 1}</span>
                      {course.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="w-full h-40 flex justify-center items-center text-slate-400 dark:text-white/30 text-sm">
          Aggregating intelligence...
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 flex flex-col items-center gap-3 text-center"
        >
          <WifiOff className="w-8 h-8 text-rose-400" />
          <p className="text-[15px] font-medium text-slate-800 dark:text-white/90">Failed to load analytics</p>
          <p className="text-[13px] text-slate-500 dark:text-white/40 max-w-[360px]">
            Could not connect to the API. Check your network or try refreshing the page.
          </p>
          <button
            onClick={() => { setError(false); setLoading(true); api.get("/analytics/courses").then(r => setCourses(r.data)).catch(() => setError(true)).finally(() => setLoading(false)); }}
            className="mt-2 px-4 py-2 text-[13px] rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-[#e0e0e0] transition-colors"
          >
            Retry
          </button>
        </motion.div>
      )}

      {!loading && !error && (
        <>
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {metrics.map((metric, i) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 dark:bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${metric.bg}`}>
                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-black/5 dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.05] ${metric.trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {metric.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {metric.trend}
                  </div>
                </div>
                <div>
                  <h3 className="text-[32px] font-mono tracking-tighter text-slate-800 dark:text-white font-medium">{metric.value}</h3>
                  <p className="text-[12px] uppercase tracking-widest text-slate-500 dark:text-white/40 font-medium mt-1">{metric.title}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Scatter Chart */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 glass-card flex flex-col p-6"
            >
              <div className="flex flex-col mb-8">
                <h2 className="text-[16px] font-semibold text-slate-800 dark:text-white/90">Engagement vs Grade Correlation</h2>
                <p className="text-[12px] text-slate-500 dark:text-white/40 mt-1">
                  Scatter plot of AI study queries (X) against manually graded average score (Y).
                </p>
              </div>
              {scatterData.length === 0 ? (
                <div className="w-full h-[320px] flex items-center justify-center text-slate-400 dark:text-white/30 text-[13px]">
                  No student data yet. Enroll students in a course to see data here.
                </div>
              ) : (
                <div className="w-full h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 40, bottom: 30, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                      <XAxis
                        type="number"
                        dataKey="queries"
                        name="Queries Asked"
                        stroke={chartAxisColor}
                        tick={{ fill: chartTickColor, fontSize: 11 }}
                        label={{ value: "AI Queries Asked", position: "insideBottom", offset: -18, fill: chartTickColor, fontSize: 11 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="score"
                        name="Average Score"
                        stroke={chartAxisColor}
                        tick={{ fill: chartTickColor, fontSize: 11 }}
                        domain={[0, 20]}
                        ticks={[0, 4, 8, 12, 16, 20]}
                        label={{ value: "Score (/20)", angle: -90, position: "insideLeft", fill: chartTickColor, fontSize: 11 }}
                      />
                      {/* Zone bands */}
                      <ReferenceLine y={12} stroke="#fb7185" strokeDasharray="4 3" strokeOpacity={0.5}
                        label={{ value: "At Risk", position: "right", fill: "#fb7185", fontSize: 10 }}
                      />
                      <ReferenceLine y={16} stroke="#34d399" strokeDasharray="4 3" strokeOpacity={0.5}
                        label={{ value: "Excellent", position: "right", fill: "#34d399", fontSize: 10 }}
                      />
                      <RechartsTooltip
                        content={<CustomScatterTooltip />}
                        cursor={{ strokeDasharray: "3 3", stroke: chartCursorColor }}
                      />
                      <Scatter name="Students" data={scatterData} fill="#ec4899" shape={(props: any) => {
                        const { cx, cy, fill } = props;
                        return (
                          <circle cx={cx} cy={cy} r={8} fill={fill} fillOpacity={0.9}
                            stroke="white" strokeOpacity={0.3} strokeWidth={1.5}
                          />
                        );
                      }}>
                        <LabelList
                          dataKey="name"
                          position="top"
                          style={{ fontSize: 10, fill: chartTickColor, fontWeight: 500 }}
                          offset={10}
                        />
                        {scatterData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.score >= 16 ? "#34d399" : entry.score < 12 ? "#ef4444" : "#ec4899"}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Legend */}
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                {[
                  { color: "bg-emerald-400", label: "Excellent (≥16/20)" },
                  { color: "bg-pink-400",    label: "Average (12–16/20)" },
                  { color: "bg-rose-500",    label: "At Risk (<12/20)" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                    <span className="text-[11px] text-slate-500 dark:text-white/40">{l.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Risk & Top Performers Panel */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card flex flex-col overflow-hidden"
            >
              {/* At Risk */}
              <div className="flex flex-col border-b border-black/5 dark:border-white/5">
                <div className="p-5 flex items-center gap-2 bg-rose-500/[0.02]">
                  <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  <h2 className="text-[14px] font-medium text-slate-800 dark:text-white/90">At-Risk Students</h2>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-rose-500/10 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 dark:border-rose-400/20">
                    {riskStudents.length}
                  </span>
                </div>
                <div className="overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {riskStudents.length === 0 ? (
                    <div className="p-4 text-[12px] text-slate-500 dark:text-white/30 text-center italic">No students at risk.</div>
                  ) : (
                    <>
                      {visibleRisk.map(student => (
                        <div key={student.id + "risk"} className="px-5 py-3 border-b border-black/5 dark:border-white/[0.04] last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-rose-500/10 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px] font-bold border border-rose-500/20 dark:border-rose-400/20">
                              {student.name[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] text-slate-800 dark:text-white/90">{student.name}</span>
                        <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80">{student.missedDeadlines} missed deadline{student.missedDeadlines !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          <span className="text-[14px] font-mono text-rose-600 dark:text-rose-400">{student.averageScore}/20</span>
                        </div>
                      ))}
                      {riskStudents.length > 5 && (
                        <button
                          onClick={() => setShowAllRisk(p => !p)}
                          className="w-full py-2.5 text-[11px] text-slate-500 hover:text-slate-800 dark:text-white/30 dark:hover:text-white/70 border-t border-black/5 dark:border-white/5 flex items-center justify-center gap-1 transition-colors"
                        >
                          {showAllRisk ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showAllRisk ? "Show less" : `Show ${riskStudents.length - 5} more`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Top Performers */}
              <div className="flex flex-col bg-emerald-500/[0.01]">
                <div className="p-5 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <h2 className="text-[14px] font-medium text-slate-800 dark:text-white/90">Top Performers</h2>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-400/20">
                    {topStudents.length}
                  </span>
                </div>
                <div className="overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {topStudents.length === 0 ? (
                    <div className="p-4 text-[12px] text-slate-500 dark:text-white/30 text-center italic">Need more graded submissions.</div>
                  ) : (
                    <>
                      {visibleTop.map(student => (
                        <div key={student.id + "top"} className="px-5 py-3 border-b border-black/5 dark:border-white/[0.04] last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/20 dark:border-emerald-400/20">
                              {student.name[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] text-slate-800 dark:text-white/90">{student.name}</span>
                              <span className="text-[10px] text-slate-500 dark:text-white/40">{student.queriesAsked} queries asked</span>
                            </div>
                          </div>
                          <span className="text-[14px] font-mono text-emerald-600 dark:text-emerald-400">{student.averageScore}/20</span>
                        </div>
                      ))}
                      {topStudents.length > 5 && (
                        <button
                          onClick={() => setShowAllTop(p => !p)}
                          className="w-full py-2.5 text-[11px] text-slate-500 hover:text-slate-800 dark:text-white/30 dark:hover:text-white/70 border-t border-black/5 dark:border-white/5 flex items-center justify-center gap-1 transition-colors"
                        >
                          {showAllTop ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {showAllTop ? "Show less" : `Show ${topStudents.length - 5} more`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Student Roster Table */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card flex flex-col overflow-hidden"
          >
            <div className="p-5 border-b border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[16px] font-semibold text-slate-800 dark:text-white/90">Detailed Student Roster</h2>
                <p className="text-[11px] text-slate-500 dark:text-white/40">
                  Avg Score is computed from manually graded submissions only.
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 dark:text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-lg py-2 pl-9 pr-4 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:border-pink-500/50 transition-colors"
                />
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                    <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Student</th>
                    <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Study Queries</th>
                    <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Completion Rate</th>
                    <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Missed Deadlines</th>
                    <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Avg Score</th>
                    <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-white/30 text-[13px]">
                        {searchTerm ? "No matching students found." : "No students enrolled yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => (
                      <tr key={student.id} className="border-b border-black/5 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-[13px] text-slate-800 dark:text-white/90 font-medium group-hover:text-black dark:group-hover:text-white transition-colors">{student.name}</span>
                            <span className="text-[11px] text-slate-500 dark:text-white/30">{student.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[13px] font-mono text-slate-600 dark:text-white/80">{student.queriesAsked}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[13px] font-mono text-slate-600 dark:text-white/80 w-8">{student.completionRate}%</span>
                            <div className="w-24 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${student.completionRate > 80 ? "bg-emerald-500 dark:bg-emerald-400" : student.completionRate > 50 ? "bg-yellow-500 dark:bg-yellow-400" : "bg-rose-500 dark:bg-rose-400"}`}
                                style={{ width: `${student.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[13px] font-mono font-medium ${student.missedDeadlines > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {student.missedDeadlines}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[14px] font-mono font-medium" style={{
                            color: student.averageScore >= 16 ? "#34d399" : student.averageScore < 12 ? "#fb7185" : undefined
                          }}>
                            {student.averageScore > 0 ? `${student.averageScore}/20` : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] px-2 py-1 rounded border uppercase tracking-wider font-medium
                            ${student.missedDeadlines === 0 && student.averageScore >= 16 && student.completionRate > 80
                              ? "bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-400/20"
                              : student.missedDeadlines > 0 || student.averageScore < 12
                              ? "bg-rose-500/10 dark:bg-rose-400/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-400/20"
                              : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 border-black/5 dark:border-white/10"}`}
                          >
                            {student.missedDeadlines === 0 && student.averageScore >= 16 && student.completionRate > 80
                              ? "Excellent"
                              : student.missedDeadlines > 0 || student.averageScore < 12
                              ? "At Risk"
                              : "On Track"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredStudents.length > 0 && (
              <div className="px-6 py-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                <p className="text-[11px] text-slate-500 dark:text-white/30">
                  {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} {searchTerm ? "matching" : "total"}
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Grading Hub ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-black/5 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[16px] font-semibold text-slate-800 dark:text-white/90 flex items-center gap-2">
                  Assignment Grading
                  {(() => {
                    const sc = gradingData.find(c => c.id === gradingCourseId);
                    const sa = sc?.assignments.find(a => a.id === gradingAssignmentId);
                    const pending = sa?.submissions.filter(s => s.score === null).length ?? 0;
                    return pending > 0 ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded border border-amber-500/20 dark:border-amber-400/20">
                        <Clock className="w-3 h-3" />{pending} pending
                      </span>
                    ) : null;
                  })()}
                </h2>
                <p className="text-[12px] text-slate-500 dark:text-white/40">
                  Select a course and assignment to view submissions and enter grades.
                </p>
              </div>

              {/* Selectors */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Course label — controlled by global course tabs above */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[12px] font-medium text-slate-700 dark:text-white/70">
                  <span className="text-slate-400 dark:text-white/30 text-[11px]">Course:</span>
                  <span>{gradingData.find(c => c.id === gradingCourseId)?.name ?? "—"}</span>
                </div>

                {/* Assignment dropdown */}
                {(() => {
                  const selectedGradingCourse = gradingData.find(c => c.id === gradingCourseId);
                  return (
                    <div className="relative">
                      <button
                        onClick={() => { setAssignmentDropdownOpen(p => !p); setGradingDropdownOpen(false); }}
                        disabled={!selectedGradingCourse || selectedGradingCourse.assignments.length === 0}
                        className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 rounded px-3 py-1.5 text-[12px] font-medium text-slate-800 dark:text-white/90 flex items-center gap-2 transition-colors min-w-[180px] justify-between disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="truncate">
                          {selectedGradingCourse?.assignments.find(a => a.id === gradingAssignmentId)?.name ?? "Select assignment"}
                        </span>
                        <ChevronDown className={`w-3 h-3 text-slate-500 dark:text-white/40 transition-transform shrink-0 ${assignmentDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                      {assignmentDropdownOpen && selectedGradingCourse && (
                        <div className="absolute top-full left-0 mt-1 w-full min-w-[220px] rounded-md border border-black/10 dark:border-white/10 shadow-lg z-50 backdrop-blur-md bg-white dark:bg-[#0f0f0f]/95 overflow-hidden">
                          {selectedGradingCourse.assignments.map(a => (
                            <button
                              key={a.id}
                              onClick={() => { setGradingAssignmentId(a.id); setAssignmentDropdownOpen(false); setLocalScores({}); }}
                              className={`w-full text-left px-4 py-2.5 text-[12px] transition-colors ${
                                gradingAssignmentId === a.id
                                  ? "bg-accent-cyan/10 text-accent-cyan font-medium"
                                  : "text-slate-700 hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/5"
                              }`}
                            >
                              <span className="block truncate">{a.name}</span>
                              {a.deadline && (
                                <span className="text-[10px] text-slate-500 dark:text-white/30">
                                  Due: {new Date(a.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Grading Table */}
            {(() => {
              const selectedGradingCourse = gradingData.find(c => c.id === gradingCourseId);
              const selectedAssignment = selectedGradingCourse?.assignments.find(a => a.id === gradingAssignmentId);
              const submissions = selectedAssignment?.submissions ?? [];

              if (gradingData.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400 dark:text-white/30 text-[13px]">
                    No assignment data yet. Push an assignment from the Distribution tab to get started.
                  </div>
                );
              }

              if (!selectedAssignment || submissions.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400 dark:text-white/30 text-[13px]">
                    {!selectedAssignment ? "Select a course and assignment above." : "No submissions yet for this assignment."}
                  </div>
                );
              }

              const handleSave = async (sub: GradingSubmission) => {
                const raw = localScores[sub.studentId];
                const score = raw !== undefined ? Number(raw) : sub.score;
                if (score === null || isNaN(score as number) || (score as number) < 0 || (score as number) > 100) return;

                setSavingIds(prev => new Set(prev).add(sub.studentId));
                try {
                  await api.patch(`/documents/${gradingAssignmentId}/grade`, {
                    studentId: sub.studentId,
                    score: Number(score),
                  });
                  // Update local grading data
                  setGradingData(prev => prev.map(c => ({
                    ...c,
                    assignments: c.assignments.map(a => ({
                      ...a,
                      submissions: a.submissions.map(s =>
                        s.studentId === sub.studentId && a.id === gradingAssignmentId
                          ? { ...s, score: Number(score) }
                          : s
                      )
                    }))
                  })));
                  setSavedIds(prev => { const n = new Set(prev); n.add(sub.studentId); return n; });
                  setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(sub.studentId); return n; }), 2000);
                } catch {
                  alert("Failed to save grade. Please try again.");
                } finally {
                  setSavingIds(prev => { const n = new Set(prev); n.delete(sub.studentId); return n; });
                }
              };

              return (
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                        <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Student</th>
                        <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Submitted</th>
                        <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Work File</th>
                        <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Current Score</th>
                        <th className="px-6 py-4 text-[11px] font-medium tracking-widest text-slate-500 dark:text-white/40 uppercase">Grade (0–20)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map(sub => {
                        const inputVal = localScores[sub.studentId] ?? (sub.score !== null ? String(sub.score) : "");
                        const isSaving = savingIds.has(sub.studentId);
                        const isSaved = savedIds.has(sub.studentId);
                        const isDirty = localScores[sub.studentId] !== undefined && localScores[sub.studentId] !== String(sub.score ?? "");

                        return (
                          <tr key={sub.studentId} className="border-b border-black/5 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-[13px] text-slate-800 dark:text-white/90 font-medium">{sub.studentName}</span>
                                <span className="text-[11px] text-slate-500 dark:text-white/30">{sub.studentEmail}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[12px] text-slate-600 dark:text-white/50">
                                {new Date(sub.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {sub.hasFile ? (
                                <a
                                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/documents/${gradingAssignmentId}/submission/${sub.studentId}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan text-[11px] font-medium hover:bg-accent-cyan/15 transition-colors"
                                  title={sub.submissionFileName ?? "Download submission"}
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  <span className="max-w-[100px] truncate">{sub.submissionFileName ?? "View"}</span>
                                </a>
                              ) : (
                                <span className="text-[11px] italic text-slate-400 dark:text-white/20">No file</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {sub.score !== null ? (
                                <span className={`text-[14px] font-mono font-medium ${
                                  sub.score >= 16 ? "text-emerald-600 dark:text-emerald-400" :
                                  sub.score < 12 ? "text-rose-600 dark:text-rose-400" :
                                  "text-slate-700 dark:text-white/80"
                                }`}>
                                  {sub.score}/20
                                </span>
                              ) : (
                                <span className="text-[12px] italic text-slate-400 dark:text-white/20">Ungraded</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {/* Custom stepper — replaces ugly browser number arrows */}
                                <div className="flex items-center rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-white/[0.04]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = Number(inputVal || sub.score || 0);
                                      const next = Math.max(0, cur - 1);
                                      setLocalScores(prev => ({ ...prev, [sub.studentId]: String(next) }));
                                    }}
                                    className="w-7 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[14px] font-medium border-r border-black/10 dark:border-white/10"
                                  >−</button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={inputVal}
                                    onChange={e => setLocalScores(prev => ({ ...prev, [sub.studentId]: e.target.value }))}
                                    onKeyDown={e => { if (e.key === "Enter") handleSave(sub); }}
                                    placeholder="—"
                                    className="w-10 bg-transparent py-1.5 text-[13px] text-slate-900 dark:text-white text-center font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = Number(inputVal || sub.score || 0);
                                      const next = Math.min(20, cur + 1);
                                      setLocalScores(prev => ({ ...prev, [sub.studentId]: String(next) }));
                                    }}
                                    className="w-7 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-white/40 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[14px] font-medium border-l border-black/10 dark:border-white/10"
                                  >+</button>
                                </div>
                                <button
                                  onClick={() => handleSave(sub)}
                                  disabled={isSaving || inputVal === ""}
                                  className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all border ${
                                    isSaved
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-400/20"
                                      : isDirty
                                      ? "bg-accent-violet/10 text-accent-violet border-accent-violet/30 hover:bg-accent-violet/20"
                                      : "bg-black/5 dark:bg-white/5 text-slate-500 dark:text-white/40 border-black/10 dark:border-white/10 hover:bg-black/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                  }`}
                                >
                                  {isSaving ? "..." : isSaved ? "✓ Saved" : "Save"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-6 py-3 border-t border-black/5 dark:border-white/5">
                    <p className="text-[11px] text-slate-400 dark:text-white/25">
                      {submissions.filter(s => s.score !== null).length} of {submissions.length} submission{submissions.length !== 1 ? "s" : ""} graded · Press Enter or click Save to commit a score
                    </p>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </>
      )}
    </div>
  );
}
