/** Supabase Database type definitions */

export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'waitlisted' | 'cancelled';
export type AdminRole = 'super_admin' | 'reviewer' | 'volunteer';
export type EmailStatus = 'queued' | 'sent' | 'failed';
export type CheckinMethod = 'qr_scan' | 'manual_search' | 'walk_in';

export interface Registration {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  role: string;
  org: string;
  course: string | null;
  year: string | null;
  id_number: string | null;
  linkedin: string | null;
  github: string | null;
  experience: string;
  interests: string[];
  why_attend: string;
  build_goal: string;
  heard_from: string;
  id_card_path: string | null;
  status: RegistrationStatus;
  reject_reason: string | null;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  ticket_code: string | null;
  qr_secret: string | null;
  created_at: string;
  updated_at: string;
}

export interface Checkin {
  id: string;
  registration_id: string;
  checked_in_at: string;
  checked_in_by: string;
  method: CheckinMethod;
}

export interface Admin {
  id: string;
  user_id: string;
  role: AdminRole;
  display_name: string | null;
  created_at: string;
}

export interface EmailQueue {
  id: string;
  to_email: string;
  template: string;
  variables: Record<string, string>;
  status: EmailStatus;
  attempts: number;
  scheduled_for: string;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}

/** Supabase-generated Database type for the client */
export interface Database {
  public: {
    Tables: {
      registrations: {
        Row: Registration;
        Insert: Omit<Registration, 'id' | 'created_at' | 'updated_at' | 'status' | 'ticket_code' | 'qr_secret' | 'reject_reason' | 'reviewer_id' | 'reviewer_note' | 'reviewed_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          status?: RegistrationStatus;
          ticket_code?: string | null;
          qr_secret?: string | null;
          reject_reason?: string | null;
          reviewer_id?: string | null;
          reviewer_note?: string | null;
          reviewed_at?: string | null;
        };
        Update: Partial<Registration>;
      };
      checkins: {
        Row: Checkin;
        Insert: Omit<Checkin, 'id'> & { id?: string };
        Update: Partial<Checkin>;
      };
      admins: {
        Row: Admin;
        Insert: Omit<Admin, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Admin>;
      };
      email_queue: {
        Row: EmailQueue;
        Insert: Omit<EmailQueue, 'id' | 'created_at' | 'status' | 'attempts' | 'sent_at' | 'error'> & {
          id?: string;
          created_at?: string;
          status?: EmailStatus;
          attempts?: number;
          sent_at?: string | null;
          error?: string | null;
        };
        Update: Partial<EmailQueue>;
      };
      audit_log: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<AuditLog>;
      };
      settings: {
        Row: Setting;
        Insert: Setting;
        Update: Partial<Setting>;
      };
    };
    Functions: {
      approve_registration: {
        Args: { reg_id: string; reviewer_note?: string };
        Returns: { success: boolean; ticket_code: string };
      };
      reject_registration: {
        Args: { reg_id: string; reason: string; reviewer_note?: string };
        Returns: { success: boolean };
      };
      waitlist_registration: {
        Args: { reg_id: string; reviewer_note?: string };
        Returns: { success: boolean };
      };
      cancel_registration: {
        Args: { reg_id: string };
        Returns: { success: boolean };
      };
      get_admin_role: {
        Args: { uid: string };
        Returns: AdminRole | null;
      };
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: {
          total: number;
          pending: number;
          approved: number;
          rejected: number;
          waitlisted: number;
          checked_in: number;
          cancelled: number;
          capacity: number;
          emails_sent_today: number;
          email_daily_limit: number;
        };
      };
    };
  };
}
