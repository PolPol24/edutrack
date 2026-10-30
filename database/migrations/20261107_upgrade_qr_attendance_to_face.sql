-- Upgrade databases that previously applied the dynamic QR attendance schema.
-- Safe to run after 20261105_face_recognition_attendance.sql on both old and new databases.
DELIMITER //
CREATE PROCEDURE upgrade_face_attendance_schema()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'attendance_settings' AND column_name = 'face_similarity_threshold'
  ) THEN
    ALTER TABLE attendance_settings ADD COLUMN face_similarity_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.50;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'attendance_settings' AND column_name = 'face_quality_threshold'
  ) THEN
    ALTER TABLE attendance_settings ADD COLUMN face_quality_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.60;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'attendance_records' AND column_name = 'verification_method'
  ) THEN
    ALTER TABLE attendance_records
      ADD COLUMN verification_method ENUM('face', 'staff_verified', 'system') NOT NULL DEFAULT 'system' AFTER attendance_status;
  END IF;
END//
DELIMITER ;

CALL upgrade_face_attendance_schema();
DROP PROCEDURE upgrade_face_attendance_schema;
DROP TABLE IF EXISTS attendance_qr_tokens;
