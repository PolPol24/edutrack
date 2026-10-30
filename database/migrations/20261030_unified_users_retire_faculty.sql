USE edutrack_db;

ALTER TABLE users
  ADD COLUMN student_number VARCHAR(30) NULL,
  ADD COLUMN first_name VARCHAR(80) NULL,
  ADD COLUMN last_name VARCHAR(80) NULL,
  ADD COLUMN name_suffix VARCHAR(20) NULL,
  ADD COLUMN date_of_birth DATE NULL,
  ADD COLUMN program_id VARCHAR(10) NULL,
  ADD COLUMN year_level TINYINT UNSIGNED NULL,
  ADD COLUMN student_status ENUM('active', 'on_leave', 'graduated', 'withdrawn') NULL,
  ADD COLUMN employee_number VARCHAR(30) NULL,
  ADD COLUMN department_id BIGINT UNSIGNED NULL,
  ADD COLUMN office VARCHAR(160) NULL,
  ADD COLUMN hire_date DATE NULL;

ALTER TABLE assessment_scores
  ADD COLUMN graded_by_name VARCHAR(160) NULL;
ALTER TABLE final_grades
  ADD COLUMN entered_by_name VARCHAR(160) NULL;
ALTER TABLE attendance_sessions
  ADD COLUMN taken_by_name VARCHAR(160) NULL;

UPDATE users u
JOIN student_profiles sp ON sp.user_id = u.user_id
SET u.student_number = sp.student_number,
    u.first_name = sp.first_name,
    u.last_name = sp.last_name,
    u.name_suffix = sp.name_suffix,
    u.date_of_birth = sp.date_of_birth,
    u.program_id = sp.program_id,
    u.year_level = sp.year_level,
    u.student_status = sp.student_status;

UPDATE users u
JOIN employee_profiles ep ON ep.user_id = u.user_id
SET u.employee_number = ep.employee_number,
    u.department_id = ep.department_id,
    u.office = ep.office,
    u.hire_date = ep.hire_date;

