/*
 * =============================================================================
 * LEARNFLOW - Learning Management System
 * =============================================================================
 *
 * PROBLEM DEFINITION:
 * Build a multi-role learning platform where:
 * - Admin manages Trainers and CRM users
 * - Trainers create courses and manage Candidates
 * - CRM users create courses and manage Other (staff) users
 * - Candidates/Others consume assigned learning content
 *
 * ARCHITECTURE:
 * - Role hierarchy: Admin > Trainer/CRM > Candidate/Other
 * - Content hierarchy: Index > Course > Section > Lecture
 * - Assignment: By individual course OR entire index
 * - Isolation: Trainers/CRMs cannot see each other's content
 *
 * COMPLEXITY ANALYSIS:
 * - User operations: O(1) with UUID lookups
 * - Content queries: O(n) where n = user's assigned content
 * - Progress tracking: O(1) per lecture, O(n) for aggregations
 * - Dashboard analytics: O(n) with proper indexing on created_by
 *
 * =============================================================================
 */

// User roles in the system
export type UserRole = 'admin' | 'trainer' | 'crm' | 'candidate' | 'other';

// Base user structure
export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  created_by: string | null; // null for admin
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User without sensitive data
export interface SafeUser {
  id: string;
  username: string;
  role: UserRole;
  full_name: string;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
}

// Index - top-level content category (Setup, Training, etc.)
export interface Index {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Course - under an index
export interface Course {
  id: string;
  index_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Section - under a course
export interface Section {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Lecture - under a section
export interface Lecture {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  youtube_url: string | null;
  order_index: number;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

// Downloadable file attached to lecture
export interface LectureFile {
  id: string;
  lecture_id: string;
  file_name: string;
  file_url: string | null;
  storage_path?: string | null;
  file_size: number;
  file_type: string;
  created_at: string;
}

// Course assignment to user
export interface CourseAssignment {
  id: string;
  user_id: string;
  course_id: string;
  assigned_by: string;
  assigned_at: string;
}

// Index assignment to user (assigns all courses under index)
export interface IndexAssignment {
  id: string;
  user_id: string;
  index_id: string;
  assigned_by: string;
  assigned_at: string;
}

// Progress tracking per lecture
export interface LectureProgress {
  id: string;
  user_id: string;
  lecture_id: string;
  time_spent_seconds: number;
  is_completed: boolean;
  last_watched_at: string | null;
  completed_at: string | null;
}

// User session for login tracking
export interface UserSession {
  id: string;
  user_id: string;
  login_at: string;
  logout_at: string | null;
  ip_address: string | null;
}

// Activity log for admin dashboard
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// File download tracking
export interface FileDownload {
  id: string;
  user_id: string;
  file_id: string;
  downloaded_at: string;
}

// =============================================================================
// COMPOSITE TYPES - For UI display with joined data
// =============================================================================

export interface CourseWithDetails extends Course {
  index_name: string;
  section_count: number;
  lecture_count: number;
  total_duration: number;
}

export interface LectureWithFiles extends Lecture {
  files: LectureFile[];
}

export interface SectionWithLectures extends Section {
  lectures: LectureWithFiles[];
}

export interface CourseWithContent extends Course {
  index_name: string;
  sections: SectionWithLectures[];
}

export interface UserWithProgress extends SafeUser {
  total_courses_assigned: number;
  courses_completed: number;
  lectures_completed: number;
  total_time_spent: number;
  last_active: string | null;
}

export interface TrainerStats {
  id: string;
  full_name: string;
  username: string;
  total_candidates: number;
  total_indexes: number;
  total_courses: number;
  total_lectures: number;
  last_active: string | null;
  is_active: boolean;
}

export interface CRMStats {
  id: string;
  full_name: string;
  username: string;
  total_others: number;
  total_indexes: number;
  total_courses: number;
  total_lectures: number;
  last_active: string | null;
  is_active: boolean;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: SafeUser;
  error?: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface CreateIndexRequest {
  name: string;
  description?: string;
}

export interface CreateCourseRequest {
  index_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
}

export interface CreateSectionRequest {
  course_id: string;
  title: string;
  order_index: number;
}

export interface CreateLectureRequest {
  section_id: string;
  title: string;
  description?: string;
  youtube_url?: string;
  order_index: number;
  duration_seconds?: number;
}

export interface AssignCourseRequest {
  user_ids: string[];
  course_id: string;
}

export interface AssignIndexRequest {
  user_ids: string[];
  index_id: string;
}

export interface BulkCreateUsersRequest {
  users: {
    username: string;
    password: string;
    full_name: string;
  }[];
  role: 'candidate' | 'other';
}

export interface UpdateProgressRequest {
  lecture_id: string;
  time_spent_seconds: number;
  is_completed?: boolean;
}

// =============================================================================
// DASHBOARD METRICS
// =============================================================================

export interface AdminDashboardMetrics {
  total_trainers: number;
  total_crm: number;
  total_candidates: number;
  total_others: number;
  total_courses: number;
  total_active_users: number;
  recent_activities: ActivityLog[];
  trainers: TrainerStats[];
  crms: CRMStats[];
}

export interface TrainerDashboardMetrics {
  total_candidates: number;
  total_indexes: number;
  total_courses: number;
  total_lectures: number;
  total_assignments: number;
  avg_completion_rate: number;
  candidates: UserWithProgress[];
  recent_activities: ActivityLog[];
}

export interface CRMDashboardMetrics {
  total_others: number;
  total_indexes: number;
  total_courses: number;
  total_lectures: number;
  total_assignments: number;
  avg_completion_rate: number;
  others: UserWithProgress[];
  recent_activities: ActivityLog[];
}

export interface LearnerDashboardMetrics {
  total_courses: number;
  completed_courses: number;
  total_lectures: number;
  completed_lectures: number;
  total_time_spent: number;
  current_streak: number;
  assigned_courses: CourseWithDetails[];
}
