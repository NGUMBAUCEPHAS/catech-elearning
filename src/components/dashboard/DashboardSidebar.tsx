import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Building2, BookOpen, Users, FileCheck2, MessageSquare, Smartphone, Shield, Activity, Settings, LifeBuoy, Award, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { workspaceViews, roleLabels, type WorkspaceRole } from "@/lib/workspace";
import logo from "@/assets/logo-catech.png";
export type RoleType = WorkspaceRole | "company";
const icons = { overview: LayoutDashboard, company: Building2, course: BookOpen, users: Users, assignment: FileCheck2, message: MessageSquare, payment: Smartphone, shield: Shield, activity: Activity, settings: Settings, support: LifeBuoy, award: Award };
interface Props { activeView: string; onViewChange: (v: string) => void; userRole: WorkspaceRole; selectedCompany?: { id: string; name: string; code: string } | null; displayName: string; mobileOpen: boolean; onMobileOpenChange: (v: boolean) => void; }
export function DashboardSidebar({ activeView, onViewChange, userRole, selectedCompany, displayName, mobileOpen, onMobileOpenChange }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate(); const qc = useQueryClient();
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); }
  function content(mini: boolean) { return <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
    <div className="flex h-20 shrink-0 items-center gap-3 px-5 border-b border-sidebar-border"><img src={logo} alt="CATECH" className="h-9 w-9 shrink-0 object-contain" />{!mini && <span className="text-lg font-bold whitespace-nowrap">CATECH <span className="text-primary">Learn</span></span>}</div>
    {!mini && <div className="px-6 pt-6 pb-3"><p className="text-xs font-semibold text-muted-foreground">{roleLabels[userRole]}</p>{selectedCompany && <p className="mt-1 text-sm font-semibold truncate">{selectedCompany.name}</p>}</div>}
    <nav aria-label={`${roleLabels[userRole]} navigation`} className="flex-1 overflow-y-auto space-y-1 p-3 pt-5"><TooltipProvider>{workspaceViews[userRole].map(item => { const Icon = icons[item.icon as keyof typeof icons]; const control = <Button key={item.id} variant="ghost" onClick={() => { onViewChange(item.id); onMobileOpenChange(false); }} aria-label={item.label} aria-current={activeView === item.id ? "page" : undefined} className={`w-full h-11 ${mini ? "justify-center px-0" : "justify-start px-3"} gap-3 font-medium ${activeView === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}><Icon className="h-[18px] w-[18px] shrink-0" />{!mini && item.label}</Button>; return mini ? <Tooltip key={item.id}><TooltipTrigger asChild>{control}</TooltipTrigger><TooltipContent side="right">{item.label}</TooltipContent></Tooltip> : control; })}</TooltipProvider></nav>
    <div className="border-t border-sidebar-border p-3 space-y-3"><Button variant="ghost" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden md:flex w-full justify-start gap-3 text-muted-foreground" onClick={() => setCollapsed(!collapsed)}>{mini ? <PanelLeftOpen className="h-4 w-4"/> : <><PanelLeftClose className="h-4 w-4"/>Collapse sidebar</>}</Button><div className="flex items-center gap-3 px-2"><span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-bold">{displayName.charAt(0) || "C"}</span>{!mini && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{displayName}</p><p className="text-xs text-muted-foreground">{roleLabels[userRole]}</p></div>}{!mini && <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut className="h-4 w-4"/></Button>}</div>{mini && <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut className="h-4 w-4"/></Button>}</div>
  </div>; }
  return <><aside className={`hidden md:block sticky top-0 h-screen shrink-0 border-r border-sidebar-border transition-[width] duration-200 motion-reduce:transition-none ${collapsed ? "w-20" : "w-64"}`}>{content(collapsed)}</aside><Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}><SheetContent side="left" className="w-72 p-0"><SheetTitle className="sr-only">Navigation</SheetTitle>{content(false)}</SheetContent></Sheet></>;
}
