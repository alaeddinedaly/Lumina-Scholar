"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, BarChart2, TrendingUp, PieChart, Info, Plus, UploadCloud, X, FileType, CheckCircle2 } from "lucide-react";
import ReactECharts from "echarts-for-react";

type ChartType = "bar" | "line" | "pie" | "area";

export default function QueryPage() {
  const [prompt, setPrompt] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [chartType, setChartType] = useState<ChartType>("bar");
  
  // New Dataset Upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chips = [
    "Show monthly revenue by category",
    "Top 5 products by units sold",
    "Revenue breakdown by region"
  ];

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    setIsBuilding(true);
    
    // Simulate generation time
    setTimeout(() => {
      setIsBuilding(false);
      setHasResult(true);
    }, 2000);
  };

  // ECharts Logic
  const getChartOption = (type: ChartType) => {
    // Note: To use graphic gradients we need the global echarts object 
    // It's dynamically used if available, or we can use the declarative notation
    const categories = ['Jan', 'Feb', 'Mar', 'Apr'];
    const seriesDataElectronics = [120, 132, 380, 134];
    const seriesDataClothing = [220, 182, 191, 234];
    const seriesDataHome = [150, 232, 201, 154];

    // Ultra-premium glowing neon styling
    const commonConfig = {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'Geist', color: 'rgba(255,255,255,0.4)' },
      tooltip: {
        trigger: type === 'pie' ? 'item' : 'axis',
        backgroundColor: 'rgba(10,10,10,0.85)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#fff' },
        backdropFilter: 'blur(10px)',
        padding: 16,
        borderRadius: 12,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowBlur: 20
      },
      legend: { 
        textStyle: { color: 'rgba(255,255,255,0.6)' }, 
        bottom: 0,
        icon: 'circle'
      },
      // Using hex codes for the base glows
      color: ['#00f2ff', '#7000ff', '#10b981'],
    };

    if (type === 'pie') {
      return {
        ...commonConfig,
        series: [
          {
            name: 'Total Revenue',
            type: 'pie',
            radius: ['50%', '75%'], // Thinner, more elegant donut
            center: ['50%', '45%'],
            avoidLabelOverlap: false,
            itemStyle: { 
              borderRadius: 20, 
              borderColor: '#050505', 
              borderWidth: 4,
            },
            label: { show: false },
            data: [
              { value: 766, name: 'Electronics', itemStyle: { shadowBlur: 15, shadowColor: 'rgba(0, 242, 255, 0.5)' } },
              { value: 827, name: 'Clothing', itemStyle: { shadowBlur: 15, shadowColor: 'rgba(112, 0, 255, 0.5)' } },
              { value: 737, name: 'Home', itemStyle: { shadowBlur: 15, shadowColor: 'rgba(16, 185, 129, 0.5)' } }
            ]
          }
        ]
      };
    }

    return {
      ...commonConfig,
      grid: { top: 40, right: 20, bottom: 60, left: 40 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: 'rgba(255,255,255,0.5)', margin: 16 },
        axisTick: { show: false },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: 'rgba(255,255,255,0.5)' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } }
      },
      series: [
        {
          name: 'Electronics',
          type: type === 'area' ? 'line' : type,
          data: seriesDataElectronics,
          smooth: type !== 'bar',
          symbolSize: 8,
          areaStyle: type === 'area' ? {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(0,242,255,0.4)' }, { offset: 1, color: 'rgba(0,242,255,0.01)' }]
            }
          } : undefined,
          lineStyle: { width: 3, shadowBlur: 10, shadowColor: 'rgba(0,242,255,0.5)' },
          itemStyle: type === 'bar' ? { 
            borderRadius: [6,6,0,0],
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: '#00f2ff' }, { offset: 1, color: 'rgba(0,242,255,0.1)' }]
            }
          } : undefined,
        },
        {
          name: 'Clothing',
          type: type === 'area' ? 'line' : type,
          data: seriesDataClothing,
          smooth: type !== 'bar',
          symbolSize: 8,
          areaStyle: type === 'area' ? {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(112,0,255,0.4)' }, { offset: 1, color: 'rgba(112,0,255,0.01)' }]
            }
          } : undefined,
          lineStyle: { width: 3, shadowBlur: 10, shadowColor: 'rgba(112,0,255,0.5)' },
          itemStyle: type === 'bar' ? { 
            borderRadius: [6,6,0,0],
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: '#7000ff' }, { offset: 1, color: 'rgba(112,0,255,0.1)' }]
            }
          } : undefined,
        },
        {
          name: 'Home',
          type: type === 'area' ? 'line' : type,
          data: seriesDataHome,
          smooth: type !== 'bar',
          symbolSize: 8,
          areaStyle: type === 'area' ? {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.4)' }, { offset: 1, color: 'rgba(16,185,129,0.01)' }]
            }
          } : undefined,
          lineStyle: { width: 3, shadowBlur: 10, shadowColor: 'rgba(16,185,129,0.5)' },
          itemStyle: type === 'bar' ? { 
            borderRadius: [6,6,0,0],
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: 'rgba(16,185,129,0.1)' }]
            }
          } : undefined,
        }
      ]
    };
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-6 max-w-[1280px]">
      
      {/* ── LEFT PANEL: Input (40%) ── */}
      <div className="w-full md:w-[40%] flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card flex flex-col shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden"
          style={{ background: "rgba(10, 10, 10, 0.65)" }}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent-violet" />
              </div>
              <h2 className="text-[15px] font-semibold tracking-tight text-white">Ask Lumina AI</h2>
            </div>
            
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/50 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
            >
              <Plus className="w-3 h-3" />
              Attach Dataset
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-5">
            <div className="relative">
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask your data a question... e.g. Show me revenue by region"
                className="w-full h-[180px] rounded-[8px] bg-white/[0.02] border border-white/10 p-4 text-[14px] text-white placeholder-white/30 
                           focus:border-white/30 focus:bg-white/[0.04] focus:outline-none focus:ring-4 focus:ring-white/[0.02] 
                           transition-all resize-none"
              />
            </div>

            {/* Chips */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium mb-1">Suggested Queries</span>
              <div className="flex flex-wrap gap-2">
                {chips.map(chip => (
                  <button 
                    key={chip}
                    onClick={() => setPrompt(chip)}
                    className="text-left text-[11px] px-3 py-2 rounded-[6px] border border-white/10 bg-white/5 text-white/60 
                               hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Sub */}
          <div className="p-6 border-t border-white/5 bg-white/[0.01]">
             <button
              onClick={handleSubmit}
              disabled={isBuilding || !prompt.trim()}
              className="group relative w-full px-5 py-[14px] text-[13px] font-medium tracking-[0.05em] 
                         rounded-[6px] transition-all duration-300 flex items-center justify-center gap-2
                         bg-white text-black hover:bg-[#e0e0e0] shadow-[0_0_20px_rgba(255,255,255,0.2)] 
                         disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
            >
              Generate Insights
              <ArrowRight className="w-4 h-4 opacity-100 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL: Output (60%) ── */}
      <div className="w-full md:w-[60%] flex flex-col hidden md:flex h-[600px]">
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.4, delay: 0.1 }}
           className="glass-card flex-1 relative flex flex-col overflow-hidden"
           style={{ background: "rgba(10, 10, 10, 0.65)" }}
        >
           <AnimatePresence mode="wait">
             {!hasResult && (
               <motion.div 
                 key="empty"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center pointer-events-none"
               >
                 <div className="w-16 h-16 rounded-full border border-white/5 bg-white/[0.02] flex items-center justify-center mb-2">
                   <BarChart2 className="w-6 h-6 text-white/20" />
                 </div>
                 <p className="text-[14px] font-medium text-white/40">Your chart will appear here</p>
                 <p className="text-[12px] font-light text-white/20 max-w-[280px]">
                   Ask a question about your data schema to generate an interactive visualization.
                 </p>
               </motion.div>
             )}

             {hasResult && (
               <motion.div 
                 key="chart"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ duration: 0.6 }}
                 className="absolute inset-0 flex flex-col p-6 gap-6"
               >
                 {/* AI Summary Banner */}
                 <div className="w-full rounded-[8px] bg-accent-cyan/10 border border-accent-cyan/20 p-4 flex gap-4 items-start">
                   <Info className="w-5 h-5 text-accent-cyan mt-0.5 shrink-0" />
                   <p className="text-[13px] text-white/80 leading-relaxed">
                     <strong className="text-white">Analysis:</strong> Revenue peaked dramatically in <span className="text-accent-cyan">March</span> driven primarily by the Electronics category, which accounted for <span className="text-accent-cyan">38%</span> of total sales across the 4-month period.
                   </p>
                 </div>

                 {/* Chart Body */}
                 <div className="flex-1 w-full min-h-0 relative">
                   <ReactECharts 
                      option={getChartOption(chartType)} 
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'svg' }}
                      notMerge={true}
                   />
                 </div>

                 {/* Chart Toggles */}
                 <div className="flex justify-center border-t border-white/5 pt-5">
                   <div className="flex p-1 gap-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                     {[
                       { id: 'bar', label: 'Bar', icon: BarChart2 },
                       { id: 'line', label: 'Line', icon: TrendingUp },
                       { id: 'area', label: 'Area', icon: TrendingUp },
                       { id: 'pie', label: 'Pie', icon: PieChart },
                     ].map(t => (
                       <button
                         key={t.id}
                         onClick={() => setChartType(t.id as ChartType)}
                         className={`
                           flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium transition-all
                           ${chartType === t.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
                         `}
                       >
                         <t.icon className="w-3.5 h-3.5" />
                         {t.label}
                       </button>
                     ))}
                   </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Building Chart Modal Overlay ── */}
      <AnimatePresence>
        {isBuilding && (
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
                <Loader2 className="w-8 h-8 text-accent-violet animate-spin absolute z-10" />
                <div className="absolute inset-0 rounded-full border border-accent-violet/30 animate-ping opacity-20" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-2 rounded-full border border-accent-violet/20 animate-ping opacity-40" style={{ animationDuration: '1.5s' }} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[16px] font-medium text-white">Generating SQL...</h3>
                <p className="text-[12px] text-white/40 leading-relaxed font-light">
                  Lumina is structuring your prompt and building the visual representation.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Dataset Modal Overlay ── */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center backdrop-blur-md p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="glass-card w-full max-w-[500px] flex flex-col overflow-hidden relative"
              style={{ background: "rgba(10, 10, 10, 0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {/* Close Button */}
              <button 
                onClick={() => { setIsUploadModalOpen(false); setFile(null); }}
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 md:p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <h3 className="text-[18px] font-semibold text-white">Attach Additional Data</h3>
                  <p className="text-[13px] text-white/40 font-light">
                    Upload another CSV or XLSX to run join queries across datasets.
                  </p>
                </div>

                <div 
                  className={`
                    relative w-full h-[180px] rounded-xl border flex flex-col items-center justify-center gap-3 transition-all duration-300
                    ${isDragging ? "border-accent-cyan bg-accent-cyan/5" : "border-white/10 border-dashed bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"}
                    ${file ? "border-solid border-green-500/30 bg-green-500/5" : ""}
                  `}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) setFile(e.dataTransfer.files[0]);
                  }}
                >
                  <input 
                    type="file" 
                    accept=".csv, .xlsx" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
                    onChange={(e) => { if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]); }}
                    ref={fileInputRef}
                    disabled={!!file}
                  />

                  {!file ? (
                    <div className="flex flex-col items-center pointer-events-none text-center">
                      <UploadCloud className="w-8 h-8 text-white/20 mb-3" />
                      <p className="text-[14px] font-medium text-white/80">Drag & drop another file</p>
                      <p className="text-[12px] text-white/40 mt-1">or click here to browse</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center pointer-events-none w-full px-6 text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-400 mb-3" />
                      <div className="text-[13px] text-white font-medium truncate max-w-[200px]">{file.name}</div>
                      <button 
                        onClick={(e) => { e.preventDefault(); setFile(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
                        className="mt-2 text-[11px] text-white/40 hover:text-white/80 underline pointer-events-auto"
                      >
                        Change file
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end mt-2">
                  <button
                    onClick={() => { setIsUploadModalOpen(false); setFile(null); }}
                    className="px-4 py-2 rounded-md text-[12px] font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!file}
                    onClick={() => { setIsUploadModalOpen(false); setFile(null); }}
                    className={`
                      px-6 py-2 rounded-md text-[12px] font-medium transition-all shadow-lg
                      ${file 
                        ? "bg-accent-cyan text-[#050505] hover:bg-accent-cyan/90 shadow-accent-cyan/20" 
                        : "bg-white/5 text-white/30 cursor-not-allowed"}
                    `}
                  >
                    Process & Attach
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
