DROP POLICY "Lesson read" ON public.lessons;
CREATE POLICY "Lesson read" ON public.lessons FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.modules m WHERE m.id=module_id AND public.can_learn_course(m.course_id)));
DROP POLICY "Lesson manage" ON public.lessons;
CREATE POLICY "Lesson manage" ON public.lessons FOR ALL TO authenticated USING(EXISTS(SELECT 1 FROM public.modules m WHERE m.id=module_id AND public.can_manage_course(m.course_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.modules m WHERE m.id=module_id AND public.can_manage_course(m.course_id)));