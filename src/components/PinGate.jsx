import { useState, useEffect } from "react";
import { Lock, Users, ChevronLeft, Shield, KeyRound, CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import EmployeePortal from "@/pages/EmployeePortal";
import SpectatorCalendar from "@/components/SpectatorCalendar";

const APP_PIN = "0769";
const VIEWER_CODE = "0781"; // one universal Schedule Viewer code for anyone
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function PinGate({ children }) {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState(() => {
    if (sessionStorage.getItem("direct_employee") === "true") {
      sessionStorage.removeItem("direct_employee");
      return "employee";
    }
    return "landing";
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [adminFromEmployee, setAdminFromEmployee] = useState(false);
  const [spectatorCode, setSpectatorCode] = useState("");

  useEffect(() => {
    function handleSwitch() { setPin(""); setError(false); setView("employee"); }
    window.addEventListener("lawnflow-switch-employee", handleSwitch);
    return () => window.removeEventListener("lawnflow-switch-employee", handleSwitch);
  }, []);

  // Let auth routes through without the landing page
  if (typeof window !== "undefined" && AUTH_ROUTES.includes(window.location.pathname)) {
    return children;
  }

  if (view === "app") {
    return children;
  }

  if (view === "employee") {
    return (
      <EmployeePortal
        onBack={() => { setPin(""); setError(false); setView("landing"); }}
        onSwitchToAdmin={() => { setPin(""); setError(false); setAdminFromEmployee(true); setView("admin"); }}
      />
    );
  }

  if (view === "employee_pin") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 safe-top-bottom">
        <div className="w-full max-w-xs">
          <button onClick={() => { setPin(""); setError(false); setView("landing"); }} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 neon-border">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Employee PIN</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your PIN</p>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (pin !== localStorage.getItem("lawnflow_my_pin")) { setError(true); setPin(""); return; }
            try {
              const sessions = JSON.parse(localStorage.getItem("lawnflow_pin_sessions") || "{}");
              const stored = sessions[pin];
              if (stored) await supabase.auth.setSession(stored);
            } catch (err) { console.error("Could not restore PIN session:", err); }
            setView("employee");
          }} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(false); }}
              placeholder="••••"
              maxLength={4}
              className={`w-full text-center text-2xl tracking-[0.5em] font-bold h-14 rounded-xl border bg-card px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all ${error ? "border-destructive ring-2 ring-destructive/20" : "border-border"}`}
            />
            {error && <p className="text-center text-xs text-destructive">Incorrect PIN, try again</p>}
            <button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors touch-target">
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "admin") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 safe-top-bottom">
        <div className="w-full max-w-xs">
          <button onClick={() => { setPin(""); setError(false); setView(adminFromEmployee ? "employee" : "landing"); }} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 neon-border">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Admin Access</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter PIN to continue</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (pin === APP_PIN) { setView("app"); } else { setError(true); setPin(""); } }} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(false); }}
              placeholder="••••"
              maxLength={4}
              className={`w-full text-center text-2xl tracking-[0.5em] font-bold h-14 rounded-xl border bg-card px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all ${error ? "border-destructive ring-2 ring-destructive/20" : "border-border"}`}
            />
            {error && <p className="text-center text-xs text-destructive">Incorrect PIN, try again</p>}
            <button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors touch-target">
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "spectator") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 safe-top-bottom">
        <div className="w-full max-w-xs">
          <button onClick={() => { setSpectatorCode(""); setError(false); setView("landing"); }} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 neon-border">
              <CalendarDays className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Schedule Viewer</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your access code</p>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (spectatorCode === VIEWER_CODE) { setError(false); setView("spectator_calendar"); }
            else { setError(true); setSpectatorCode(""); }
          }} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={spectatorCode}
              onChange={(e) => { setSpectatorCode(e.target.value); setError(false); }}
              placeholder="••••"
              maxLength={6}
              className={`w-full text-center text-2xl tracking-[0.5em] font-bold h-14 rounded-xl border bg-card px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all ${error ? "border-destructive ring-2 ring-destructive/20" : "border-border"}`}
            />
            {error && <p className="text-center text-xs text-destructive">Invalid code, try again</p>}
            <button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors touch-target">
              View Schedule
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "spectator_calendar") {
    return <SpectatorCalendar onBack={() => { setSpectatorCode(""); setError(false); setView("landing"); }} />;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 safe-top-bottom">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 neon-border">
            <span className="text-2xl">🌿</span>
          </div>
          <h1 className="text-xl font-bold">LawnFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">Select an option</p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                window.location.href = "/login";
                return;
              }
              if (localStorage.getItem("lawnflow_my_pin")) {
                setPin(""); setError(false); setView("employee_pin");
              } else {
                setView("employee");
              }
            }}
            className="w-full p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:neon-glow transition-all flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold">Employee Portal</p>
              <p className="text-xs text-muted-foreground">View jobs & mark availability</p>
            </div>
          </button>
          <button
            onClick={() => { setPin(""); setError(false); setAdminFromEmployee(false); setView("admin"); }}
            className="w-full p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold">Admin Access</p>
              <p className="text-xs text-muted-foreground">Requires PIN</p>
            </div>
          </button>
          <button
            onClick={() => { setSpectatorCode(""); setError(false); setView("spectator"); }}
            className="w-full p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold">Schedule Viewer</p>
              <p className="text-xs text-muted-foreground">View the calendar</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}