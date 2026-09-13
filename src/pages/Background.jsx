import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import { base44 } from "@/api/base44Client";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Pause, ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";
import ClockSlide from "@/components/background/ClockSlide";
import JobsSlide from "@/components/background/JobsSlide";
import WeekSlide from "@/components/background/WeekSlide";
import MoneySlide from "@/components/background/MoneySlide";
import ClientsSlide from "@/components/background/ClientsSlide";
import StatsSlide from "@/components/background/StatsSlide";
import BulletinSlide from "@/components/background/BulletinSlide";
import TodayHud from "@/components/background/TodayHud";

const SLIDE_MS = 14000;

export default function Background() {
  const { data: jobs = [] } = useEntityCollection("Job", { sort: "scheduled_date" });
  const { data: customers = [] } = useEntityCollection("Customer");
  const { data: invoices = [] } = useEntityCollection("Invoice");
  const { data: expenses = [] } = useEntityCollection("Expense");
  const { data: announcements = [] } = useEntityCollection("Announcement");
  const { data: settingsList = [] } = useEntityCollection("BusinessSettings", { sort: "-created_date", limit: 1 });
  const settings = settingsList[0];
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubs = [];
    ["Job", "Invoice", "Customer", "Expense", "Announcement"].forEach((name) => {
      try {
        const u = base44.entities[name].subscribe(() => queryClient.invalidateQueries({ queryKey: [name] }));
        if (u) unsubs.push(u);
      } catch (e) { /* entity may not support subscribe */ }
    });
    return () => unsubs.forEach((u) => u && u());
  }, [queryClient]);

  const slides = [
    { key: "clock", render: () => <ClockSlide settings={settings} jobs={jobs} /> },
    { key: "today", render: () => <JobsSlide variant="today" jobs={jobs} /> },
    { key: "tomorrow", render: () => <JobsSlide variant="tomorrow" jobs={jobs} /> },
    { key: "upcoming", render: () => <JobsSlide variant="upcoming" jobs={jobs} /> },
    { key: "week", render: () => <WeekSlide jobs={jobs} /> },
    { key: "money", render: () => <MoneySlide invoices={invoices} expenses={expenses} /> },
    { key: "clients", render: () => <ClientsSlide customers={customers} jobs={jobs} /> },
    { key: "stats", render: () => <StatsSlide invoices={invoices} expenses={expenses} jobs={jobs} customers={customers} /> },
    { key: "bulletin", render: () => <BulletinSlide announcements={announcements} jobs={jobs} invoices={invoices} settings={settings} /> },
  ];

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const containerRef = useRef(null);

  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [playing, slides.length]);

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen?.();
  };

  const variants = {
    enter: { opacity: 0, scale: 1.06 },
    center: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  };

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-5rem)] min-h-[480px] bg-background overflow-hidden rounded-2xl border border-border select-none">
      {/* animated backdrop — moving neon blobs behind every slide */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" animate={{ x: [0, -50, 0], y: [0, 30, 0], scale: [1, 1.3, 1] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-primary/5 blur-3xl" animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={slides[index].key} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.8, ease: "easeInOut" }} className="absolute inset-0 z-10">
          {slides[index].render()}
        </motion.div>
      </AnimatePresence>

      {/* progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-border/40 z-30">
        <motion.div key={`${index}-${playing}`} initial={{ width: "0%" }} animate={{ width: playing ? "100%" : "0%" }} transition={{ duration: playing ? SLIDE_MS / 1000 : 0, ease: "linear" }} className="h-full bg-primary" />
      </div>

      {/* slide label */}
      <div className="absolute top-3 left-4 z-30 text-xs font-medium text-muted-foreground uppercase tracking-widest">{slides[index].key}</div>

      {/* controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-full border border-border bg-card/80 glass px-2 py-1.5 shadow-lg">
        <button onClick={prev} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => setPlaying((p) => !p)} className="p-2 rounded-full hover:bg-muted text-primary transition-colors">{playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>
        <button onClick={next} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><ChevronRight className="w-5 h-5" /></button>
        <div className="w-px h-5 bg-border mx-1" />
        <button onClick={toggleFs} className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-primary transition-colors">{isFs ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}</button>
      </div>

      {/* dots */}
      <div className="absolute bottom-5 right-4 z-30 hidden sm:flex gap-1.5">
        {slides.map((s, i) => (
          <button key={s.key} onClick={() => setIndex(i)} className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"}`} />
        ))}
      </div>

      {/* persistent clock + today dashboard */}
      <TodayHud jobs={jobs} />
    </div>
  );
}