"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import LiveFeed from "./LiveFeed";
import { ArrowRight, Database, MessageSquare, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const chartData = [
  { day: '1', rev: 120 }, { day: '2', rev: 180 }, { day: '3', rev: 250 },
  { day: '4', rev: 210 }, { day: '5', rev: 380 }, { day: '6', rev: 490 }, { day: '7', rev: 600 }
];

// Card wrapper with IntersectionObserver stagger logic
const BentoCard = ({ children, className, delayOrder = 0 }: { children: React.ReactNode, className?: string, delayOrder?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      initial={{ clipPath: "inset(100% 0 0 0)", opacity: 0 }}
      animate={isInView ? { clipPath: "inset(0% 0 0 0)", opacity: 1 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: delayOrder * 0.12 }}
      className={cn("glass-card p-6 overflow-hidden flex flex-col", className)}
    >
      {children}
    </motion.div>
  );
};

const StatCard = ({ label, targetValue, suffix = "" }: { label: string, targetValue: number, suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const springValue = useSpring(0, { stiffness: 40, damping: 20 });
  const displayValue = useTransform(springValue, (current) => Math.round(current) + suffix);

  useEffect(() => {
    if (isInView) {
      springValue.set(targetValue);
    }
  }, [isInView, springValue, targetValue]);

  return (
    <div ref={ref} className="h-full flex flex-col justify-center relative z-10 w-full group">
      <div className="absolute inset-0 bg-accent-cyan/10 blur-3xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
      <span className="text-slate-500 dark:text-white/50 text-sm font-medium tracking-wide uppercase mb-2">{label}</span>
      <motion.span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-accent-cyan to-accent-violet bg-clip-text text-transparent inline-block">
        {displayValue}
      </motion.span>
    </div>
  );
};

const MagneticButton = () => {
    const ref = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouse = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);
        
        // 60px bound scaling ~0.2 coeff
        setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
    };

    const reset = () => setPosition({ x: 0, y: 0 });

    return (
        <motion.button
            ref={ref}
            onMouseMove={handleMouse}
            onMouseLeave={reset}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            className="px-8 py-4 bg-white text-black font-semibold rounded-full flex items-center gap-2 hover:bg-white/90 transition-colors"
        >
            Request Access
            <ArrowRight className="w-4 h-4" />
        </motion.button>
    )
}

export default function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-5xl mx-auto w-full z-10 relative px-4">
      
      {/* 1. LiveFeed (2 spans approx vs 1 wide column on mobile) */}
      <BentoCard className="md:col-span-2 h-[320px] md:h-[400px]" delayOrder={0}>
        <LiveFeed />
      </BentoCard>

      {/* 2. NLtoSQL Chart */}
      <BentoCard className="md:col-span-2 h-[280px]" delayOrder={1}>
        <div className="mb-4">
            <h3 className="font-semibold tracking-wide text-slate-800 dark:text-white">Revenue Predictor</h3>
            <p className="text-slate-500 dark:text-white/50 text-sm">Real-time NL-to-SQL evaluation</p>
        </div>
        <div className="flex-1 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
                <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                </linearGradient>
                </defs>
                <Tooltip 
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rev" 
                  stroke="#00f2ff" 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  animationDuration={1500} 
                  animationEasing="ease-in-out"
                />
            </AreaChart>
            </ResponsiveContainer>
        </div>
      </BentoCard>

      {/* 3 & 4. Stat Cards */}
      <BentoCard className="h-[200px]" delayOrder={2}>
        <StatCard label="Platform Uptime" targetValue={4} suffix=" 9s" />
      </BentoCard>
      
      <BentoCard className="h-[200px]" delayOrder={3}>
        <StatCard label="Avg Query Latency" targetValue={23} suffix="ms" />
      </BentoCard>

      {/* 5. Architecture Pill */}
      <BentoCard className="md:col-span-2 py-8 flex flex-col justify-center" delayOrder={4}>
        <div className="text-center mb-8">
            <h3 className="font-medium text-slate-800 dark:text-white">Information Architecture</h3>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between w-full relative px-4 md:px-12">
            {/* Connection Line */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black/10 dark:bg-white/10 -translate-y-1/2 hidden md:block">
                <motion.div 
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="w-full h-full bg-gradient-to-r from-accent-cyan to-accent-violet origin-left"
                />
            </div>
            
            {[
                { icon: MessageSquare, label: "NL Query" },
                { icon: Activity, label: "LangChain" },
                { icon: Database, label: "SQL Engine" },
                { icon: ArrowRight, label: "Chart Render" }
            ].map((step, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center gap-3 my-4 md:my-0 bg-white dark:bg-[#050505] p-2 rounded-xl border border-black/5 dark:border-white/5">
                    <div className="w-12 h-12 rounded-full border border-black/10 dark:border-white/20 flex items-center justify-center bg-black/5 dark:bg-black/50">
                        <step.icon className="w-5 h-5 text-accent-cyan" />
                    </div>
                    <span className="text-xs font-mono text-slate-500 dark:text-white/60">{step.label}</span>
                </div>
            ))}
        </div>
      </BentoCard>

      {/* 6. CTA Card */}
      <BentoCard className="md:col-span-2 h-[200px] flex items-center justify-center bg-gradient-to-br from-slate-100 dark:from-black to-slate-50 dark:to-white/[0.02]" delayOrder={5}>
        <div className="flex flex-col items-center hover:cursor-none">
            <h2 className="text-2xl font-semibold mb-6 text-slate-800 dark:text-white">Ready to see your data differently?</h2>
            <MagneticButton />
        </div>
      </BentoCard>

    </div>
  );
}
