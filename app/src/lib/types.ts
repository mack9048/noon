import type { ContentKind } from '@/theme/tokens';

export type Role = 'guest' | 'student' | 'parent' | 'teacher' | 'admin' | 'super';

export interface User {
  id: number;
  name: string;
  role: Role;
  tenant_id: number | null;
  tenant_name?: string | null;
  board_id?: number | null;
  class_id?: number | null;
  avatar_initial?: string;
  /** Set while a super admin is signed in as this user ("Log in as"). */
  impersonated_by?: string;
}

export interface Board { id: number; code: string; name: string; meta?: string }
export interface SchoolClass { id: number; board_id: number; label: string; subjects_count: number }
export interface Subject { id: number; class_id: number; name: string; name_ar?: string; lessons_count: number }
export interface Lesson {
  id: number; subject_id: number; position: number; title: string;
  video_url?: string | null; video_duration?: string | null;
  audio_url?: string | null; audio_duration?: string | null;
  note_pdf_url?: string | null;
}
export interface SubjectDetail extends Subject {
  textbook_pdf_url?: string | null;
  board_name?: string; class_label?: string;
  lessons: Lesson[];
}

export interface Course {
  id: number; title: string; category: string; level: string; cover: string;
  status: 'draft' | 'published'; teacher_name?: string; lessons_count: number;
  progress?: number; is_free?: boolean; enrolled?: boolean; next_live_at?: string | null;
  /** Course logo uploaded when the course is created (shown on the Classroom card). */
  logo_url?: string | null;
}
export interface CourseItem {
  id: number; course_id: number; kind: ContentKind; title: string; meta?: string;
  url?: string | null; starts_at?: string | null; done?: boolean;
}
export interface CourseDetail extends Course { items: CourseItem[] }

export type ToolType = 'chart' | 'adkar' | 'slide' | 'form';
export interface StudyTool {
  id: number; type: ToolType; title: string; file_url?: string | null;
  is_new: boolean; status: 'draft' | 'live'; views?: number;
}

export interface LeaveRequest {
  id: number; type: string; start_date: string; end_date: string; reason?: string;
  status: 'pending' | 'approved' | 'rejected';
}
export interface LeaveSummary { total: number; used: number; remaining: number; requests: LeaveRequest[] }

export interface Conversation {
  id: number; title: string; kind: 'direct' | 'group' | 'office';
  role_label: string; last_message: string; last_at: string; unread: number;
}
export interface Message {
  id: number; conversation_id: number; mine: boolean; sender_name: string;
  kind: 'text' | 'voice' | 'file' | 'image'; body: string; created_at: string; seen?: boolean;
}

/* ---------- Learning spaces: a class subject or a Noon Course the student has ---------- */
export interface LearnSpace {
  key: string; // "subject-12" | "course-3"
  type: 'subject' | 'course'; id: number;
  title: string; title_ar?: string | null; subtitle: string; cover?: string | null;
}
export interface LearnMaterial { id: string; kind: 'live' | 'video' | 'audio' | 'pdf'; title: string; meta?: string | null; url?: string | null; item_id?: number }
export interface LearnAssessment {
  id: string; title: string; meta?: string | null; due_at?: string | null; max_marks?: number | null;
  status: 'upcoming' | 'awaiting' | 'marked' | 'open' | 'done'; marks?: number | null; item_id?: number;
}
export interface LearnResult { id: string; title: string; type: 'assessment' | 'exam'; marks: number; max_marks: number; percent: number; grade: string; remarks?: string | null; date: string }
export interface LearnDetail {
  space: LearnSpace;
  materials: LearnMaterial[];
  syllabus: { position: number; title: string; done: boolean }[];
  assessments: LearnAssessment[];
  exams: LearnAssessment[];
  results: LearnResult[];
  report: { student?: string | null; average: number | null; grade: string | null; count: number; exam_average: number | null; assessment_average: number | null };
}
