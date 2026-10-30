-- These tables had no write path in the student, registrar, or admin workflows.
-- Drop dependent attendance rows before sessions, then remove class schedules.
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS attendance_sessions;
DROP TABLE IF EXISTS class_meetings;
