import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LogIn,
  Mail,
  Eye,
  EyeOff,
  GraduationCap,
  Building2,
  ShieldCheck,
  UserPlus,
  Phone,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/AccountProvider";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import logoImg from "@/assets/logo-catech.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  registerCompanyFn,
  listPublicCompanies,
  associateStudentWithCompanyFn,
  DEFAULT_SEED_COMPANIES,
} from "@/lib/company.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Authentication — CATECH Learn" },
      { name: "description", content: "Sign in or register your CATECH Learn company or student account." },
      { property: "og:title", content: "CATECH Learn Portal Access" },
      { property: "og:description", content: "Commercial e-learning platform with M-Pesa payments and direct company-student workflows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"signin" | "signup_student" | "signup_company" | "forgot">("signin");

  // Form Fields - Authentication
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Student Registration Fields
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  // Company Registration Fields
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [companyAdminName, setCompanyAdminName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const { user, loading } = useAccount();
  const navigate = useNavigate();

  // Fetch available companies for student enrollment
  const { data: companies = [] } = useQuery({
    queryKey: ["public-companies"],
    queryFn: () => listPublicCompanies(),
  });

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  function switchMode(next: typeof mode) {
    setMode(next);
    setError("");
    setMessage("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (mode === "forgot") {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw result.error;
        setMessage("Password reset email sent. Please check your inbox.");
      } else if (mode === "signup_student") {
        // Register Student Account
        const chosen = companies.find((c) => c.id === selectedCompanyId);
        if (!chosen) throw new Error("Select a company to join.");

        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: studentName,
              account_type: "student",
              phone_number: studentPhone,
              institution_id: chosen?.id,
              institution_name: chosen?.name,
            },
          },
        });

        if (result.error) throw result.error;

        if (result.data.session) {
          if (chosen) {
            await associateStudentWithCompanyFn({ data: { institution_id: chosen.id } });

            if (typeof window !== "undefined") {
              localStorage.setItem("catech_active_role", "student");
              localStorage.setItem(
                "catech_selected_company",
                JSON.stringify({ id: chosen.id, name: chosen.name, code: chosen.code }),
              );
              localStorage.setItem("catech_selected_company_id", chosen.id);
            }
          }
          await navigate({ to: "/dashboard" });
        } else {
          setMessage("Account created. Please check your email to confirm your account, then sign in.");
        }
      } else if (mode === "signup_company") {
        // Register Company Account
        const formattedCode = companyCode.toUpperCase().replace(/\s+/g, "-");
        const adminEmail = companyEmail || email;

        const result = await supabase.auth.signUp({
          email: adminEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: companyAdminName || `${companyName} Admin`,
              account_type: "company",
              phone_number: companyPhone,
              company_name: companyName,
              company_code: formattedCode,
            },
          },
        });

        if (result.error) throw result.error;

        if (result.data.session) {
          await registerCompanyFn({ data: { name: companyName, code: formattedCode, contact_email: adminEmail, phone_number: companyPhone } });

          if (typeof window !== "undefined") {
            localStorage.setItem("catech_active_role", "institution_admin");
          }
          await navigate({ to: "/dashboard" });
        } else {
          setMessage("Company account created. Please confirm your email, then sign in.");
        }
      } else {
        // Sign In
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;

        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please verify credentials.");
    } finally {
      setBusy(false);
    }
  }

  const signup = mode === "signup_student" || mode === "signup_company";
  const field = "w-full h-11 rounded-md border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex h-20 items-center justify-between px-6 sm:px-10 border-b border-border bg-card"><div className="flex items-center gap-3"><img src={logoImg} alt="CATECH" className="h-10 w-10 object-contain"/><span className="text-xl font-bold">CATECH <span className="text-primary">Learn</span></span></div><span className="text-xs text-muted-foreground hidden sm:block">Your learning workspace</span></header>
      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8"><p className="text-primary text-sm font-semibold mb-3">CATECH Learn</p><h1 className="text-3xl font-semibold">{mode === "signin" ? "Welcome back" : mode === "forgot" ? "Reset your password" : mode === "signup_company" ? "Register your company" : "Create your account"}</h1><p className="text-sm text-muted-foreground mt-3">{mode === "signin" ? "Sign in to continue to your workspace." : mode === "forgot" ? "We’ll send you a password reset link." : "Start with your details below."}</p></div>
          {mode !== "forgot" && <div className="flex border-b border-border mb-7" role="tablist" aria-label="Account type">{([['signin','Sign in'],['signup_student','Student'],['signup_company','Company']] as const).map(([id,label]) => <Button key={id} role="tab" aria-selected={mode===id} variant="ghost" onClick={() => switchMode(id)} className={`flex-1 rounded-none border-b-2 h-11 ${mode===id ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{label}</Button>)}</div>}
          <form onSubmit={submit} className="space-y-5">
            {mode === "signup_student" && <><label className="block text-sm font-medium space-y-2"><span>Full name</span><input className={field} required maxLength={100} value={studentName} onChange={e=>setStudentName(e.target.value)} autoComplete="name"/></label><label className="block text-sm font-medium space-y-2"><span>Phone number</span><input className={field} required value={studentPhone} onChange={e=>setStudentPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="0712345678"/></label><label className="block text-sm font-medium space-y-2"><span>Company or institution</span><select className={field} required value={selectedCompanyId} onChange={e=>setSelectedCompanyId(e.target.value)}><option value="">Select a company</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></>}
            {mode === "signup_company" && <><label className="block text-sm font-medium space-y-2"><span>Company name</span><input className={field} required maxLength={160} value={companyName} onChange={e=>setCompanyName(e.target.value)}/></label><div className="grid grid-cols-2 gap-4"><label className="block text-sm font-medium space-y-2"><span>Company code</span><input className={field} required maxLength={20} value={companyCode} onChange={e=>setCompanyCode(e.target.value.toUpperCase())} placeholder="CATECH"/></label><label className="block text-sm font-medium space-y-2"><span>Phone number</span><input className={field} required type="tel" value={companyPhone} onChange={e=>setCompanyPhone(e.target.value)}/></label></div><label className="block text-sm font-medium space-y-2"><span>Administrator name</span><input className={field} required value={companyAdminName} onChange={e=>setCompanyAdminName(e.target.value)} autoComplete="name"/></label></>}
            <label className="block text-sm font-medium space-y-2"><span>Email address</span><input className={field} type="email" required value={mode === "signup_company" ? companyEmail : email} onChange={e=>{setEmail(e.target.value); if(mode==="signup_company")setCompanyEmail(e.target.value);}} autoComplete="email" placeholder="name@company.com"/></label>
            {mode !== "forgot" && <div><div className="flex items-center justify-between mb-2"><label htmlFor="auth-password" className="text-sm font-medium">Password</label>{mode==="signin" && <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={()=>switchMode("forgot")}>Forgot password?</Button>}</div><div className="relative"><input id="auth-password" className={`${field} pr-12`} type={showPassword?"text":"password"} required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={signup?"new-password":"current-password"}/><Button type="button" variant="ghost" size="icon" aria-label={showPassword?"Hide password":"Show password"} className="absolute right-1 top-1 h-9 w-9" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</Button></div></div>}
            {error && <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>}
            {message && <p role="status" className="text-sm text-primary bg-secondary rounded-md p-3">{message}</p>}
            <Button type="submit" disabled={busy} className="w-full h-11 gap-2">{busy ? "Please wait…" : mode==="signin" ? "Sign in" : mode==="forgot" ? "Send reset link" : mode==="signup_company" ? "Register company" : "Create account"}<ArrowRight className="h-4 w-4"/></Button>
          </form>
          {mode==="forgot" && <Button variant="link" className="mt-4 px-0" onClick={()=>switchMode("signin")}>Back to sign in</Button>}
          <p className="mt-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2"><ShieldCheck className="h-3.5 w-3.5"/>Secure account access</p>
        </div>
      </main><footer className="py-5 text-center text-xs text-muted-foreground border-t border-border">CATECH Learn</footer>
    </div>
  );
}
