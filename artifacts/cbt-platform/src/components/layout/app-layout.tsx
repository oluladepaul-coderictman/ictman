import * as React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Building2, Users, GraduationCap, FileCheck2, LogOut,
  Menu, X, UserCheck, BookOpen, TableProperties, ScrollText, Activity,
  Sparkles, Settings, BarChart2, Database, Calendar, Award, Upload,
  Bell, User, TrendingUp, ChevronDown, ChevronRight, Brain, Wifi, WifiOff,
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { OfflineBanner } from "@/components/offline-banner";
import { getPendingResults } from "@/lib/offline-exam";
import { getQueue } from "@/lib/offline-queue";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  badge?: number;
  children?: NavItem[];
}

const getNavigation = (role: string): NavItem[] => {
  switch (role) {
    case "SuperAdmin":
      return [
        { name: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
        { name: "Companies", href: "/super-admin/companies", icon: Building2 },
        { name: "Platform Analytics", href: "/super-admin/analytics", icon: BarChart2 },
        { name: "Paulina AI", href: "/super-admin/paulina", icon: Brain },
        { name: "Notifications", href: "/notifications", icon: Bell },
        { name: "My Profile", href: "/profile", icon: User },
      ];
    case "CompanyAdmin":
      return [
        { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { name: "Exams", href: "/admin/exams", icon: GraduationCap },
        { name: "Scheduler", href: "/admin/scheduler", icon: Calendar },
        { name: "Question Bank", href: "/admin/question-bank", icon: Database },
        { name: "Departments", href: "/admin/departments", icon: Building2 },
        { name: "Courses", href: "/admin/courses", icon: BookOpen },
        { name: "Users / Staff", href: "/admin/users", icon: Users },
        { name: "Candidates", href: "/admin/candidates", icon: UserCheck },
        { name: "Bulk Import", href: "/admin/import", icon: Upload },
        { name: "Results", href: "/admin/results", icon: FileCheck2 },
        { name: "Broadsheet", href: "/admin/broadsheet", icon: TableProperties },
        { name: "Certificates", href: "/admin/certificates", icon: Award },
        { name: "Analytics", href: "/admin/analytics", icon: BarChart2 },
        { name: "Live Monitor", href: "/admin/monitor", icon: Activity },
        { name: "Settings", href: "/admin/settings", icon: Settings },
        { name: "Paulina AI", href: "/admin/paulina", icon: Brain },
        { name: "Notifications", href: "/notifications", icon: Bell },
        { name: "My Profile", href: "/profile", icon: User },
      ];
    case "Staff":
      return [
        { name: "My Exams", href: "/exams", icon: GraduationCap },
        { name: "My Results", href: "/my-results", icon: FileCheck2 },
        { name: "Performance", href: "/performance", icon: TrendingUp },
        { name: "Paulina AI", href: "/staff/paulina", icon: Brain },
        { name: "Notifications", href: "/notifications", icon: Bell },
        { name: "My Profile", href: "/profile", icon: User },
      ];
    case "Candidate":
      return [
        { name: "My Exams", href: "/candidate-exams", icon: GraduationCap },
        { name: "My Results", href: "/candidate-results", icon: ScrollText },
        { name: "My Profile", href: "/profile", icon: User },
      ];
    default:
      return [];
  }
};

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const [location] = useLocation();
  const [open, setOpen] = React.useState(false);
  const isActive = location === item.href || location.startsWith(item.href + "/");
  const hasChildren = !!item.children?.length;

  if (hasChildren) {
    return (
      <div>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          onClick={() => setOpen(o => !o)}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left text-sm">{item.name}</span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {open && <div className="ml-4 mt-1 space-y-0.5">{item.children!.map(c => <NavLink key={c.href} item={c} depth={depth + 1} />)}</div>}
      </div>
    );
  }

  return (
    <Link href={item.href} className="block">
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-sm ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{item.name}</span>
        {item.badge != null && item.badge > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{item.badge}</span>
        )}
      </div>
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout: localLogout, impersonatedCompany, stopImpersonating } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const logoutMutation = useLogout();

  React.useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const handleLogout = async () => {
    try { await logoutMutation.mutateAsync(); } catch { }
    finally { localLogout(); }
  };

  const handleStopImpersonating = () => {
    stopImpersonating();
    setLocation("/super-admin/companies");
  };

  if (!user) return null;

  const navigation = getNavigation(user.role);
  const pendingCount = getPendingResults().length + getQueue().length;

  return (
    <div className="flex min-h-screen bg-background flex-col">
      {impersonatedCompany && user.role === "SuperAdmin" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-4 shrink-0 z-50">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
            <span><span className="font-semibold">Company View:</span> {impersonatedCompany.name} — All data scoped to this company</span>
          </div>
          <button onClick={handleStopImpersonating} className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1 border border-amber-300 rounded-lg px-2 py-1 hover:bg-amber-100 transition-colors shrink-0">
            <X className="h-3.5 w-3.5" /> Exit View
          </button>
        </div>
      )}

      {!isOnline && (
        <div className="bg-gray-900 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-medium">
          <WifiOff className="w-3.5 h-3.5" /> Offline Mode — Exam data saved locally, will sync when connected
          {pendingCount > 0 && <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full">{pendingCount} pending</span>}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {isMobileMenuOpen && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

        <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-surface transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-14 items-center justify-between px-4 border-b border-border">
            <div>
              <span className="font-display text-base font-bold text-primary">CBT Bulldozer</span>
              {!isOnline && <div className="flex items-center gap-1 text-xs text-orange-500 mt-0.5"><WifiOff className="w-2.5 h-2.5" /> Offline</div>}
            </div>
            <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-col h-[calc(100%-3.5rem)] justify-between">
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {navigation.map(item => <NavLink key={item.href} item={item} />)}
            </nav>

            <div className="border-t border-border p-3 space-y-1">
              <div className="px-3 py-2 mb-1">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                {user.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                <div className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{user.role}</div>
              </div>
              <button onClick={handleLogout} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4 lg:hidden">
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-display text-base font-bold">CBT Bulldozer</span>
            {!isOnline && <WifiOff className="h-4 w-4 text-orange-500 ml-auto" />}
          </header>

          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mx-auto max-w-6xl">
              {children}
            </motion.div>
          </div>
        </main>
      </div>
      <OfflineBanner />
    </div>
  );
}
