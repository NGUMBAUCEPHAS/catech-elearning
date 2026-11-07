import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const listManagedAccounts = createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const{data:allowed}=await context.supabase.rpc("is_platform_admin");if(!allowed)throw new Error("Platform administrator required");
  const{ supabaseAdmin }=await import("@/integrations/supabase/client.server");
  const{data, error}=await supabaseAdmin.auth.admin.listUsers({perPage:1000});if(error)throw new Error(error.message);
  const [profiles,memberships,roles,status]=await Promise.all([supabaseAdmin.from("profiles").select("id,display_name,phone_number"),supabaseAdmin.from("institution_memberships").select("user_id,role,institution_id,institutions(name)"),supabaseAdmin.from("user_roles").select("user_id,role"),supabaseAdmin.from("account_status").select("user_id,status")]);
  for(const r of [profiles,memberships,roles,status])if(r.error)throw new Error(r.error.message);
  return data.users.filter(u=>!u.deleted_at).map(u=>{const p=profiles.data?.find(p=>p.id===u.id);const m=memberships.data?.find(m=>m.user_id===u.id);return{id:u.id,email:u.email??"",name:p?.display_name??"",phone:p?.phone_number??"",company:m?.institutions?.name??"—",institutionId:m?.institution_id??null,role:roles.data?.some(r=>r.user_id===u.id&&r.role==="super_admin")?"super_admin":m?.role??"student",status:status.data?.find(s=>s.user_id===u.id)?.status??"active",verified:Boolean(u.email_confirmed_at)};});
});
export const manageAccount = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({user_id:z.string().uuid(),action:z.enum(["activate","suspend","delete","edit"]),display_name:z.string().trim().min(1).max(100).optional(),phone_number:z.string().max(40).optional()}).parse(i)).handler(async({data,context})=>{
  const{data:allowed}=await context.supabase.rpc("is_platform_admin");if(!allowed)throw new Error("Platform administrator required");
  if(data.user_id===context.userId&&data.action!=="edit")throw new Error("You cannot suspend or delete your own administrator account");
  const{ supabaseAdmin }=await import("@/integrations/supabase/client.server");
  const{data:targetRoles}=await supabaseAdmin.from("user_roles").select("role").eq("user_id",data.user_id);
  if(targetRoles?.some(r=>r.role==="super_admin")&&data.action!=="edit")throw new Error("Administrator accounts must be demoted before suspension or deletion");
  if(data.action==="edit"){
    if(!data.display_name)throw new Error("Name is required");
    const{error}=await supabaseAdmin.from("profiles").update({display_name:data.display_name,...(data.phone_number!==undefined?{phone_number:data.phone_number}:{})}).eq("id",data.user_id);if(error)throw new Error(error.message);
  }else{
    const state=data.action==="activate"?"active":data.action==="delete"?"deleted":"suspended";
    const{error}=await supabaseAdmin.from("account_status").upsert({user_id:data.user_id,status:state,updated_at:new Date().toISOString()});if(error)throw new Error(error.message);
    const{error:authError}=await supabaseAdmin.auth.admin.updateUserById(data.user_id,{ban_duration:data.action==="activate"?"none":"876000h"});if(authError)throw new Error(authError.message);
  }
  const{error:auditError}=await supabaseAdmin.from("institution_audit_logs").insert({actor_id:context.userId,target_id:data.user_id,action:`account_${data.action}`,details:{source:"platform_admin"}});if(auditError)throw new Error(auditError.message);
  return{success:true};
});