ALTER TABLE users
  ADD UNIQUE KEY uq_users_student_number (student_number),
  ADD UNIQUE KEY uq_users_employee_number (employee_number),
  ADD KEY ix_users_program_status (program_id, student_status),
  ADD KEY ix_users_department (department_id),
  ADD CONSTRAINT chk_users_year_level CHECK (year_level IS NULL OR year_level BETWEEN 1 AND 4),
  ADD CONSTRAINT fk_users_program
    FOREIGN KEY (program_id) REFERENCES programs (program_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  ADD CONSTRAINT fk_users_department
    FOREIGN KEY (department_id) REFERENCES departments (department_id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE users
  MODIFY role ENUM('student', 'faculty', 'instructor', 'registrar', 'admin') NOT NULL;

UPDATE users
SET role = 'instructor'
WHERE role = 'faculty';

ALTER TABLE users
  MODIFY role ENUM('student', 'instructor', 'registrar', 'admin') NOT NULL;

UPDATE assessment_scores s
JOIN users u ON u.user_id = s.graded_by_user_id
SET s.graded_by_name = u.full_name
WHERE s.graded_by_name IS NULL;

UPDATE final_grades g
JOIN users u ON u.user_id = g.entered_by_user_id
SET g.entered_by_name = u.full_name
WHERE g.entered_by_name IS NULL;

UPDATE attendance_sessions a
JOIN users u ON u.user_id = a.taken_by_user_id
SET a.taken_by_name = u.full_name
WHERE a.taken_by_name IS NULL;

UPDATE student_registration_requests r
JOIN users u ON u.user_id = r.reviewed_by_user_id
SET r.reviewed_by_user_id = NULL
WHERE u.role = 'instructor';

UPDATE student_registration_requests r
JOIN users u ON u.user_id = r.created_user_id
SET r.created_user_id = NULL
WHERE u.role = 'instructor';

UPDATE student_section_assignments a
JOIN users u ON u.user_id = a.assigned_by_user_id
SET a.assigned_by_user_id = NULL
WHERE u.role = 'instructor';

UPDATE enrollments e
JOIN users u ON u.user_id = e.reviewed_by_user_id
SET e.reviewed_by_user_id = NULL
WHERE u.role = 'instructor';

UPDATE assessment_scores s
JOIN users u ON u.user_id = s.graded_by_user_id
SET s.graded_by_name = u.full_name, s.graded_by_user_id = NULL
WHERE u.role = 'instructor';

UPDATE final_grades g
JOIN users u ON u.user_id = g.entered_by_user_id
SET g.entered_by_name = u.full_name, g.entered_by_user_id = NULL
WHERE u.role = 'instructor';

UPDATE attendance_sessions a
JOIN users u ON u.user_id = a.taken_by_user_id
SET a.taken_by_name = u.full_name, a.taken_by_user_id = NULL
WHERE u.role = 'instructor';

UPDATE system_settings s
JOIN users u ON u.user_id = s.updated_by_user_id
SET s.updated_by_user_id = NULL
WHERE u.role = 'instructor';

DROP VIEW IF EXISTS enrolled_students_by_course;
DROP VIEW IF EXISTS users_student_table;
DROP VIEW IF EXISTS users_faculty_table;
DROP VIEW IF EXISTS users_instructor_table;
DROP VIEW IF EXISTS users_registrar_table;
DROP VIEW IF EXISTS users_admin_table;

ALTER TABLE course_offerings
  ADD COLUMN instructor_name VARCHAR(160) NULL;

UPDATE course_offerings co
JOIN users u ON u.user_id = co.faculty_user_id
SET co.instructor_name = u.full_name;

ALTER TABLE course_offerings
  DROP FOREIGN KEY fk_offerings_faculty,
  DROP INDEX ix_offerings_faculty_term,
  DROP COLUMN faculty_user_id;

ALTER TABLE student_section_assignments
  DROP FOREIGN KEY fk_student_section_student;
ALTER TABLE enrollments
  DROP FOREIGN KEY fk_enrollments_student;

ALTER TABLE student_section_assignments
  ADD CONSTRAINT fk_student_section_student
    FOREIGN KEY (student_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE enrollments
  ADD CONSTRAINT fk_enrollments_student
    FOREIGN KEY (student_user_id) REFERENCES users (user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

DROP TABLE employee_profiles;
DROP TABLE student_profiles;

DELETE FROM users WHERE role = 'instructor';

ALTER TABLE users
  MODIFY role ENUM('student', 'registrar', 'admin') NOT NULL;

CREATE OR REPLACE SQL SECURITY INVOKER VIEW student_profiles AS
SELECT user_id, student_number, first_name, last_name, name_suffix, date_of_birth,
  program_id, year_level, student_status, created_at, updated_at
FROM users
WHERE role = 'student';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW employee_profiles AS
SELECT user_id, employee_number, department_id, office, hire_date
FROM users
WHERE role IN ('registrar', 'admin');

CREATE OR REPLACE VIEW enrolled_students_by_course AS
SELECT u.student_number,
  u.full_name AS student_name,
  c.course_code,
  c.course_title,
  co.section_code,
  ay.year_label AS academic_year,
  t.term_name,
  'enrolled' AS enrollment_status,
  e.requested_at,
  e.reviewed_at
FROM enrollments e
JOIN users u ON u.user_id = e.student_user_id AND u.role = 'student'
JOIN course_offerings co ON co.offering_id = e.offering_id
JOIN courses c ON c.course_id = co.course_id
JOIN academic_terms t ON t.term_id = co.term_id
JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
WHERE e.enrollment_status = 'approved'
  AND t.term_status = 'active';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW users_student_table AS
SELECT u.user_id, u.student_number, u.full_name, u.email,
  p.program_id, p.program_code, p.program_name, u.year_level,
  u.student_status, u.account_status, u.created_at
FROM users u
LEFT JOIN programs p ON p.program_id = u.program_id
WHERE u.role = 'student';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW users_registrar_table AS
SELECT u.user_id, u.employee_number, u.full_name, u.email,
  d.department_code, d.department_name, u.office, u.hire_date,
  u.account_status, u.created_at
FROM users u
LEFT JOIN departments d ON d.department_id = u.department_id
WHERE u.role = 'registrar';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW users_admin_table AS
SELECT u.user_id, u.employee_number, u.full_name, u.email,
  d.department_code, d.department_name, u.office, u.hire_date,
  u.account_status, u.created_at
FROM users u
LEFT JOIN departments d ON d.department_id = u.department_id
WHERE u.role = 'admin';
