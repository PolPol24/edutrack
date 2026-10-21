<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function active_faculty_offering(PDO $pdo, int $offeringId, int $facultyId): array
{
    $statement = $pdo->prepare(
        'SELECT co.offering_id, c.course_code, c.course_title, co.section_code
         FROM course_offerings co
         JOIN courses c ON c.course_id = co.course_id
         JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
         WHERE co.offering_id = :offering_id
           AND co.faculty_user_id = :faculty_user_id
           AND co.offering_status = \'open\' AND c.course_status = \'active\'
         LIMIT 1'
    );
    $statement->execute([
        'offering_id' => $offeringId,
        'faculty_user_id' => $facultyId,
    ]);
    $offering = $statement->fetch();
    if (!$offering) {
        send_json(404, ['error' => 'That class is not assigned to your account in the active term.']);
    }

    return $offering;
}

function create_user_account(PDO $pdo, array $body, ?string $forcedRole = null): array
{
    $name = trim((string)($body['full_name'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $role = $forcedRole ?? strtolower(trim((string)($body['role'] ?? '')));
    $password = (string)($body['password'] ?? 'password');
    if ($name === '' || mb_strlen($name) > 160 || !filter_var($email, FILTER_VALIDATE_EMAIL)
        || !in_array($role, ['student', 'faculty', 'registrar', 'admin'], true)
        || strlen($password) < 8) {
        send_json(422, ['error' => 'Provide a valid name, email, role, and password of at least 8 characters.']);
    }

    $pdo->beginTransaction();
    $insert = $pdo->prepare(
        'INSERT INTO users (full_name, email, password_hash, role)
         VALUES (:full_name, :email, :password_hash, :role)'
    );
    $insert->execute([
        'full_name' => $name,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => $role,
    ]);
    $userId = (int)$pdo->lastInsertId();

    if ($role === 'student') {
        $programId = trim((string)($body['program_id'] ?? ''));
        if ($programId === '') {
            $programId = (string)$pdo->query("SELECT program_id FROM programs WHERE is_active = 1 ORDER BY FIELD(program_code, 'BSIS', 'BSCS', 'BSIT'), program_code LIMIT 1")->fetchColumn();
        }
        $yearLevel = filter_var($body['year_level'] ?? 1, FILTER_VALIDATE_INT);
        if (!$programId || !$yearLevel || $yearLevel < 1 || $yearLevel > 4) {
            $pdo->rollBack();
            send_json(422, ['error' => 'Select a valid academic program and a year level from 1 to 4.']);
        }
        $studentNumber = trim((string)($body['student_number'] ?? ''));
        if ($studentNumber === '') {
            do {
                $studentNumber = date('Y') . str_pad((string)random_int(0, 99999), 5, '0', STR_PAD_LEFT);
                $checkNumber = $pdo->prepare('SELECT 1 FROM student_profiles WHERE student_number = :student_number');
                $checkNumber->execute(['student_number' => $studentNumber]);
            } while ($checkNumber->fetchColumn());
        }
        $profile = $pdo->prepare(
            'INSERT INTO student_profiles (user_id, student_number, program_id, year_level)
             VALUES (:user_id, :student_number, :program_id, :year_level)'
        );
        $profile->execute([
            'user_id' => $userId,
            'student_number' => $studentNumber,
            'program_id' => $programId,
            'year_level' => $yearLevel,
        ]);
    } elseif (in_array($role, ['faculty', 'registrar'], true)) {
        $departmentId = filter_var($body['department_id'] ?? null, FILTER_VALIDATE_INT) ?: null;
        $employeeNumber = trim((string)($body['employee_number'] ?? ''));
        if ($employeeNumber === '') {
            $employeeNumber = strtoupper(substr($role, 0, 3)) . '-' . str_pad((string)$userId, 6, '0', STR_PAD_LEFT);
        }
        $profile = $pdo->prepare(
            'INSERT INTO employee_profiles (user_id, employee_number, department_id, office)
             VALUES (:user_id, :employee_number, :department_id, :office)'
        );
        $profile->execute([
            'user_id' => $userId,
            'employee_number' => $employeeNumber,
            'department_id' => $departmentId,
            'office' => trim((string)($body['office'] ?? '')) ?: null,
        ]);
    }

    $pdo->commit();
    return ['user_id' => $userId, 'full_name' => $name, 'email' => $email, 'role' => $role, 'account_status' => 'active'];
}

try {
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    $pdo = database();

    if ($action === 'login') {
        request_method('POST');
        $body = request_body();
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
            send_json(422, ['error' => 'Enter a valid email address and password.']);
        }

        $statement = $pdo->prepare(
            'SELECT user_id, full_name, email, password_hash, role
             FROM users
             WHERE email = :email AND account_status = \'active\'
             LIMIT 1'
        );
        $statement->execute(['email' => $email]);
        $account = $statement->fetch();

        if (!$account || !password_verify($password, $account['password_hash'])) {
            send_json(401, ['error' => 'We couldn’t find a matching account. Check your email and password and try again.']);
        }

        session_regenerate_id(true);
        $_SESSION['edutrack_user'] = [
            'user_id' => (int)$account['user_id'],
            'full_name' => $account['full_name'],
            'email' => $account['email'],
            'role' => $account['role'],
        ];

        $update = $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE user_id = :user_id');
        $update->execute(['user_id' => $account['user_id']]);

        send_json(200, ['user' => $_SESSION['edutrack_user']]);
    }

    if ($action === 'me') {
        request_method('GET');
        send_json(200, ['user' => require_user()]);
    }

    if ($action === 'logout') {
        request_method('POST');
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $cookie = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 42000,
                'path' => $cookie['path'],
                'domain' => $cookie['domain'],
                'secure' => $cookie['secure'],
                'httponly' => $cookie['httponly'],
                'samesite' => $cookie['samesite'] ?? 'Lax',
            ]);
        }
        session_destroy();
        send_json(200, ['message' => 'Signed out.']);
    }

    if ($action === 'profile') {
        $user = require_user();
        if ($method === 'GET') {
            $statement = $pdo->prepare(
                'SELECT u.user_id, u.full_name, u.email, u.phone, u.address, u.role,
                        sp.student_number, sp.year_level, sp.student_status,
                        p.program_code, p.program_name, d.department_name,
                        ep.employee_number, ep.office, ep.hire_date
                 FROM users u
                 LEFT JOIN student_profiles sp ON sp.user_id = u.user_id
                 LEFT JOIN programs p ON p.program_id = sp.program_id
                 LEFT JOIN employee_profiles ep ON ep.user_id = u.user_id
                 LEFT JOIN departments d ON d.department_id = ep.department_id
                 WHERE u.user_id = :user_id'
            );
            $statement->execute(['user_id' => $user['user_id']]);
            send_json(200, ['profile' => $statement->fetch()]);
        }
        if ($method === 'PATCH') {
            $body = request_body();
            $name = trim((string)($body['full_name'] ?? ''));
            $email = strtolower(trim((string)($body['email'] ?? '')));
            $phone = trim((string)($body['phone'] ?? ''));
            $address = trim((string)($body['address'] ?? ''));
            $office = trim((string)($body['office'] ?? ''));
            if ($name === '' || mb_strlen($name) > 160 || !filter_var($email, FILTER_VALIDATE_EMAIL)
                || strlen($email) > 254 || strlen($phone) > 40 || strlen($address) > 255 || strlen($office) > 160) {
                send_json(422, ['error' => 'Check the name, email, and contact field lengths.']);
            }
            $update = $pdo->prepare(
                'UPDATE users SET full_name = :full_name, email = :email, phone = :phone, address = :address
                 WHERE user_id = :user_id'
            );
            $update->execute([
                'full_name' => $name, 'email' => $email,
                'phone' => $phone !== '' ? $phone : null,
                'address' => $address !== '' ? $address : null,
                'user_id' => $user['user_id'],
            ]);
            if (in_array($user['role'], ['faculty', 'registrar'], true)) {
                $staff = $pdo->prepare('UPDATE employee_profiles SET office = :office WHERE user_id = :user_id');
                $staff->execute(['office' => $office !== '' ? $office : null, 'user_id' => $user['user_id']]);
            }
            $_SESSION['edutrack_user']['full_name'] = $name;
            $_SESSION['edutrack_user']['email'] = $email;
            send_json(200, ['message' => 'Profile changes were saved.', 'user' => $_SESSION['edutrack_user']]);
        }
        request_method('GET');
    }

    if ($action === 'student_courses') {
        request_method('GET');
        $user = require_user('student');
        $statement = $pdo->prepare(
            'SELECT e.enrollment_id, c.course_code, c.course_title, c.units,
                    co.section_code, faculty.full_name AS instructor,
                    GROUP_CONCAT(DISTINCT CONCAT(
                      UPPER(LEFT(cm.day_of_week, 1)), LOWER(SUBSTRING(cm.day_of_week, 2)),
                      \' \', TIME_FORMAT(cm.start_time, \'%h:%i %p\'), \'–\', TIME_FORMAT(cm.end_time, \'%h:%i %p\')
                    ) ORDER BY cm.day_of_week SEPARATOR \' · \') AS schedule,
                    GROUP_CONCAT(DISTINCT cm.room ORDER BY cm.day_of_week SEPARATOR \' · \') AS room,
                    COALESCE(grade_summary.numeric_grade, fg.numeric_grade) AS numeric_grade,
                    grade_summary.quiz_grade, grade_summary.project_grade, grade_summary.exam_grade,
                    fg.letter_grade, fg.grade_points
             FROM enrollments e
             JOIN course_offerings co ON co.offering_id = e.offering_id
             JOIN courses c ON c.course_id = co.course_id
             JOIN student_profiles sp ON sp.user_id = e.student_user_id
             JOIN programs p ON p.program_id = sp.program_id
             JOIN program_courses pc ON pc.program_id = sp.program_id
               AND pc.course_id = c.course_id AND pc.recommended_year = sp.year_level
             JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
             LEFT JOIN users faculty ON faculty.user_id = co.faculty_user_id
             LEFT JOIN class_meetings cm ON cm.offering_id = co.offering_id
             LEFT JOIN final_grades fg ON fg.enrollment_id = e.enrollment_id
             LEFT JOIN (
               SELECT score.enrollment_id,
                      ROUND(AVG(score.score / assessment.max_score * 100), 2) AS numeric_grade,
                      ROUND(MAX(CASE WHEN assessment.assessment_name = \'Quiz\'
                        THEN score.score / assessment.max_score * 100 END), 2) AS quiz_grade,
                      ROUND(MAX(CASE WHEN assessment.assessment_name = \'Project\'
                        THEN score.score / assessment.max_score * 100 END), 2) AS project_grade,
                      ROUND(MAX(CASE WHEN assessment.assessment_name = \'Exam\'
                        THEN score.score / assessment.max_score * 100 END), 2) AS exam_grade
               FROM assessment_scores score
               JOIN assessments assessment ON assessment.assessment_id = score.assessment_id
               WHERE score.score IS NOT NULL
               GROUP BY score.enrollment_id
             ) grade_summary ON grade_summary.enrollment_id = e.enrollment_id
             WHERE e.student_user_id = :student_user_id AND e.enrollment_status = \'approved\'
               AND co.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
             GROUP BY e.enrollment_id, c.course_code, c.course_title, c.units,
                      co.section_code, faculty.full_name, fg.numeric_grade, grade_summary.numeric_grade,
                      grade_summary.quiz_grade, grade_summary.project_grade, grade_summary.exam_grade,
                      fg.letter_grade, fg.grade_points
             ORDER BY c.course_code'
        );
        $statement->execute(['student_user_id' => $user['user_id']]);
        send_json(200, ['courses' => $statement->fetchAll()]);
    }

    if ($action === 'student_attendance') {
        request_method('GET');
        $user = require_user('student');
        $statement = $pdo->prepare(
            'SELECT sess.session_date,
                    COALESCE(NULLIF(TIME_FORMAT(sess.start_time, \'%h:%i %p\'), \'12:00 AM\'),
                      (SELECT TIME_FORMAT(cm.start_time, \'%h:%i %p\') FROM class_meetings cm
                       WHERE cm.offering_id = co.offering_id ORDER BY cm.meeting_id LIMIT 1)) AS class_time,
                    c.course_code, ar.attendance_status
             FROM attendance_records ar
             JOIN attendance_sessions sess ON sess.attendance_session_id = ar.attendance_session_id
             JOIN enrollments e ON e.enrollment_id = ar.enrollment_id
             JOIN course_offerings co ON co.offering_id = e.offering_id
             JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
             JOIN courses c ON c.course_id = co.course_id
             JOIN student_profiles sp ON sp.user_id = e.student_user_id
             JOIN programs p ON p.program_id = sp.program_id
             JOIN program_courses pc ON pc.program_id = sp.program_id
               AND pc.course_id = c.course_id AND pc.recommended_year = sp.year_level
             WHERE e.student_user_id = :student_user_id AND e.enrollment_status = \'approved\'
               AND co.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
               AND ar.attendance_status <> \'unmarked\'
             ORDER BY sess.session_date DESC, sess.start_time DESC'
        );
        $statement->execute(['student_user_id' => $user['user_id']]);
        send_json(200, ['records' => $statement->fetchAll()]);
    }

    if ($action === 'registrar_students') {
        if ($method === 'POST') {
            require_user('registrar');
            $created = create_user_account($pdo, request_body(), 'student');
            send_json(201, ['message' => 'Student account created. Its initial password is the one entered in the form.', 'user' => $created]);
        }
        request_method('GET');
        require_user('registrar');
        $statement = $pdo->query(
            'SELECT u.user_id, u.full_name, u.email, sp.student_number, sp.year_level,
                    sp.student_status, p.program_name,
                    COALESCE(SUM(CASE WHEN e.enrollment_status = \'approved\' THEN c.units ELSE 0 END), 0) AS units
             FROM student_profiles sp JOIN users u ON u.user_id = sp.user_id
             JOIN programs p ON p.program_id = sp.program_id
             LEFT JOIN enrollments e ON e.student_user_id = sp.user_id
             LEFT JOIN course_offerings co ON co.offering_id = e.offering_id
             LEFT JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
             LEFT JOIN courses c ON c.course_id = co.course_id AND t.term_id IS NOT NULL
             GROUP BY u.user_id, u.full_name, u.email, sp.student_number,
                      sp.year_level, sp.student_status, p.program_name
             ORDER BY u.full_name'
        );
        $programs = $pdo->query('SELECT program_id, program_name FROM programs WHERE is_active = 1 ORDER BY program_name')->fetchAll();
        send_json(200, ['students' => $statement->fetchAll(), 'programs' => $programs]);
    }

    if ($action === 'admin_users') {
        $admin = require_user('admin');
        if ($method === 'GET') {
            $statement = $pdo->query(
                'SELECT u.user_id, u.full_name, u.email, u.role, u.account_status, u.created_at,
                        COALESCE(sp.student_number, ep.employee_number, CONCAT(\'USR-\', LPAD(u.user_id, 5, \'0\'))) AS account_number
                 FROM users u LEFT JOIN student_profiles sp ON sp.user_id = u.user_id
                 LEFT JOIN employee_profiles ep ON ep.user_id = u.user_id
                 ORDER BY u.created_at DESC, u.user_id DESC'
            );
            send_json(200, ['users' => $statement->fetchAll()]);
        }
        if ($method === 'POST') {
            $created = create_user_account($pdo, request_body());
            send_json(201, ['message' => 'Account created. Its initial password is the one entered in the form.', 'user' => $created]);
        }
        if ($method === 'PATCH') {
            $body = request_body();
            $userId = filter_var($body['user_id'] ?? null, FILTER_VALIDATE_INT);
            $status = (string)($body['account_status'] ?? '');
            if (!$userId || !in_array($status, ['active', 'suspended'], true)) {
                send_json(422, ['error' => 'Select a valid user and account status.']);
            }
            if ((int)$userId === (int)$admin['user_id'] && $status !== 'active') {
                send_json(409, ['error' => 'You cannot suspend the account you are currently using.']);
            }
            $update = $pdo->prepare('UPDATE users SET account_status = :status WHERE user_id = :user_id');
            $update->execute(['status' => $status, 'user_id' => $userId]);
            if ($update->rowCount() !== 1) {
                send_json(404, ['error' => 'That account was not found.']);
            }
            send_json(200, ['message' => 'Account status was updated.']);
        }
        request_method('GET');
    }

    if ($action === 'admin_courses') {
        require_user('admin');
        if ($method === 'GET') {
            $statement = $pdo->query(
                'SELECT c.course_id, c.course_code, c.course_title, c.units, c.course_status,
                        COALESCE(GROUP_CONCAT(DISTINCT p.program_name ORDER BY p.program_name SEPARATOR \', \'), d.department_name, \'General Education\') AS program,
                        COALESCE(GROUP_CONCAT(DISTINCT faculty.full_name ORDER BY faculty.full_name SEPARATOR \', \'), \'Unassigned\') AS instructor
                 FROM courses c
                 LEFT JOIN departments d ON d.department_id = c.department_id
                 LEFT JOIN program_courses pc ON pc.course_id = c.course_id
                 LEFT JOIN programs p ON p.program_id = pc.program_id
                 LEFT JOIN course_offerings co ON co.course_id = c.course_id
                 LEFT JOIN users faculty ON faculty.user_id = co.faculty_user_id
                 GROUP BY c.course_id, c.course_code, c.course_title, c.units, c.course_status, d.department_name
                 ORDER BY c.course_code'
            );
            $programs = $pdo->query('SELECT program_id, program_name FROM programs WHERE is_active = 1 ORDER BY program_name')->fetchAll();
            send_json(200, ['courses' => $statement->fetchAll(), 'programs' => $programs]);
        }
        if ($method === 'POST') {
            $body = request_body();
            $code = strtoupper(trim((string)($body['course_code'] ?? '')));
            $title = trim((string)($body['course_title'] ?? ''));
            $units = filter_var($body['units'] ?? null, FILTER_VALIDATE_INT);
            $programId = trim((string)($body['program_id'] ?? ''));
            preg_match('/^([A-Z])[A-Z]*\s*(\d+)$/', $code, $courseIdParts);
            $courseId = $courseIdParts
                ? $courseIdParts[1] . '-' . str_pad($courseIdParts[2], 2, '0', STR_PAD_LEFT)
                : '';
            $program = $pdo->prepare('SELECT program_id, department_id FROM programs WHERE program_id = :program_id AND is_active = 1');
            $program->execute(['program_id' => $programId]);
            $programRow = $program->fetch();
            if ($code === '' || strlen($code) > 20 || $courseId === '' || strlen($title) > 180 || $title === ''
                || !$units || $units < 1 || $units > 6 || !$programRow) {
                send_json(422, ['error' => 'Provide a valid course code, title, units, and program.']);
            }
            $pdo->beginTransaction();
            $insert = $pdo->prepare(
                'INSERT INTO courses (course_id, course_code, course_title, units, department_id)
                 VALUES (:course_id, :course_code, :course_title, :units, :department_id)'
            );
            $insert->execute([
                'course_id' => $courseId,
                'course_code' => $code, 'course_title' => $title,
                'units' => $units, 'department_id' => $programRow['department_id'],
            ]);
            $link = $pdo->prepare('INSERT INTO program_courses (program_id, course_id) VALUES (:program_id, :course_id)');
            $link->execute(['program_id' => $programRow['program_id'], 'course_id' => $courseId]);
            $pdo->commit();
            send_json(201, ['message' => 'Course was added.', 'course_id' => $courseId]);
        }
        if ($method === 'PATCH') {
            $body = request_body();
            $courseId = trim((string)($body['course_id'] ?? ''));
            $status = (string)($body['course_status'] ?? '');
            if ($courseId === '' || !in_array($status, ['active', 'inactive'], true)) {
                send_json(422, ['error' => 'Select a valid course and status.']);
            }
            $update = $pdo->prepare('UPDATE courses SET course_status = :status WHERE course_id = :course_id');
            $update->execute(['status' => $status, 'course_id' => $courseId]);
            if ($update->rowCount() !== 1) {
                send_json(404, ['error' => 'That course was not found.']);
            }
            send_json(200, ['message' => 'Course status was updated.']);
        }
        request_method('GET');
    }

    if ($action === 'admin_settings') {
        $admin = require_user('admin');
        $keys = [
            'institution_name', 'academic_year_label', 'email_notifications',
            'two_factor_required_for_admins', 'session_timeout_minutes', 'maintenance_mode',
        ];
        if ($method === 'GET') {
            $statement = $pdo->prepare('SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN (\'institution_name\', \'academic_year_label\', \'email_notifications\', \'two_factor_required_for_admins\', \'session_timeout_minutes\', \'maintenance_mode\')');
            $statement->execute();
            $settings = [];
            foreach ($statement->fetchAll() as $row) {
                $settings[$row['setting_key']] = json_decode($row['setting_value'], true);
            }
            $settings['institution_name'] ??= 'EduTrack University';
            $settings['academic_year_label'] ??= (string)$pdo->query('SELECT year_label FROM academic_years WHERE is_current = 1 LIMIT 1')->fetchColumn();
            $settings['email_notifications'] ??= true;
            $settings['two_factor_required_for_admins'] ??= true;
            $settings['session_timeout_minutes'] ??= 30;
            $settings['maintenance_mode'] ??= false;
            send_json(200, ['settings' => $settings]);
        }
        if ($method === 'PUT') {
            $body = request_body();
            $institution = trim((string)($body['institution_name'] ?? ''));
            $yearLabel = trim((string)($body['academic_year_label'] ?? ''));
            $timeout = filter_var($body['session_timeout_minutes'] ?? null, FILTER_VALIDATE_INT);
            if ($institution === '' || strlen($institution) > 160 || !preg_match('/^\d{4}-\d{4}$/', $yearLabel)
                || !in_array($timeout, [15, 30, 60, 0], true)) {
                send_json(422, ['error' => 'Provide a valid institution name, academic year, and session timeout.']);
            }
            $settings = [
                'institution_name' => $institution,
                'academic_year_label' => $yearLabel,
                'email_notifications' => (bool)($body['email_notifications'] ?? false),
                'two_factor_required_for_admins' => (bool)($body['two_factor_required_for_admins'] ?? false),
                'session_timeout_minutes' => $timeout,
                'maintenance_mode' => (bool)($body['maintenance_mode'] ?? false),
            ];
            $save = $pdo->prepare(
                'INSERT INTO system_settings (setting_key, setting_value, updated_by_user_id)
                 VALUES (:setting_key, :setting_value, :updated_by_user_id)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value),
                   updated_by_user_id = VALUES(updated_by_user_id)'
            );
            foreach ($settings as $key => $value) {
                $save->execute([
                    'setting_key' => $key,
                    'setting_value' => json_encode($value, JSON_THROW_ON_ERROR),
                    'updated_by_user_id' => $admin['user_id'],
                ]);
            }
            send_json(200, ['message' => 'System settings were saved.', 'settings' => $settings]);
        }
        request_method('GET');
    }

    if ($action === 'reports') {
        $viewer = require_user();
        if ($method === 'GET') {
            $type = (string)($_GET['type'] ?? 'enrollments');
            if (!in_array($type, ['enrollments', 'students', 'users'], true)) {
                send_json(422, ['error' => 'Choose a supported report type.']);
            }
            if ($type === 'users') {
                require_user('admin');
                $rows = $pdo->query('SELECT user_id, full_name, email, role, account_status, created_at FROM users ORDER BY created_at DESC')->fetchAll();
            } elseif ($type === 'students') {
                if (!in_array($viewer['role'], ['registrar', 'admin'], true)) {
                    send_json(403, ['error' => 'This report requires a registrar or admin account.']);
                }
                $statement = $pdo->query(
                    'SELECT sp.student_number, u.full_name, u.email, p.program_name, sp.year_level, sp.student_status
                     FROM student_profiles sp JOIN users u ON u.user_id = sp.user_id
                     JOIN programs p ON p.program_id = sp.program_id ORDER BY u.full_name'
                );
                $rows = $statement->fetchAll();
            } else {
                if (!in_array($viewer['role'], ['registrar', 'admin'], true)) {
                    send_json(403, ['error' => 'This report requires a registrar or admin account.']);
                }
                $statement = $pdo->query(
                    'SELECT e.request_code, u.full_name AS student, sp.student_number,
                            c.course_code, c.course_title, c.units, e.enrollment_status, e.requested_at
                     FROM enrollments e JOIN users u ON u.user_id = e.student_user_id
                     JOIN student_profiles sp ON sp.user_id = u.user_id
                     JOIN course_offerings co ON co.offering_id = e.offering_id
                     JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
                     JOIN courses c ON c.course_id = co.course_id ORDER BY e.requested_at DESC'
                );
                $rows = $statement->fetchAll();
            }
            send_json(200, ['rows' => $rows]);
        }
        request_method('GET');
    }

    if ($action === 'courses') {
        request_method('GET');
        $user = require_user('student');

        $statement = $pdo->prepare(
            'SELECT co.offering_id, c.course_code, c.course_title, c.units,
                    co.section_code, COALESCE(u.full_name, \'Unassigned\') AS instructor
             FROM course_offerings co
             JOIN courses c ON c.course_id = co.course_id
             JOIN student_profiles sp ON sp.user_id = :student_user_id
             JOIN programs p ON p.program_id = sp.program_id
             JOIN program_courses pc ON pc.program_id = sp.program_id
               AND pc.course_id = c.course_id AND pc.recommended_year = sp.year_level
             JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
             LEFT JOIN users u ON u.user_id = co.faculty_user_id
             WHERE co.offering_status = \'open\' AND c.course_status = \'active\'
               AND co.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
               AND (
                 NOT EXISTS (
                   SELECT 1
                   FROM enrollments assigned
                   JOIN course_offerings assigned_offering ON assigned_offering.offering_id = assigned.offering_id
                   JOIN academic_terms assigned_term ON assigned_term.term_id = assigned_offering.term_id
                     AND assigned_term.term_status = \'active\'
                   WHERE assigned.student_user_id = sp.user_id
                     AND assigned.enrollment_status IN (\'pending\', \'approved\')
                     AND assigned_offering.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
                 )
                 OR co.section_code = (
                   SELECT assigned_offering.section_code
                   FROM enrollments assigned
                   JOIN course_offerings assigned_offering ON assigned_offering.offering_id = assigned.offering_id
                   JOIN academic_terms assigned_term ON assigned_term.term_id = assigned_offering.term_id
                     AND assigned_term.term_status = \'active\'
                   WHERE assigned.student_user_id = sp.user_id
                     AND assigned.enrollment_status IN (\'pending\', \'approved\')
                     AND assigned_offering.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
                   GROUP BY assigned_offering.section_code
                   ORDER BY COUNT(*) DESC, assigned_offering.section_code
                   LIMIT 1
                 )
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM enrollments existing
                 JOIN course_offerings existing_offering ON existing_offering.offering_id = existing.offering_id
                 WHERE existing.student_user_id = sp.user_id
                   AND existing_offering.course_id = c.course_id
                   AND existing_offering.term_id = co.term_id
                   AND existing.enrollment_status <> \'cancelled\'
               )
             ORDER BY c.course_code, co.section_code'
        );
        $statement->execute(['student_user_id' => $user['user_id']]);

        send_json(200, ['courses' => $statement->fetchAll()]);
    }

    if ($action === 'enrollments') {
        $user = require_user('student');

        if ($method === 'GET') {
            $statement = $pdo->prepare(
                'SELECT e.enrollment_id, e.request_code, e.offering_id,
                        c.course_code, c.course_title, c.units, co.section_code, e.enrollment_status,
                        e.requested_at, e.decision_note
                 FROM enrollments e
                 JOIN course_offerings co ON co.offering_id = e.offering_id
                 JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
                 JOIN courses c ON c.course_id = co.course_id
                 JOIN student_profiles sp ON sp.user_id = e.student_user_id
                 JOIN programs p ON p.program_id = sp.program_id
                 JOIN program_courses pc ON pc.program_id = sp.program_id
                   AND pc.course_id = c.course_id AND pc.recommended_year = sp.year_level
                 WHERE e.student_user_id = :student_user_id
                   AND e.enrollment_status <> \'cancelled\'
                   AND co.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
                 ORDER BY e.requested_at DESC'
            );
            $statement->execute(['student_user_id' => $user['user_id']]);
            send_json(200, ['enrollments' => $statement->fetchAll()]);
        }

        if ($method === 'POST') {
            $body = request_body();
            $offeringId = filter_var($body['offering_id'] ?? null, FILTER_VALIDATE_INT);
            if (!$offeringId || $offeringId < 1) {
                send_json(422, ['error' => 'Select a valid course offering.']);
            }

            $pdo->beginTransaction();
            $offering = $pdo->prepare(
                'SELECT co.offering_id, co.capacity, c.course_code
                 FROM course_offerings co
                 JOIN courses c ON c.course_id = co.course_id
                 JOIN student_profiles sp ON sp.user_id = :student_user_id
                 JOIN programs p ON p.program_id = sp.program_id
                 JOIN program_courses pc ON pc.program_id = sp.program_id
                   AND pc.course_id = c.course_id AND pc.recommended_year = sp.year_level
                 JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
                 WHERE co.offering_id = :offering_id
                   AND co.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
                   AND (
                     NOT EXISTS (
                       SELECT 1
                       FROM enrollments assigned
                       JOIN course_offerings assigned_offering ON assigned_offering.offering_id = assigned.offering_id
                       JOIN academic_terms assigned_term ON assigned_term.term_id = assigned_offering.term_id
                         AND assigned_term.term_status = \'active\'
                       WHERE assigned.student_user_id = sp.user_id
                         AND assigned.enrollment_status IN (\'pending\', \'approved\')
                         AND assigned_offering.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
                     )
                     OR co.section_code = (
                       SELECT assigned_offering.section_code
                       FROM enrollments assigned
                       JOIN course_offerings assigned_offering ON assigned_offering.offering_id = assigned.offering_id
                       JOIN academic_terms assigned_term ON assigned_term.term_id = assigned_offering.term_id
                         AND assigned_term.term_status = \'active\'
                       WHERE assigned.student_user_id = sp.user_id
                         AND assigned.enrollment_status IN (\'pending\', \'approved\')
                         AND assigned_offering.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
                       GROUP BY assigned_offering.section_code
                       ORDER BY COUNT(*) DESC, assigned_offering.section_code
                       LIMIT 1
                     )
                   )
                   AND co.offering_status = \'open\' AND c.course_status = \'active\'
                 FOR UPDATE'
            );
            $offering->execute(['offering_id' => $offeringId, 'student_user_id' => $user['user_id']]);
            $available = $offering->fetch();

            if (!$available) {
                $pdo->rollBack();
                send_json(404, ['error' => 'That course offering is no longer available.']);
            }

            $countEnrolled = $pdo->prepare(
                'SELECT COUNT(*) FROM enrollments
                 WHERE offering_id = :offering_id
                   AND enrollment_status IN (\'pending\', \'approved\')'
            );
            $countEnrolled->execute(['offering_id' => $offeringId]);
            if ((int)$countEnrolled->fetchColumn() >= (int)$available['capacity']) {
                $pdo->rollBack();
                send_json(409, ['error' => 'That course section has reached its capacity.']);
            }

            $duplicate = $pdo->prepare(
                'SELECT enrollment_id, enrollment_status FROM enrollments
                 WHERE student_user_id = :student_user_id AND offering_id = :offering_id
                 LIMIT 1'
            );
            $duplicate->execute([
                'student_user_id' => $user['user_id'],
                'offering_id' => $offeringId,
            ]);
            $existingEnrollment = $duplicate->fetch();
            if ($existingEnrollment && in_array($existingEnrollment['enrollment_status'], ['cancelled', 'rejected'], true)) {
                $restore = $pdo->prepare(
                    'UPDATE enrollments
                     SET enrollment_status = \'pending\', requested_at = NOW(),
                         reviewed_by_user_id = NULL, reviewed_at = NULL, decision_note = NULL
                     WHERE enrollment_id = :enrollment_id
                       AND enrollment_status IN (\'cancelled\', \'rejected\')'
                );
                $restore->execute(['enrollment_id' => $existingEnrollment['enrollment_id']]);
                $pdo->commit();

                send_json(200, [
                    'message' => $available['course_code'] . ' was submitted again for registrar approval.',
                    'enrollment_id' => (int)$existingEnrollment['enrollment_id'],
                ]);
            }

            if ($existingEnrollment) {
                $pdo->rollBack();
                send_json(409, ['error' => 'You already have an enrollment request for this section.']);
            }

            $insert = $pdo->prepare(
                'INSERT INTO enrollments (request_code, student_user_id, offering_id)
                 VALUES (:request_code, :student_user_id, :offering_id)'
            );
            $courseCode = (string)$available['course_code'];
            preg_match('/(\d+)\s*$/', $courseCode, $courseNumberMatch);
            $courseNumber = $courseNumberMatch[1] ?? '';
            if ($courseNumber === '') {
                throw new RuntimeException('The selected course does not have a numeric course code.');
            }
            $requestDate = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
            $requestPrefix = 'REQ-' . $requestDate->format('dmy') . $courseNumber;
            $requestCode = $requestPrefix;
            $suffix = 1;
            $checkRequest = $pdo->prepare('SELECT 1 FROM enrollments WHERE request_code = :request_code');
            do {
                $checkRequest->execute(['request_code' => $requestCode]);
                if (!$checkRequest->fetchColumn()) {
                    break;
                }
                $requestCode = $requestPrefix . '-' . str_pad((string)++$suffix, 2, '0', STR_PAD_LEFT);
            } while (true);
            $insert->execute([
                'request_code' => $requestCode,
                'student_user_id' => $user['user_id'],
                'offering_id' => $offeringId,
            ]);
            $enrollmentId = (int)$pdo->lastInsertId();
            $pdo->commit();

            send_json(201, [
                'message' => $available['course_code'] . ' was submitted for registrar approval.',
                'enrollment_id' => $enrollmentId,
            ]);
        }

        if ($method === 'DELETE') {
            $body = request_body();
            $requestCode = trim((string)($body['request_code'] ?? ''));
            if ($requestCode === '') {
                send_json(422, ['error' => 'A valid enrollment request code is required.']);
            }

            $cancel = $pdo->prepare(
                'UPDATE enrollments
                 SET enrollment_status = \'cancelled\'
                 WHERE request_code = :request_code
                   AND student_user_id = :student_user_id
                   AND enrollment_status = \'pending\''
            );
            $cancel->execute([
                'request_code' => $requestCode,
                'student_user_id' => $user['user_id'],
            ]);

            if ($cancel->rowCount() !== 1) {
                send_json(409, ['error' => 'Only your pending enrollment requests can be cancelled.']);
            }

            send_json(200, ['message' => 'Enrollment request cancelled.']);
        }

        request_method('GET');
    }

    if ($action === 'approvals') {
        $user = require_user('registrar');

        if ($method === 'GET') {
            $statement = $pdo->query(
                'SELECT e.request_code, e.enrollment_status, e.requested_at,
                        e.decision_note, e.offering_id, s.student_number,
                        student.full_name AS student_name, p.program_name,
                        c.course_code, c.course_title, c.units
                 FROM enrollments e
                 JOIN student_profiles s ON s.user_id = e.student_user_id
                 JOIN users student ON student.user_id = s.user_id
                 JOIN programs p ON p.program_id = s.program_id
                 JOIN course_offerings co ON co.offering_id = e.offering_id
                 JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
                 JOIN courses c ON c.course_id = co.course_id
                 WHERE e.enrollment_status <> \'cancelled\'
                 ORDER BY e.requested_at DESC'
            );
            send_json(200, ['requests' => $statement->fetchAll()]);
        }

        if ($method === 'PATCH') {
            $body = request_body();
            $requestCode = trim((string)($body['request_code'] ?? ''));
            $status = (string)($body['status'] ?? '');
            $note = trim((string)($body['decision_note'] ?? ''));

            if ($requestCode === '' || !in_array($status, ['approved', 'rejected'], true)) {
                send_json(422, ['error' => 'Provide a request code and an approved or rejected decision.']);
            }

            $update = $pdo->prepare(
                'UPDATE enrollments e
                 JOIN course_offerings co ON co.offering_id = e.offering_id
                 JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
                 SET e.enrollment_status = :status, e.reviewed_by_user_id = :reviewer,
                     e.reviewed_at = NOW(), e.decision_note = :decision_note
                 WHERE e.request_code = :request_code AND e.enrollment_status = \'pending\''
            );
            $update->execute([
                'status' => $status,
                'reviewer' => $user['user_id'],
                'decision_note' => $note !== '' ? $note : null,
                'request_code' => $requestCode,
            ]);

            if ($update->rowCount() !== 1) {
                send_json(409, ['error' => 'That request is not pending or no longer exists.']);
            }

            send_json(200, ['message' => "Request {$requestCode} was {$status}."]);
        }

        request_method('GET');
    }

    if ($action === 'faculty_classes') {
        request_method('GET');
        $user = require_user('faculty');
        $statement = $pdo->prepare(
            'SELECT co.offering_id, c.course_code, c.course_title, co.section_code,
                    co.capacity, COUNT(DISTINCT e.enrollment_id) AS student_count,
                    GROUP_CONCAT(
                      DISTINCT CONCAT(
                        UPPER(LEFT(cm.day_of_week, 1)), LOWER(SUBSTRING(cm.day_of_week, 2)),
                        \' \', TIME_FORMAT(cm.start_time, \'%h:%i %p\'),
                        \'–\', TIME_FORMAT(cm.end_time, \'%h:%i %p\'),
                        COALESCE(CONCAT(\' · \', cm.room), \'\')
                      ) ORDER BY cm.day_of_week SEPARATOR \', \'
                    ) AS schedule
             FROM course_offerings co
             JOIN courses c ON c.course_id = co.course_id
             JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
             LEFT JOIN enrollments e ON e.offering_id = co.offering_id
               AND e.enrollment_status = \'approved\'
             LEFT JOIN class_meetings cm ON cm.offering_id = co.offering_id
             WHERE co.faculty_user_id = :faculty_user_id
               AND co.offering_status = \'open\' AND c.course_status = \'active\'
             GROUP BY co.offering_id, c.course_code, c.course_title, co.section_code, co.capacity
             ORDER BY c.course_code, co.section_code'
        );
        $statement->execute(['faculty_user_id' => $user['user_id']]);
        send_json(200, ['classes' => $statement->fetchAll()]);
    }

    if ($action === 'faculty_grades') {
        $user = require_user('faculty');
        if ($method === 'GET') {
            $offeringId = filter_var($_GET['offering_id'] ?? null, FILTER_VALIDATE_INT);
            if (!$offeringId || $offeringId < 1) {
                send_json(422, ['error' => 'Select a valid class.']);
            }
            $offering = active_faculty_offering($pdo, $offeringId, $user['user_id']);
            $statement = $pdo->prepare(
                'SELECT e.enrollment_id, s.student_number, student.full_name AS student_name,
                        a.assessment_name, a.max_score, score.score
                 FROM enrollments e
                 JOIN student_profiles s ON s.user_id = e.student_user_id
                 JOIN users student ON student.user_id = s.user_id
                 LEFT JOIN assessments a ON a.offering_id = e.offering_id
                 LEFT JOIN assessment_scores score
                   ON score.assessment_id = a.assessment_id
                  AND score.enrollment_id = e.enrollment_id
                  AND score.offering_id = e.offering_id
                 WHERE e.offering_id = :offering_id
                   AND e.enrollment_status = \'approved\'
                 ORDER BY student.full_name, a.assessment_id'
            );
            $statement->execute(['offering_id' => $offeringId]);
            send_json(200, ['class' => $offering, 'grades' => $statement->fetchAll()]);
        }

        if ($method === 'PUT') {
            $body = request_body();
            $offeringId = filter_var($body['offering_id'] ?? null, FILTER_VALIDATE_INT);
            $rows = $body['grades'] ?? null;
            if (!$offeringId || $offeringId < 1 || !is_array($rows)) {
                send_json(422, ['error' => 'Provide a valid class and grade entries.']);
            }
            active_faculty_offering($pdo, $offeringId, $user['user_id']);

            $pdo->beginTransaction();
            $ensureAssessment = $pdo->prepare(
                'INSERT INTO assessments (offering_id, assessment_name, max_score, weight_percent)
                 VALUES (:offering_id, :assessment_name, 100, 0)
                 ON DUPLICATE KEY UPDATE assessment_id = assessment_id'
            );
            foreach (['Quiz', 'Project', 'Exam'] as $name) {
                $ensureAssessment->execute([
                    'offering_id' => $offeringId,
                    'assessment_name' => $name,
                ]);
            }

            $assessmentsQuery = $pdo->prepare(
                'SELECT assessment_id, assessment_name, max_score
                 FROM assessments WHERE offering_id = :offering_id'
            );
            $assessmentsQuery->execute(['offering_id' => $offeringId]);
            $assessments = [];
            foreach ($assessmentsQuery->fetchAll() as $assessment) {
                $assessments[$assessment['assessment_name']] = $assessment;
            }
            $assessmentNames = ['Quiz', 'Project', 'Exam'];
            foreach ($assessmentNames as $name) {
                if (!isset($assessments[$name])) {
                    $pdo->rollBack();
                    send_json(409, ['error' => 'This class is missing a required grade category. Contact an administrator.']);
                }
            }

            $enrollmentQuery = $pdo->prepare(
                'SELECT enrollment_id FROM enrollments
                 WHERE enrollment_status = \'approved\' AND offering_id = :offering_id
                 FOR UPDATE'
            );
            $enrollmentQuery->execute(['offering_id' => $offeringId]);
            $validEnrollmentIds = array_map('intval', $enrollmentQuery->fetchAll(PDO::FETCH_COLUMN));
            $providedEnrollmentIds = [];
            foreach ($rows as $row) {
                if (!is_array($row)) {
                    $pdo->rollBack();
                    send_json(422, ['error' => 'Each grade entry must be an object.']);
                }
                $enrollmentId = filter_var($row['enrollment_id'] ?? null, FILTER_VALIDATE_INT);
                if (!$enrollmentId || !in_array((int)$enrollmentId, $validEnrollmentIds, true)) {
                    $pdo->rollBack();
                    send_json(403, ['error' => 'A grade entry does not belong to an approved student in your class.']);
                }
                if (in_array((int)$enrollmentId, $providedEnrollmentIds, true)) {
                    $pdo->rollBack();
                    send_json(422, ['error' => 'Duplicate student grade entries are not allowed.']);
                }
                $providedEnrollmentIds[] = (int)$enrollmentId;
                foreach ($assessmentNames as $name) {
                    $score = $row[$name] ?? null;
                    if ($score !== null && (!is_numeric($score) || (float)$score < 0 || (float)$score > (float)$assessments[$name]['max_score'])) {
                        $pdo->rollBack();
                        send_json(422, ['error' => $name . ' scores must be between 0 and ' . $assessments[$name]['max_score'] . '.']);
                    }
                }
            }

            sort($validEnrollmentIds);
            sort($providedEnrollmentIds);
            if ($validEnrollmentIds !== $providedEnrollmentIds) {
                $pdo->rollBack();
                send_json(422, ['error' => 'Submit a grade row for every approved student in this class.']);
            }

            $saveScore = $pdo->prepare(
                'INSERT INTO assessment_scores
                   (assessment_id, enrollment_id, offering_id, score, graded_by_user_id, graded_at)
                 VALUES (:assessment_id, :enrollment_id, :offering_id, :score, :grader, NOW())
                 ON DUPLICATE KEY UPDATE score = VALUES(score),
                   graded_by_user_id = VALUES(graded_by_user_id), graded_at = VALUES(graded_at)'
            );
            foreach ($rows as $row) {
                foreach ($assessmentNames as $name) {
                    $saveScore->execute([
                        'assessment_id' => $assessments[$name]['assessment_id'],
                        'enrollment_id' => (int)$row['enrollment_id'],
                        'offering_id' => $offeringId,
                        'score' => ($row[$name] ?? null) === '' ? null : ($row[$name] ?? null),
                        'grader' => $user['user_id'],
                    ]);
                }
            }
            $pdo->commit();
            send_json(200, ['message' => 'Grades were saved.']);
        }

        request_method('GET');
    }

    if ($action === 'faculty_attendance') {
        $user = require_user('faculty');
        if ($method === 'GET' || $method === 'PUT') {
            $body = $method === 'PUT' ? request_body() : [];
            $offeringId = filter_var(
                $method === 'PUT' ? ($body['offering_id'] ?? null) : ($_GET['offering_id'] ?? null),
                FILTER_VALIDATE_INT
            );
            $sessionDate = (string)($method === 'PUT' ? ($body['session_date'] ?? '') : ($_GET['session_date'] ?? ''));
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $sessionDate);
            if (!$offeringId || $offeringId < 1 || !$date || $date->format('Y-m-d') !== $sessionDate) {
                send_json(422, ['error' => 'Provide a valid class and session date.']);
            }
            $offering = active_faculty_offering($pdo, $offeringId, $user['user_id']);

            if ($method === 'GET') {
                $statement = $pdo->prepare(
                    'SELECT e.enrollment_id, s.student_number, student.full_name AS student_name,
                            COALESCE(ar.attendance_status, \'unmarked\') AS attendance_status
                     FROM enrollments e
                     JOIN student_profiles s ON s.user_id = e.student_user_id
                     JOIN users student ON student.user_id = s.user_id
                     LEFT JOIN attendance_sessions session
                       ON session.offering_id = e.offering_id AND session.session_date = :session_date
                     LEFT JOIN attendance_records ar
                       ON ar.attendance_session_id = session.attendance_session_id
                      AND ar.enrollment_id = e.enrollment_id
                      AND ar.offering_id = e.offering_id
                     WHERE e.offering_id = :offering_id
                       AND e.enrollment_status = \'approved\'
                     ORDER BY student.full_name'
                );
                $statement->execute([
                    'session_date' => $sessionDate,
                    'offering_id' => $offeringId,
                ]);
                send_json(200, ['class' => $offering, 'session_date' => $sessionDate, 'students' => $statement->fetchAll()]);
            }

            $rows = $body['students'] ?? null;
            if (!is_array($rows)) {
                send_json(422, ['error' => 'Provide attendance status for each student in the class.']);
            }
            $allowedStatuses = ['present', 'late', 'absent', 'unmarked'];
            $pdo->beginTransaction();
            $enrollmentQuery = $pdo->prepare(
                'SELECT enrollment_id FROM enrollments
                 WHERE enrollment_status = \'approved\' AND offering_id = :offering_id
                 FOR UPDATE'
            );
            $enrollmentQuery->execute(['offering_id' => $offeringId]);
            $validEnrollmentIds = array_map('intval', $enrollmentQuery->fetchAll(PDO::FETCH_COLUMN));
            $providedEnrollmentIds = [];
            foreach ($rows as $row) {
                if (!is_array($row)) {
                    $pdo->rollBack();
                    send_json(422, ['error' => 'Each attendance entry must be an object.']);
                }
                $enrollmentId = filter_var($row['enrollment_id'] ?? null, FILTER_VALIDATE_INT);
                $status = $row['status'] ?? null;
                if (!$enrollmentId || !in_array((int)$enrollmentId, $validEnrollmentIds, true) || !in_array($status, $allowedStatuses, true)) {
                    $pdo->rollBack();
                    send_json(422, ['error' => 'Attendance entries must reference class students and use a valid status.']);
                }
                if (in_array((int)$enrollmentId, $providedEnrollmentIds, true)) {
                    $pdo->rollBack();
                    send_json(422, ['error' => 'Duplicate attendance entries are not allowed.']);
                }
                $providedEnrollmentIds[] = (int)$enrollmentId;
            }
            sort($validEnrollmentIds);
            sort($providedEnrollmentIds);
            if ($validEnrollmentIds !== $providedEnrollmentIds) {
                $pdo->rollBack();
                send_json(422, ['error' => 'Submit attendance for every approved student in this class.']);
            }

            $sessionQuery = $pdo->prepare(
                'INSERT INTO attendance_sessions
                   (offering_id, session_date, start_time, taken_by_user_id)
                 VALUES (:offering_id, :session_date, \'00:00:00\', :faculty_user_id)
                 ON DUPLICATE KEY UPDATE
                   attendance_session_id = LAST_INSERT_ID(attendance_session_id),
                   taken_by_user_id = VALUES(taken_by_user_id)'
            );
            $sessionQuery->execute([
                'offering_id' => $offeringId,
                'session_date' => $sessionDate,
                'faculty_user_id' => $user['user_id'],
            ]);
            $sessionId = (int)$pdo->lastInsertId();
            $saveRecord = $pdo->prepare(
                'INSERT INTO attendance_records
                   (attendance_session_id, enrollment_id, offering_id, attendance_status, marked_at)
                 VALUES (:session_id, :enrollment_id, :offering_id, :status,
                     IF(:status_for_date = \'unmarked\', NULL, NOW()))
                 ON DUPLICATE KEY UPDATE attendance_status = VALUES(attendance_status),
                   marked_at = VALUES(marked_at)'
            );
            foreach ($rows as $row) {
                $saveRecord->execute([
                    'session_id' => $sessionId,
                    'enrollment_id' => (int)$row['enrollment_id'],
                    'offering_id' => $offeringId,
                    'status' => $row['status'],
                    'status_for_date' => $row['status'],
                ]);
            }
            $pdo->commit();
            send_json(200, ['message' => 'Attendance was saved.']);
        }

        request_method('GET');
    }

    send_json(404, ['error' => 'Unknown API action.']);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    handle_api_error($error);
}
