-- Run these in the Supabase SQL editor for performance.
CREATE INDEX IF NOT EXISTS idx_members_net_id ON members(net_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_year ON attendance(school_year);
CREATE INDEX IF NOT EXISTS idx_events_school_year ON events(school_year);
CREATE INDEX IF NOT EXISTS idx_officer_roles_member_id ON officer_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_officer_roles_school_year ON officer_roles(school_year);
