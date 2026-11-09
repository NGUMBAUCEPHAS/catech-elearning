import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CompanySummary {
  id: string;
  name: string;
  code: string;
  contact_email: string;
  status: string;
  description?: string;
  phone_number?: string;
  avatar_url?: string | null;
  address?: string;
  course_count?: number;
  student_count?: number;
  created_at: string;
}

export interface CompanyLearner {
  userId: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string | null;
  enrolledCourses: Array<{
    courseId: string;
    courseTitle: string;
    enrolledAt: string;
    status: string;
  }>;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  quizScoreAverage: number;
  assignmentsSubmitted: number;
  lastActive?: string;
}

export interface CompanyAssignment {
  id: string;
  course_id: string;
  course_title?: string;
  title: string;
  instructions: string;
  due_date: string | null;
  max_points: number;
  created_at: string;
  submissions_count?: number;
}

export interface LessonNote {
  id: string;
  lesson_id: string;
  author_id: string;
  author_name?: string;
  title: string;
  content: string;
  file_url: string | null;
  created_at: string;
}

// Standard Accredited Partner Companies (Altocom, Midian, iTech, Catech)
export const DEFAULT_SEED_COMPANIES: Array<CompanySummary & { phone_number: string; description: string; address: string }> = [
  {
    id: "11111111-1111-4000-8000-000000000001",
    name: "Altocom Engineering & Tech Institute",
    code: "ALTOCOM",
    contact_email: "admissions@altocom.co.ke",
    phone_number: "+254 711 000 111",
    description: "Specialized engineering, industrial automation, telecommunications, and high-performance cloud networks.",
    address: "Altocom Tech Park, Waiyaki Way, Nairobi",
    status: "active",
    course_count: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: "22222222-2222-4000-8000-000000000002",
    name: "Midian Business & Digital Academy",
    code: "MIDIAN",
    contact_email: "info@midian.co.ke",
    phone_number: "+254 722 000 222",
    description: "Executive fintech leadership, product management, financial engineering, and enterprise strategy.",
    address: "Midian Financial Centre, Upper Hill, Nairobi",
    status: "active",
    course_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "33333333-3333-4000-8000-000000000003",
    name: "iTech Software Development Academy",
    code: "ITECH",
    contact_email: "enroll@itech.co.ke",
    phone_number: "+254 733 000 333",
    description: "Full-stack web engineering, cloud-native DevOps, TypeScript, mobile apps, and microservice architectures.",
    address: "iTech Innovation Campus, Kilimani, Nairobi",
    status: "active",
    course_count: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: "44444444-4444-4000-8000-000000000004",
    name: "Catech Higher Learning & Research Hub",
    code: "CATECH",
    contact_email: "info@catech.co.ke",
    phone_number: "+254 700 000 444",
    description: "Accredited computer science, applied machine learning, cybersecurity, and modern technical curriculum.",
    address: "Catech Science Park, Ngong Road, Nairobi",
    status: "active",
    course_count: 5,
    created_at: new Date().toISOString(),
  },
];

// Company discovery is a read-only projection from Lovable Cloud.
export const seedDefaultCompaniesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed, error } = await context.supabase.rpc("is_platform_admin");
    if (error || !allowed) throw new Error("Platform administrator access required");
    return { success: true, message: "Companies are managed in the company directory.", count: 0 };
  });

export const listPublicCompanies = createServerFn({ method: "GET" })
  .handler(async (): Promise<CompanySummary[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Company directory is unavailable");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data, error } = await client.rpc("list_active_company_summaries");
    if (error) throw new Error(error.message);
    return data as CompanySummary[];
  });

// 2. Register or provision a company for a user
const registerCompanySchema = z.object({
  name: z.string().trim().min(2, "Company name must be at least 2 characters").max(160),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9-]{1,29}$/, "Code must be 2-30 characters alphanumeric"),
  contact_email: z.string().trim().email("Valid email required"),
  phone_number: z.string().trim().optional(),
});

