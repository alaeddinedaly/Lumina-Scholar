"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, CornerDownRight, Database, FileText } from "lucide-react";

export default function SchemaPage() {
  const router = useRouter();

  const tables = [
    {
      name: "sales_data.csv",
      rowCount: 1240,
      columns: [
        { name: "date", type: "date" },
        { name: "product", type: "text" },
        { name: "category", type: "text" },
        { name: "revenue", type: "number" },
        { name: "units_sold", type: "number" },
        { name: "region", type: "text" }
      ]
    },
    {
      name: "customers.csv",
      rowCount: 850,
      columns: [
        { name: "customer_id", type: "text" },
        { name: "age_group", type: "text" },
        { name: "location", type: "text" },
        { name: "loyalty_score", type: "number" }
      ]
    }
  ];

  const totalRows = tables.reduce((acc, tab) => acc + tab.rowCount, 0);

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'text': return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case 'number': return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case 'date': return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      default: return "text-white/40 bg-white/5 border-white/10";
    }
  };

  const getTypeIconLabel = (type: string) => {
    switch(type) {
      case 'text': return "ABC";
      case 'number': return "123";
      case 'date': return "Date";
      default: return "Any";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[640px] p-[2px] rounded-[16px] relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none rounded-[16px] z-0 isolate opacity-[0.15]">
         <motion.div 
           className="absolute w-[200%] h-[200%] top-[-50%] left-[-50%]"
           style={{
             background: "conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(255, 255, 255, 0.05) 40%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0.05) 60%, transparent 100%)",
           }}
           animate={{ rotate: 360 }}
           transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
         />
      </div>

      <div className="glass-card relative z-10 flex flex-col shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden max-h-[80vh]"
           style={{ background: "rgba(10, 10, 10, 0.65)" }}>
        
        {/* Header */}
        <div className="p-8 pb-6 border-b border-white/5 flex items-start justify-between shrink-0">
          <div className="flex flex-col gap-2">
            <h1 className="text-[20px] font-semibold tracking-tight text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent-cyan" />
              Analysis Complete
            </h1>
            <p className="text-[14px] text-white/40 font-light max-w-[340px]">
              Lumina successfully mapped your datasets. Please verify the inferred semantic types below.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[24px] font-mono tracking-tighter text-white/90 leading-none">{totalRows.toLocaleString()}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Total Rows</span>
          </div>
        </div>

        {/* Schema Tables Scrollable Area */}
        <div className="p-4 md:p-8 flex flex-col gap-8 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          
          {tables.map((table, tIdx) => (
            <div key={table.name} className="flex flex-col gap-3">
              {/* Table Title Banner */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white/50" />
                  <h2 className="text-[14px] font-medium text-white/80 tracking-wide">{table.name}</h2>
                </div>
                <span className="text-[11px] font-mono text-white/40">{table.rowCount.toLocaleString()} rows</span>
              </div>

              {/* Columns Header */}
              <div className="grid grid-cols-[1fr_2fr] px-4 py-2 border-b border-white/5">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Format</span>
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">Column Name</span>
              </div>

              <div className="flex flex-col gap-2">
                {table.columns.map((col, idx) => (
                  <motion.div 
                    key={col.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (tIdx * 0.1) + (idx * 0.05) + 0.2 }}
                    className="grid grid-cols-[1fr_2fr] px-4 py-3 rounded-lg border border-white/5 bg-white/[0.015] hover:bg-white/[0.03] transition-colors items-center group"
                  >
                    <div className="flex items-center">
                      <div className={`px-2 py-1 rounded-[4px] border border-solid text-[10px] font-mono tracking-wider font-medium flex items-center gap-1.5 ${getTypeColor(col.type)}`}>
                        <span className="opacity-60">{getTypeIconLabel(col.type)}</span>
                        <span className="opacity-100 mix-blend-plus-lighter">{col.type}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CornerDownRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
                      <span className="text-[13px] text-white/80 font-medium tracking-wide">
                        {col.name}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}

        </div>

        {/* Footer actions */}
        <div className="p-6 md:px-8 border-t border-white/5 bg-white/[0.01] shrink-0">
          <button
            onClick={() => router.push("/query")}
            className="group relative w-full px-5 py-[14px] text-[13px] font-medium tracking-[0.05em] 
                       rounded-[6px] transition-all duration-300 flex items-center justify-center gap-2
                       bg-white text-black hover:bg-[#e0e0e0] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
          >
            Start Querying
            <ArrowRight className="w-4 h-4 opacity-100 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </motion.div>
  );
}
