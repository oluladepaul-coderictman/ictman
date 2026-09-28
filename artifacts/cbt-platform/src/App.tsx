import * as React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/app-layout";
import "@/lib/fetch-interceptor";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import CandidateLogin from "@/pages/login-candidate";
import SuperAdminDashboard from "@/pages/super-admin/dashboard";
import SuperAdminCompanies from "@/pages/super-admin/companies";
import SuperAdminCompanyView from "@/pages/super-admin/company-view";
import SuperAdminAnalytics from "@/pages/super-admin/analytics";
import PaulinaPage from "@/pages/paulina";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminExams from "@/pages/admin/exams";
import AdminExamEditor from "@/pages/admin/exam-editor";
import AdminUsers from "@/pages/admin/users";
import AdminResults from "@/pages/admin/results";
import AdminCandidates from "@/pages/admin/candidates";
import AdminDepartments from "@/pages/admin/departments";
import AdminCourses from "@/pages/admin/courses";
import AdminBroadsheet from "@/pages/admin/broadsheet";
import AdminMonitor from "@/pages/admin/monitor";
import AdminSettings from "@/pages/admin/settings";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminQuestionBank from "@/pages/admin/question-bank";
import AdminScheduler from "@/pages/admin/scheduler";
import AdminCertificates from "@/pages/admin/certificates";
import AdminImport from "@/pages/admin/import";
import StaffExams from "@/pages/staff/exams";
import StaffExamTaking from "@/pages/staff/exam-taking";
import StaffResults from "@/pages/staff/results";
import StaffPerformance from "@/pages/staff/performance";
import CandidateExams from "@/pages/candidate/exams";
import CandidateResults from "@/pages/candidate/results";
import CandidateCertificate from "@/pages/candidate/certificate";
import ExamPortal from "@/pages/public/exam-portal";
import DeptPortal from "@/pages/public/dept-portal";
import ProfilePage from "@/pages/profile";
import NotificationsPage from "@/pages/notifications";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
});

function getDefaultRoute(role: string) {
  switch (role) {
    case "SuperAdmin": return "/super-admin/dashboard";
    case "CompanyAdmin": return "/admin/dashboard";
    case "Candidate": return "/candidate-exams";
    default: return "/exams";
  }
}

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType<any>; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading…</div>;
  if (!user) return <Redirect to="/" />;
  // Wrong role → redirect to their own default page instead of showing an error
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to={getDefaultRoute(user.role)} />;
  }
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function ExamRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/" />;
  // Candidates and Staff can take exams; everyone else goes to their dashboard
  if (user.role !== "Staff" && user.role !== "Candidate") return <Redirect to={getDefaultRoute(user.role)} />;
  return <AppLayout><StaffExamTaking /></AppLayout>;
}

function Router() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading…</div>;

  return (
    <Switch>
      <Route path="/">
        {user ? <Redirect to={getDefaultRoute(user.role)} /> : <Login />}
      </Route>
      <Route path="/login/candidate">
        {user ? <Redirect to={getDefaultRoute(user.role)} /> : <CandidateLogin />}
      </Route>

      {/* Public portals — no auth */}
      <Route path="/org/:companySlug/:deptSlug" component={DeptPortal} />
      <Route path="/org/:companySlug/:deptSlug/:courseCode" component={ExamPortal} />

      {/* Super Admin */}
      <Route path="/super-admin/dashboard">{() => <ProtectedRoute component={SuperAdminDashboard} allowedRoles={["SuperAdmin"]} />}</Route>
      <Route path="/super-admin/companies">{() => <ProtectedRoute component={SuperAdminCompanies} allowedRoles={["SuperAdmin"]} />}</Route>
      <Route path="/super-admin/company-view/:id">{() => <ProtectedRoute component={SuperAdminCompanyView} allowedRoles={["SuperAdmin"]} />}</Route>
      <Route path="/super-admin/analytics">{() => <ProtectedRoute component={SuperAdminAnalytics} allowedRoles={["SuperAdmin"]} />}</Route>
      <Route path="/super-admin/paulina">{() => <ProtectedRoute component={PaulinaPage} allowedRoles={["SuperAdmin"]} />}</Route>

      {/* Company Admin */}
      <Route path="/admin/dashboard">{() => <ProtectedRoute component={AdminDashboard} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/exams">{() => <ProtectedRoute component={AdminExams} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/exams/new">{() => <ProtectedRoute component={AdminExamEditor} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/exams/:id/edit">{() => <ProtectedRoute component={AdminExamEditor} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/users">{() => <ProtectedRoute component={AdminUsers} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/results">{() => <ProtectedRoute component={AdminResults} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/candidates">{() => <ProtectedRoute component={AdminCandidates} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/departments">{() => <ProtectedRoute component={AdminDepartments} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/courses">{() => <ProtectedRoute component={AdminCourses} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/broadsheet">{() => <ProtectedRoute component={AdminBroadsheet} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/monitor">{() => <ProtectedRoute component={AdminMonitor} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/settings">{() => <ProtectedRoute component={AdminSettings} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/analytics">{() => <ProtectedRoute component={AdminAnalytics} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/question-bank">{() => <ProtectedRoute component={AdminQuestionBank} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/scheduler">{() => <ProtectedRoute component={AdminScheduler} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/certificates">{() => <ProtectedRoute component={AdminCertificates} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/import">{() => <ProtectedRoute component={AdminImport} allowedRoles={["CompanyAdmin"]} />}</Route>
      <Route path="/admin/paulina">{() => <ProtectedRoute component={PaulinaPage} allowedRoles={["CompanyAdmin"]} />}</Route>

      {/* Staff */}
      <Route path="/exams">{() => <ProtectedRoute component={StaffExams} allowedRoles={["Staff"]} />}</Route>
      <Route path="/my-results">{() => <ProtectedRoute component={StaffResults} allowedRoles={["Staff"]} />}</Route>
      <Route path="/performance">{() => <ProtectedRoute component={StaffPerformance} allowedRoles={["Staff"]} />}</Route>
      <Route path="/staff/paulina">{() => <ProtectedRoute component={PaulinaPage} allowedRoles={["Staff"]} />}</Route>

      {/* Candidate */}
      <Route path="/candidate-exams">{() => <ProtectedRoute component={CandidateExams} allowedRoles={["Candidate"]} />}</Route>
      <Route path="/candidate-results">{() => <ProtectedRoute component={CandidateResults} allowedRoles={["Candidate"]} />}</Route>
      <Route path="/candidate-results/:resultId/certificate">{() => <ProtectedRoute component={CandidateCertificate} allowedRoles={["Candidate"]} />}</Route>

      {/* Shared */}
      <Route path="/profile">{() => <ProtectedRoute component={ProfilePage} />}</Route>
      <Route path="/notifications">{() => <ProtectedRoute component={NotificationsPage} />}</Route>

      {/* Exam taking — Staff & Candidate only */}
      <Route path="/exams/:id" component={ExamRoute} />
      <Route path="/take-exam/:id" component={ExamRoute} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