export const registerCompanyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => registerCompanySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("complete_account_onboarding");
    if (error) throw new Error(error.message);
    const { data: membership, error: memberError } = await context.supabase
      .from("institution_memberships").select("institution_id, institutions(code)")
      .eq("user_id", context.userId).eq("role", "institution_admin").maybeSingle();
    if (memberError) throw new Error(memberError.message);
    if (!membership || membership.institutions?.code !== data.code) throw new Error("Company registration does not match your verified account");
    return { success: true, institutionId: membership.institution_id };
  });

// 3. Get Company's Learners Directory with contacts and learning progress
export const getCompanyLearnersDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z
        .object({
          institution_id: z.string().uuid().optional(),
        })
        .optional()
        .parse(input) || {},
  )
  .handler(async ({ data, context }): Promise<CompanyLearner[]> => {
    let targetInstId = data?.institution_id;

    // If no institution_id passed, pick the user's managed institution
    if (!targetInstId) {
      const { data: member } = await context.supabase
        .from("institution_memberships")
        .select("institution_id")
        .eq("user_id", context.userId)
        .eq("role", "institution_admin")
        .maybeSingle();

      targetInstId = member?.institution_id;
    }

    if (!targetInstId) {
      return [];
    }

    // 1. Fetch all courses for this company
    const { data: courses = [] } = await context.supabase
      .from("courses" as never)
      .select("id, title" as never)
      .eq("institution_id" as never, targetInstId);

    interface CourseRow { id: string; title: string }
    const typedCourses = (courses as unknown as CourseRow[]) || [];
    const courseIds = typedCourses.map((c) => c.id);
    const courseTitleMap = new Map(typedCourses.map((c) => [c.id, c.title]));

    // 2. Fetch all enrollments for these courses
    let enrollments: Array<{
      user_id: string;
      course_id: string;
      status: string;
      enrolled_at: string;
    }> = [];

    if (courseIds.length > 0) {
      const { data: enrData } = await context.supabase
        .from("enrollments" as never)
        .select("user_id, course_id, status, enrolled_at" as never)
        .in("course_id" as never, courseIds);
      enrollments = (enrData as unknown as typeof enrollments) || [];
    }

    // Also fetch direct institution members with role 'student'
    const { data: directMembers } = await context.supabase
      .from("institution_memberships")
      .select("user_id, role, created_at")
      .eq("institution_id", targetInstId)
      .eq("role", "student");

    const userIds = Array.from(
      new Set([
        ...enrollments.map((e) => e.user_id),
        ...(directMembers || []).map((m) => m.user_id),
      ]),
    );

    if (userIds.length === 0) {
      return [];
    }

    // 3. Fetch user profiles
    const { data: profiles = [] } = await context.supabase
      .from("profiles")
      .select("id, display_name, avatar_url, created_at, phone_number")
      .in("id", userIds);

    // 4. Fetch payments to get phone numbers for students
    const { data: payments = [] } = await context.supabase
      .from("payments" as never)
      .select("user_id, phone_number, created_at" as never)
      .in("user_id" as never, userIds)
      .order("created_at" as never, { ascending: false });

    const phoneMap = new Map<string, string>();
    for (const p of (payments as unknown as Array<{ user_id: string; phone_number: string | null }>) || []) {
      if (p.phone_number && !phoneMap.has(p.user_id)) {
        phoneMap.set(p.user_id, p.phone_number);
      }
    }

    // 5. Fetch lesson progress for these users across company courses
    // Get all lessons for these courses
    const { data: modules = [] } = await context.supabase
      .from("modules" as never)
      .select("id, course_id" as never)
      .in("course_id" as never, courseIds);

    const moduleIds = ((modules as unknown as Array<{ id: string }>) || []).map((m) => m.id);
    let totalLessonsCount = 0;
    let lessonIds: string[] = [];

    if (moduleIds.length > 0) {
      const { data: lessons = [] } = await context.supabase
        .from("lessons" as never)
        .select("id" as never)
        .in("module_id" as never, moduleIds);
      lessonIds = ((lessons as unknown as Array<{ id: string }>) || []).map((l) => l.id);
      totalLessonsCount = lessonIds.length;
    }

    // Get completed lessons for each user
    const userCompletedLessons = new Map<string, number>();
    if (lessonIds.length > 0) {
      const { data: progress = [] } = await context.supabase
        .from("lesson_progress" as never)
        .select("user_id, lesson_id, completed" as never)
        .in("user_id" as never, userIds)
        .in("lesson_id" as never, lessonIds)
        .eq("completed" as never, true);

      for (const pr of (progress as unknown as Array<{ user_id: string; lesson_id: string }>) || []) {
        userCompletedLessons.set(pr.user_id, (userCompletedLessons.get(pr.user_id) || 0) + 1);
      }
    }

    // 6. Fetch assignments submitted
    const { data: submissions = [] } = await context.supabase
      .from("assignment_submissions" as never)
      .select("user_id, grade" as never)
      .in("user_id" as never, userIds);

    const submissionCounts = new Map<string, number>();
    for (const s of (submissions as unknown as Array<{ user_id: string; grade: number | null }>) || []) {
      submissionCounts.set(s.user_id, (submissionCounts.get(s.user_id) || 0) + 1);
    }

    const { data: attempts } = await context.supabase.from("quiz_attempts").select("user_id,score").in("user_id", userIds);
    const quizAverages = new Map<string, number>();
    for (const id of userIds) { const scores=(attempts??[]).filter(a=>a.user_id===id); if(scores.length)quizAverages.set(id,Math.round(scores.reduce((n,a)=>n+Number(a.score),0)/scores.length)); }
    // Build learner records
    return (profiles as unknown as Array<{ id: string; display_name: string | null; avatar_url: string | null; created_at: string; phone_number: string | null }>).map((p) => {
      const userEnrollments = enrollments.filter((e) => e.user_id === p.id);
      const completed = userCompletedLessons.get(p.id) || 0;
      const progressPct =
        totalLessonsCount > 0 ? Math.min(100, Math.round((completed / totalLessonsCount) * 100)) : 0;

      return {
        userId: p.id,
        displayName: p.display_name || "Scholar",
        phoneNumber: p.phone_number || phoneMap.get(p.id) || "—",
        avatarUrl: p.avatar_url,
        enrolledCourses: userEnrollments.map((ue) => ({
          courseId: ue.course_id,
          courseTitle: courseTitleMap.get(ue.course_id) || "Enrolled Session",
          enrolledAt: ue.enrolled_at,
          status: ue.status,
        })),
        progressPercentage: progressPct,
        completedLessons: completed,
        totalLessons: totalLessonsCount,
        quizScoreAverage: quizAverages.get(p.id) ?? 0,
        assignmentsSubmitted: submissionCounts.get(p.id) || 0,
        lastActive: p.created_at,
      };
    });
  });

