import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Menu, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccount } from "@/lib/account.functions";
import { resolveWorkspaceRole, roleLabels, workspaceViews } from "@/lib/workspace";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { PortalOverview, SessionList, PaymentList, CertificateList, StaffList } from "@/components/dashboard/PortalPanels";
import { CompanyDirectory } from "@/components/dashboard/CompanyDirectory";
import { CompanyAssignmentsAndNotes } from "@/components/dashboard/CompanyAssignmentsAndNotes";
import { CompanyLearnersManager } from "@/components/dashboard/CompanyLearnersManager";
import { CompanyProfileEditor } from "@/components/dashboard/CompanyProfileEditor";
import { StudentProfileEditor } from "@/components/dashboard/StudentProfileEditor";
import { DirectMessagingHub } from "@/components/dashboard/DirectMessagingHub";
import { CourseLearningPlayer } from "@/components/dashboard/CourseLearningPlayer";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { CampusAcademicManager } from "@/components/dashboard/CampusAcademicManager";
import { SuperAdminConsole } from "@/components/dashboard/SuperAdminConsole";
import { RbacManagementPanel } from "@/components/dashboard/RbacManagementPanel";
import { IssueReporter } from "@/components/dashboard/IssueReporter";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ManagedAccounts } from "@/components/dashboard/ManagedAccounts";
import { SubscriptionPanel } from "@/components/dashboard/SubscriptionPanel";
const accountOptions = queryOptions({ queryKey: ["account"], queryFn: () => getAccount() });
export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Workspace — CATECH Learn" }, { name: "description", content: "Your secure CATECH Learn workspace for sessions, learners and company management." }, { property: "og:title", content: "CATECH Learn Workspace" }, { property: "og:description", content: "Learning and company management in your role-specific workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountOptions), component: Dashboard,
});
function Dashboard() {
  const {data}=useSuspenseQuery(accountOptions); const role=resolveWorkspaceRole(data);
  const [view,setView]=useState("overview");const [mobile,setMobile]=useState(false);const [course,setCourse]=useState<string|null>(null);
  const membership=data.memberships.find(m=>m.active && m.role===(role==="institution_admin"?"institution_admin":role==="teacher"?"teacher":"student"));
  const [browseCompany,setBrowseCompany]=useState<{id:string;name:string;code:string}|null>(null);
  const company=role==="student"?browseCompany??membership?.institution??null:membership?.institution??null;
  const authorizedView=workspaceViews[role].some(v=>v.id===view)?view:"overview";
  const title=workspaceViews[role].find(v=>v.id===authorizedView)?.label??"Overview";
  const navigate=(next:string)=>{const legacy:Record<string,string>={my_issues:"support",company_courses:"sessions",company_learners:"learners",company_assignments:"assignments",company_payments:"payments",platform_control:"overview",select_company:"companies"};setView(legacy[next]??next);};
  const admin=role==="super_admin";
  return <div className="portal-shell min-h-screen bg-background flex"><DashboardSidebar activeView={authorizedView} onViewChange={navigate} userRole={role} selectedCompany={company} displayName={data.profile.display_name} mobileOpen={mobile} onMobileOpenChange={setMobile}/><div className="flex-1 min-w-0"><header className="h-20 sticky top-0 z-20 bg-card border-b border-border flex items-center justify-between px-5 sm:px-8 gap-3"><div className="flex items-center gap-3 min-w-0"><Button aria-label="Open navigation" variant="ghost" size="icon" className="md:hidden" onClick={()=>setMobile(true)}><Menu className="h-5 w-5"/></Button><div><p className="text-xs text-muted-foreground mb-1">{roleLabels[role]}</p><h1 className="text-lg font-semibold">{title}</h1></div></div><div className="flex items-center gap-4"><NotificationBell onNavigate={navigate}/><div className="h-8 border-l border-border"/><span className="h-9 w-9 rounded-full bg-secondary text-primary font-semibold flex items-center justify-center">{data.profile.display_name.charAt(0)||"C"}</span><span className="text-sm font-medium hidden lg:block">{data.profile.display_name}</span></div></header>
    <main className="px-5 sm:px-8 xl:px-10 py-8 max-w-[1440px] mx-auto">
    {course?<CourseLearningPlayer courseId={course} onBack={()=>setCourse(null)}/>:<>
    {authorizedView==="overview"&&<PortalOverview role={role} name={data.profile.display_name} onNavigate={navigate} onLearn={setCourse}/>}
    {admin && ["companies","courses","payments","audit","issues","settings"].includes(authorizedView)&&<div className="admin-console"><SuperAdminConsole key={authorizedView} initialTab={authorizedView as "companies"|"users"|"courses"|"payments"|"audit"|"issues"|"settings"}/></div>}
    {authorizedView==="users"&&admin&&<ManagedAccounts/>}
    {authorizedView==="subscriptions"&&admin&&<SubscriptionPanel/>}
    {authorizedView==="rbac_management"&&admin&&<RbacManagementPanel/>}
    {authorizedView==="companies"&&role==="student"&&<CompanyDirectory selectedCompanyId={company?.id??null} onSelectCompany={c=>{setBrowseCompany(c);setView("sessions");}} onExploreCourses={()=>setView("sessions")}/>}
    {authorizedView==="sessions"&&!admin&&<SessionList role={role} {...(company?{institutionId:company.id}:{})} onLearn={setCourse}/>}
    {authorizedView==="my_learning"&&role==="student"&&<SessionList role={role} enrolledOnly onLearn={setCourse}/>}
    {authorizedView==="assignments"&&role!=="teacher"&&<CompanyAssignmentsAndNotes institutionId={company?.id} isCompanyAdmin={role==="institution_admin"}/>}
    {role==="teacher"&&["assignments","learners"].includes(authorizedView)&&<TeacherDashboard displayName={data.profile.display_name} institutionId={company?.id} initialTab={authorizedView==="assignments"?"grading":"learners"} onNavigateToMessages={()=>setView("messages")}/>}
    {authorizedView==="learners"&&role==="institution_admin"&&<CompanyLearnersManager institutionId={company?.id} companyName={company?.name??"Company"}/>}
    {authorizedView==="staff"&&role==="institution_admin"&&company&&<StaffList institutionId={company.id}/>}
    {authorizedView==="live"&&role==="institution_admin"&&company&&<CampusAcademicManager institutionId={company.id}/>}
    {authorizedView==="payments"&&!admin&&<PaymentList/>}
    {authorizedView==="certificates"&&role==="student"&&<CertificateList/>}
    {authorizedView==="messages"&&!admin&&<DirectMessagingHub currentUserId={data.profile.id} currentUserRole={role==="institution_admin"?"company":"student"} institutionId={company?.id}/>}
    {authorizedView==="company_settings"&&role==="institution_admin"&&<CompanyProfileEditor institutionId={company?.id} isSuperAdmin={false}/>}
    {authorizedView==="profile"&&<StudentProfileEditor profile={data.profile} roles={data.roles} isPlatformAdmin={admin} selectedCompany={company} onBrowseCompaniesClick={()=>role==="student"&&setView("companies")}/>}
    {authorizedView==="support"&&role==="student"&&<IssueReporter institutionId={company?.id}/>}
    </>}
    </main></div></div>;
}
