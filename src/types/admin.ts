export type MemberType = "student" | "GRADUATING" | "alumni";
export type SemesterType = "Fall" | "Spring" | "Year";

export const EVENT_TYPES = [
  "Social",
  "Professional Development",
  "GBody",
  "Service",
  "Other"
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface AdminEvent {
  id: number;
  name: string;
  date: string;
  event_type: EventType;
  points_value: number;
  is_open: boolean;
  google_form_url: string;
  school_year: string;
}

export interface Member {
  id: number;
  net_id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  graduation_semester: string | null;
  email: string;
  personal_email: string | null;
  member_type: MemberType;
  major: string | null;
  points_total?: number;
  attendance_history?: Array<{
    event_id: number;
    event_name: string;
    event_date: string | null;
    points_awarded: number;
    checked_in_at: string | null;
  }>;
}

export interface OfficerRole {
  id: number;
  member_id: number;
  role: string;
  school_year: string;
  semester: SemesterType;
  member?: {
    first_name: string;
    last_name: string;
    net_id: string;
  };
}