// 4. Create Assignment for a Course / Module
const createAssignmentSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  instructions: z.string().trim().min(5, "Instructions required"),
  due_date: z.string().optional(),
  max_points: z.number().int().min(1).default(100),
});

export const createCompanyAssignmentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createAssignmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: assignment, error } = await context.supabase
      .from("assignments" as never)
      .insert({
        course_id: data.course_id,
        title: data.title,
        instructions: data.instructions,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        max_points: data.max_points,
      } as never)
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create assignment: ${(error as { message: string }).message}`);
    return { success: true, assignmentId: (assignment as unknown as { id: string }).id };
  });

// 5. List Assignments for a Company or Course
export const listCompanyAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z
        .object({
          institution_id: z.string().uuid().optional(),
          course_id: z.string().uuid().optional(),
        })
        .optional()
        .parse(input) || {},
  )
  .handler(async ({ data, context }): Promise<CompanyAssignment[]> => {
    let courseIds: string[] = [];

    if (data?.course_id) {
      courseIds = [data.course_id];
    } else if (data?.institution_id) {
      const { data: courses = [] } = await context.supabase
        .from("courses" as never)
        .select("id" as never)
        .eq("institution_id" as never, data.institution_id);
      courseIds = ((courses as unknown as Array<{ id: string }>) || []).map((c) => c.id);
    }

    const { data: assignments = [], error } = await context.supabase
      .from("assignments" as never)
      .select("id, course_id, title, instructions, due_date, max_points, created_at, courses(title)" as never)
      .order("created_at" as never, { ascending: false })
      .in("course_id" as never, courseIds.length > 0 ? courseIds : [""]);

    if (error) throw new Error((error as { message: string }).message);

    interface AssignmentRow {
      id: string;
      course_id: string;
      title: string;
      instructions: string;
      due_date: string | null;
      max_points: number;
      created_at: string;
      courses: { title?: string } | null;
    }

    return ((assignments as unknown as AssignmentRow[]) || []).map((a) => ({
      id: a.id,
      course_id: a.course_id,
      course_title: a.courses?.title || "Course Session",
      title: a.title,
      instructions: a.instructions,
      due_date: a.due_date,
      max_points: a.max_points,
      created_at: a.created_at,
    }));
  });

// 6. Save Study Notes / Module Materials
const saveLessonNoteSchema = z.object({
  id: z.string().uuid().optional(),
  lesson_id: z.string().uuid(),
  title: z.string().trim().min(2, "Title is required"),
  content: z.string().default(""),
  file_url: z.string().url().optional().or(z.literal("")),
});

export const saveCompanyLessonNoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveLessonNoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error: lessonError } = await context.supabase.from("lessons").update({ content: data.content }).eq("id",data.lesson_id);
    if(lessonError)throw new Error(lessonError.message);
    if(data.file_url){const{error}=await context.supabase.from("learning_materials").insert({lesson_id:data.lesson_id,title:data.title,file_url:data.file_url,file_type:"document"});if(error)throw new Error(error.message);}
    const{error:noteError}=await context.supabase.from("lesson_notes").insert({lesson_id:data.lesson_id,author_id:context.userId,title:data.title,content:data.content,file_url:data.file_url||null});if(noteError)throw new Error(noteError.message);

    return { success: true, message: "Lesson notes and materials updated successfully." };
  });

// 7. Get Dedicated Company Profile
export const getCompanyProfileFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: unknown) =>
      z
        .object({
          institution_id: z.string().uuid().optional(),
        })
        .optional()
        .parse(input) || {},
  )
  .handler(async ({ data, context }): Promise<CompanySummary | null> => {
    let targetInstId = data?.institution_id;

    if (!targetInstId) {
      const { data: member } = await context.supabase
        .from("institution_memberships")
        .select("institution_id")
        .eq("user_id", context.userId)
        .eq("role", "institution_admin")
        .maybeSingle();

      targetInstId = member?.institution_id;
    }

    if (!targetInstId) return null;

    const { data: inst, error } = await context.supabase
      .from("institutions" as never)
      .select("id, name, code, contact_email, status, description, phone_number, avatar_url, address, created_at" as never)
      .eq("id" as never, targetInstId as never)
      .single();

    if (error || !inst) return null;

    // Course count
    const { count } = await context.supabase
      .from("courses" as never)
      .select("id" as never, { count: "exact", head: true })
      .eq("institution_id" as never, targetInstId)
      .eq("is_published" as never, true);

    return {
      ...(inst as unknown as CompanySummary),
      course_count: count || 0,
    };
  });

// 8. Update Dedicated Company Profile
const updateCompanyProfileSchema = z.object({
  institution_id: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().toUpperCase(),
  contact_email: z.string().trim().email(),
  phone_number: z.string().trim().optional(),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(200).optional(),
  avatar_url: z.string().url().optional().or(z.literal("")),
});

export const updateCompanyProfileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateCompanyProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const updatePayload: Record<string, unknown> = {
      name: data.name,
      code: data.code,
      contact_email: data.contact_email,
      updated_at: new Date().toISOString(),
    };
    if (data.phone_number !== undefined) updatePayload["phone_number"] = data.phone_number;
    if (data.description !== undefined) updatePayload["description"] = data.description;
    if (data.address !== undefined) updatePayload["address"] = data.address;
    if (data.avatar_url !== undefined) updatePayload["avatar_url"] = data.avatar_url || null;

    const { data: updated, error } = await context.supabase
      .from("institutions" as never)
      .update(updatePayload as never)
      .eq("id" as never, data.institution_id as never)
      .select("id" as never)
      .single();

    if (error || !updated) throw new Error(`Failed to update company profile: ${error?.message || "Company not found"}`);

    return { success: true, message: "Company profile updated successfully." };
  });

export const associateStudentWithCompanyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ institution_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("join_company_as_student", { _institution_id: data.institution_id });
    if (error) throw new Error(error.message);
    return { success: true };
  });
