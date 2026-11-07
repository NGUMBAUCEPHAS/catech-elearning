import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPortalOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [courses, enrollments, payments, progress, submissions, activity] = await Promise.all([
    context.supabase.from("courses").select("id,title,code,is_published,price,institution_id,instructor_id,created_at").order("created_at", { ascending: false }),
    context.supabase.from("enrollments").select("id,course_id,user_id,status"),
    context.supabase.from("payments").select("id,amount,currency,status,created_at").order("created_at", { ascending: false }),
    context.supabase.from("lesson_progress").select("id,completed,user_id,lesson_id"),
    context.supabase.from("assignment_submissions").select("id,grade,user_id"),
    context.supabase.from("institution_audit_logs").select("id,action,created_at").order("created_at", { ascending: false }).limit(6),
  ]);
  for (const r of [courses, enrollments, payments, progress, submissions, activity]) if (r.error) throw new Error(r.error.message);
  const { data: memberships } = await context.supabase.from("institution_memberships").select("role,active,institution_id").eq("user_id",context.userId);
  const { data: platform } = await context.supabase.rpc("is_platform_admin");
  const teacher = !platform && !memberships?.some(m=>m.active&&m.role==="institution_admin") && memberships?.some(m=>m.active&&m.role==="teacher");
  const managed = memberships?.filter(m=>m.active&&m.role==="institution_admin").map(m=>m.institution_id)??[];
  const scopedCourses = (courses.data??[]).filter(c=>platform || (teacher ? c.instructor_id===context.userId : managed.length ? managed.includes(c.institution_id) : true));
  return { courses: scopedCourses, enrollments: enrollments.data ?? [], payments: payments.data ?? [], progress: progress.data ?? [], submissions: submissions.data ?? [], activity: activity.data ?? [] };
});
export const listScopedPayments = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("payments").select("id,amount,currency,status,phone_number,mpesa_receipt_number,created_at,courses(title)").order("created_at", { ascending: false });
  if (error) throw new Error(error.message); return data ?? [];
});
export const listMyCertificates = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("certificates").select("id,certificate_number,issue_date,status,pdf_url,courses(title)").eq("user_id", context.userId).order("issue_date", { ascending: false });
  if (error) throw new Error(error.message); return data ?? [];
});
export const listCompanyMembers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ institution_id: z.string().uuid() }).parse(i)).handler(async ({ data, context }) => {
  const { data: allowed } = await context.supabase.rpc("can_access_institution", { _institution_id: data.institution_id, _manage: true });
  if (!allowed) throw new Error("Company administrator access required");
  const { data: members, error } = await context.supabase.from("institution_memberships").select("id,user_id,role,active,profiles(display_name,phone_number)").eq("institution_id", data.institution_id);
  if (error) throw new Error(error.message); return members ?? [];
});
export const saveCompanyMember = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ institution_id: z.string().uuid(), user_id: z.string().uuid(), role: z.enum(["student", "teacher", "institution_admin"]), active: z.boolean() }).parse(i)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("assign_institution_member", { _institution_id: data.institution_id, _user_id: data.user_id, _role: data.role, _active: data.active });
  if (error) throw new Error(error.message); return { success: true };
});
export const getJoinApproval = createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({institution_id:z.string().uuid()}).parse(i)).handler(async({data,context})=>{const{data:row,error}=await context.supabase.from("institutions").select("require_member_approval").eq("id",data.institution_id).single();if(error)throw new Error(error.message);return row.require_member_approval;});
export const setJoinApproval = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({institution_id:z.string().uuid(),required:z.boolean()}).parse(i)).handler(async({data,context})=>{const{error}=await context.supabase.rpc("set_company_join_approval",{_institution:data.institution_id,_required:data.required});if(error)throw new Error(error.message);return{success:true};});
