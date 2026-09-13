import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Heart } from "lucide-react";

export default function KudosPopup({ kudos, onClose }) {
  useEffect(() => {
    const duration = 2500;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#22c55e", "#fbbf24", "#3b82f6", "#ec4899"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#22c55e", "#fbbf24", "#3b82f6", "#ec4899"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();

    // Big burst
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, colors: ["#22c55e", "#fbbf24", "#3b82f6", "#ec4899"] });
    }, 200);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative bg-card rounded-3xl p-8 max-w-sm w-full text-center neon-border animate-in zoom-in-95 duration-500" onClick={(e) => e.stopPropagation()}>
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center neon-border">
            <Heart className="w-8 h-8 text-black" fill="currentColor" />
          </div>
        </div>
        <div className="pt-6">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">🎉 You've Got Kudos!</p>
          <h2 className="text-2xl font-bold mb-1">{kudos?.title || "Great Work!"}</h2>
          <p className="text-xs text-muted-foreground mb-4">A note from {kudos?.from || "Joe's Mows"}</p>
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 mb-6">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{kudos?.message}</p>
          </div>
          <button onClick={onClose} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
            Thank You! 🙏
          </button>
        </div>
      </div>
    </div>
  );
}