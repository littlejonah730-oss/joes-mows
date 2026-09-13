import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useEntityCollection } from "@/hooks/useEntityCollection";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Jobs from "@/pages/Jobs";
import Invoices from "@/pages/Invoices";
import {
  LayoutDashboard, Users, ClipboardList, FileText, Calendar, StickyNote,
  Settings as SettingsIcon, Menu, X, Sun, Moon, Leaf, Zap, ArrowLeft, RefreshCw, Receipt, BarChart3, UsersRound, UserCheck, Wrench, Activity, Package, PlayCircle, ListChecks
} from "lucide-react";
import PageTransition from "@/components/PageTransition";
import NotificationBell from "@/components/NotificationBell";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/important", label: "Important", icon: ListChecks },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/jobs", label: "Jobs", icon: ClipboardList },
  { path: "/invoices", label: "Invoices", icon: FileText },
  { path: "/calendar", label: "Calendar", icon: Calendar },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/notes", label: "Notes", icon: StickyNote },
  { path: "/tools", label: "Tools", icon: Wrench },
  { path: "/employees", label: "Employees", icon: UsersRound },
  { path: "/equipment", label: "Equipment", icon: Package },
  { path: "/background", label: "Background", icon: PlayCircle },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

const BOTTOM_TABS = [
  { path: "/", label: "Home", icon: LayoutDashboard },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/jobs", label: "Jobs", icon: ClipboardList },
  { path: "/invoices", label: "Invoices", icon: FileText },
];

const TAB_PAGES = ["/", "/customers", "/jobs", "/invoices"];

function NavLink({ item, onClick }) {
  const location = useLocation();
  const Icon = item.icon;
  const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 select-none ${
        active ? "bg-primary/10 text-primary neon-text" : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${active ? "text-primary" : ""}`} />
      <span>{item.label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary neon-glow" />}
    </Link>
  );
}

function SidebarContent({ onNavigate, settings }) {
  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center neon-glow overflow-hidden shrink-0">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Leaf className="w-5 h-5 text-black" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight truncate">{settings?.business_name || "GreenPro"}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Lawn Care</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.path} item={item} onClick={onNavigate} />
        ))}
        <button
          onClick={() => { onNavigate?.(); window.dispatchEvent(new CustomEvent("lawnflow-switch-employee")); }}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 select-none text-muted-foreground hover:text-foreground hover:bg-muted w-full mt-2"
        >
          <UserCheck className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
          <span>Employee Portal</span>
        </button>
      </nav>
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Zap className="w-3 h-3 text-primary" />
          <span>Powered by {settings?.business_name || "GreenPro"}</span>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary select-none" aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

function MobileTopBar({ onMenu, settings }) {
  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 bg-background/80 glass border-b border-border select-none"
         style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center overflow-hidden shrink-0">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Leaf className="w-4 h-4 text-black" />
          )}
        </div>
        <span className="font-bold text-sm truncate">{settings?.business_name || "GreenPro"}</span>
      </div>
      <div className="flex items-center gap-1">
        <Link to="/employees" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary select-none" aria-label="Employees">
          <UsersRound className="w-5 h-5" />
        </Link>
        <NotificationBell />
        <ThemeToggle />
        <button onClick={onMenu} className="p-2 rounded-lg hover:bg-muted no-select"><Menu className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

function MobileBackHeader({ parentPath }) {
  const navigate = useNavigate();
  return (
    <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 bg-background/80 glass border-b border-border select-none"
         style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "0.75rem" }}>
      <button onClick={() => navigate(parentPath)} className="flex items-center gap-1 text-sm font-medium text-primary">
        <ArrowLeft className="w-5 h-5" /> Back
      </button>
    </div>
  );
}

function BottomTabBar({ onTabTap }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 glass border-t border-border select-none"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-center justify-around h-14">
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = location.pathname === tab.path || (tab.path !== "/" && location.pathname.startsWith(tab.path));
          return (
            <button key={tab.path} onClick={() => { onTabTap(tab.path); navigate(tab.path); }}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors select-none ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();
  const [tabResetKey, setTabResetKey] = useState({});
  const lastTabTap = useRef({});
  const { pullDistance, isRefreshing } = usePullToRefresh(async () => {
    await queryClient.invalidateQueries();
  });
  const { data: settingsList = [] } = useEntityCollection("BusinessSettings", { sort: "-created_date", limit: 1 });
  const settings = settingsList[0];

  const segments = location.pathname.split("/").filter(Boolean);
  const isChildPage = segments.length >= 2;
  const parentPath = `/${segments[0] || ""}`;
  const isTabRoute = TAB_PAGES.includes(location.pathname);

  function handleTabTap(path) {
    const now = Date.now();
    if (location.pathname === path && lastTabTap.current[path] && now - lastTabTap.current[path] < 400) {
      setTabResetKey(prev => ({ ...prev, [path]: (prev[path] || 0) + 1 }));
    }
    lastTabTap.current[path] = now;
  }

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-background">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-background sticky top-0 h-screen select-none">
          <SidebarContent settings={settings} />
        </aside>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-background border-r border-border animate-in slide-in-from-left safe-top">
              <div className="flex justify-end p-2">
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-muted no-select"><X className="w-5 h-5" /></button>
              </div>
              <SidebarContent onNavigate={() => setMobileOpen(false)} settings={settings} />
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {isChildPage ? <MobileBackHeader parentPath={parentPath} /> : <MobileTopBar onMenu={() => setMobileOpen(true)} settings={settings} />}
          <div className="hidden lg:flex items-center justify-end px-6 py-3 border-b border-border">
            <NotificationBell />
            <ThemeToggle />
          </div>
          <main className={`flex-1 p-4 lg:p-6 overflow-x-hidden ${isChildPage ? "pb-6" : "pb-24 lg:pb-6"}`}>
            {(pullDistance > 0 || isRefreshing) && (
              <div className="flex justify-center items-center pointer-events-none overflow-hidden transition-all"
                   style={{ height: isRefreshing ? 32 : Math.min(pullDistance, 32), opacity: Math.min(pullDistance / 60, 1) }}>
                <RefreshCw className={`w-5 h-5 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
              </div>
            )}
            <div style={{ display: isTabRoute ? "block" : "none" }}>
              <div style={{ display: location.pathname === "/" ? "block" : "none" }}>
                <Dashboard key={`dash-${tabResetKey["/"] || 0}`} />
              </div>
              <div style={{ display: location.pathname === "/customers" ? "block" : "none" }}>
                <Customers key={`cust-${tabResetKey["/customers"] || 0}`} />
              </div>
              <div style={{ display: location.pathname === "/jobs" ? "block" : "none" }}>
                <Jobs key={`jobs-${tabResetKey["/jobs"] || 0}`} />
              </div>
              <div style={{ display: location.pathname === "/invoices" ? "block" : "none" }}>
                <Invoices key={`inv-${tabResetKey["/invoices"] || 0}`} />
              </div>
            </div>
            {!isTabRoute && (
              <PageTransition pageKey={location.pathname}>
                <Outlet />
              </PageTransition>
            )}
          </main>
          {!isChildPage && <BottomTabBar onTabTap={handleTabTap} />}
        </div>
      </div>
    </ThemeProvider>
  );
}