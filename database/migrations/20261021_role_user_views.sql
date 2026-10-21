-- Role-specific, table-like views over the normalized user and profile tables.
-- Account data stays canonical in users/student_profiles/employee_profiles.
CREATE OR REPLACE SQL SECURITY INVOKER VIEW student_table AS
SELECT
  u.user_id,
  sp.student_number,
  u.full_name,
  u.email,
  p.program_id,
  p.program_code,
  p.program_name,
  sp.year_level,
  sp.student_status,
  u.account_status,
  u.created_at
FROM users u
LEFT JOIN student_profiles sp ON sp.user_id = u.user_id
LEFT JOIN programs p ON p.program_id = sp.program_id
WHERE u.role = 'student';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW faculty_table AS
SELECT
  u.user_id,
  ep.employee_number,
  u.full_name,
  u.email,
  d.department_code,
  d.department_name,
  ep.office,
  ep.hire_date,
  u.account_status,
  u.created_at
FROM users u
LEFT JOIN employee_profiles ep ON ep.user_id = u.user_id
LEFT JOIN departments d ON d.department_id = ep.department_id
WHERE u.role = 'faculty';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW registrar_table AS
SELECT
  u.user_id,
  ep.employee_number,
  u.full_name,
  u.email,
  d.department_code,
  d.department_name,
  ep.office,
  ep.hire_date,
  u.account_status,
  u.created_at
FROM users u
LEFT JOIN employee_profiles ep ON ep.user_id = u.user_id
LEFT JOIN departments d ON d.department_id = ep.department_id
WHERE u.role = 'registrar';

CREATE OR REPLACE SQL SECURITY INVOKER VIEW admin_table AS
SELECT
  u.user_id,
  ep.employee_number,
  u.full_name,
  u.email,
  d.department_code,
  d.department_name,
  ep.office,
  ep.hire_date,
  u.account_status,
  u.created_at
FROM users u
LEFT JOIN employee_profiles ep ON ep.user_id = u.user_id
LEFT JOIN departments d ON d.department_id = ep.department_id
WHERE u.role = 'admin';
