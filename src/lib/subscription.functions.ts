import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
export const listSubscriptions = createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:allowed}=await context.supabase.rpc("is_platform_admin");if(!allowed)throw new Error("Platform administrator required");
  const [plans,subscriptions,companies]=await Promise.all([context.supabase.from("subscription_plans").select("id,name,price_monthly,price_annual").eq("is_active",true),context.supabase.from("institution_subscriptions").select("*,institutions(name),subscription_plans(name)"),context.supabase.from("institutions").select("id,name")]);
  for(const r of [plans,subscriptions,companies])if(r.error)throw new Error(r.error.message);
  return {plans:plans.data??[],subscriptions:subscriptions.data??[],companies:companies.data??[]};
});
export const saveSubscription = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((i:unknown)=>z.object({institution_id:z.string().uuid(),plan_id:z.string().uuid(),billing_cycle:z.enum(["monthly","annual"]),status:z.enum(["active","past_due","canceled","trialing"])}).parse(i)).handler(async({data,context})=>{
  const{data:allowed}=await context.supabase.rpc("is_platform_admin");if(!allowed)throw new Error("Platform administrator required");
  const end=new Date();end.setMonth(end.getMonth()+(data.billing_cycle==="annual"?12:1));
  const{error}=await context.supabase.from("institution_subscriptions").insert({...data,current_period_end:end.toISOString()});if(error)throw new Error(error.message);
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");const{error:auditError}=await supabaseAdmin.from("institution_audit_logs").insert({actor_id:context.userId,institution_id:data.institution_id,target_id:data.institution_id,action:"subscription_assigned",details:{plan_id:data.plan_id,status:data.status}});if(auditError)throw new Error(auditError.message);
  return{success:true};
});