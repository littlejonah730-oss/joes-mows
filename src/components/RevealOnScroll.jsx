import { useEffect, useRef, useState } from "react";

// Mounts its children only once they scroll into view, so any mount-time
// animation (e.g. recharts drawing) fires when the user reaches it — not on
// initial page load. Before reveal, a subtle skeleton reserves the space.
export default function RevealOnScroll({ children, placeholderHeight = 320, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {visible ? (
        children
      ) : (
        <div
          className="rounded-2xl border border-border bg-card flex items-center justify-center"
          style={{ minHeight: placeholderHeight }}
        >
          <div className="w-full max-w-[80%] space-y-3 px-6">
            <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
            <div className="h-2 w-2/3 rounded bg-muted/60 animate-pulse" />
            <div className="h-2 w-1/2 rounded bg-muted/60 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}