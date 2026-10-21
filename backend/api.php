<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function active_faculty_offering(PDO $pdo, int $offeringId, int $facultyId): array
{
    $statement = $pdo->prepare(
        'SELECT co.offering_id, c.course_code, c.course_title, co.section_code
         FROM course_offerings co
         JOIN courses c ON c.course_id = co.course_id
         JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status IN (\'active\', \'upcoming\')
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
        send_json(404, ['error' => 'That class is not assigned to your account in an active or upcoming term.']);
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

    if ($action === 'student_registrations') {
        if ($method === 'POST') {
            $body = request_body();
            $studentNumber = trim((string)($body['student_number'] ?? ''));
            $firstName = trim((string)($body['first_name'] ?? ''));
            $lastName = trim((string)($body['last_name'] ?? ''));
            $suffix = trim((string)($body['suffix'] ?? ''));
            $dateOfBirth = trim((string)($body['date_of_birth'] ?? ''));
            $email = strtolower(trim((string)($body['email'] ?? '')));
            $password = (string)($body['password'] ?? '');
            $birthDate = DateTimeImmutable::createFromFormat('!Y-m-d', $dateOfBirth);
            $birthDateErrors = DateTimeImmutable::getLastErrors();

            if ($studentNumber === '' || mb_strlen($studentNumber) > 30
                || $firstName === '' || mb_strlen($firstName) > 80
                || $lastName === '' || mb_strlen($lastName) > 80
                || mb_strlen($suffix) > 20
                || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254
                || strlen($password) < 8
                || !$birthDate || ($birthDateErrors !== false && ($birthDateErrors['warning_count'] || $birthDateErrors['error_count']))
                || $birthDate->format('Y-m-d') !== $dateOfBirth
                || $birthDate > new DateTimeImmutable('today')) {
                send_json(422, ['error' => 'Check the required fields. Use a valid student number, name, past date of birth, email, and a password of at least 8 characters.']);
            }

            $pdo->beginTransaction();
            $duplicate = $pdo->prepare(
                'SELECT 1 FROM users WHERE email = :email
                 UNION ALL
                 SELECT 1 FROM student_profiles WHERE student_number = :student_number
                 UNION ALL
                 SELECT 1 FROM student_registration_requests
                   WHERE request_status = \'pending\'
                     AND (student_number = :pending_number OR email = :pending_email)
                 LIMIT 1'
            );
            $duplicate->execute([
                'email' => $email,
                'student_number' => $studentNumber,
                'pending_number' => $studentNumber,
                'pending_email' => $email,
            ]);
            if ($duplicate->fetchColumn()) {
                $pdo->rollBack();
                send_json(409, ['error' => 'That email address or student number is already registered or has a pending request.']);
            }

            $insert = $pdo->prepare(
                'INSERT INTO student_registration_requests
                   (student_number, first_name, last_name, name_suffix, date_of_birth, email, password_hash)
                 VALUES (:student_number, :first_name, :last_name, :name_suffix, :date_of_birth, :email, :password_hash)'
            );
            $insert->execute([
                'student_number' => $studentNumber,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name_suffix' => $suffix !== '' ? $suffix : null,
                'date_of_birth' => $dateOfBirth,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            ]);
            $requestId = (int)$pdo->lastInsertId();
            $pdo->commit();
            send_json(201, [
                'message' => 'Registration request submitted. You can sign in after the registrar approves it.',
                'request_id' => $requestId,
            ]);
        }

        $registrar = require_user('registrar');
        if ($method === 'GET') {
            $requests = $pdo->query(
                'SELECT r.request_id, r.student_number, r.first_name, r.last_name, r.name_suffix,
                        r.date_of_birth, r.email, r.request_status, r.created_at, r.reviewed_at,
                        roster.first_name AS roster_first_name, roster.last_name AS roster_last_name,
                        roster.student_email AS roster_student_email,
                        roster.name_suffix AS roster_name_suffix, roster.date_of_birth AS roster_date_of_birth,
                        roster.program_id AS roster_program_id, programs.program_code AS roster_program_code,
                        programs.program_name AS roster_program_name, roster.year_level AS roster_year_level,
                        CASE WHEN roster.student_number IS NOT NULL
                          AND LOWER(TRIM(r.first_name)) = LOWER(TRIM(roster.first_name))
                          AND LOWER(TRIM(r.last_name)) = LOWER(TRIM(roster.last_name))
                          AND LOWER(TRIM(COALESCE(r.name_suffix, \'\'))) = LOWER(TRIM(COALESCE(roster.name_suffix, \'\')))
                          AND r.date_of_birth = roster.date_of_birth THEN 1 ELSE 0 END AS roster_identity_match
                 FROM student_registration_requests r
                 LEFT JOIN campus_student_registry roster ON roster.student_number = r.student_number
                 LEFT JOIN programs ON programs.program_id = roster.program_id
                 ORDER BY CASE r.request_status WHEN \'pending\' THEN 0 ELSE 1 END, r.created_at DESC'
            )->fetchAll();
            send_json(200, ['requests' => $requests]);
        }

        if ($method === 'PATCH') {
            $body = request_body();
            $requestId = filter_var($body['request_id'] ?? null, FILTER_VALIDATE_INT);
            $status = (string)($body['status'] ?? '');
            if (!$requestId || !in_array($status, ['approved', 'rejected'], true)) {
                send_json(422, ['error' => 'Provide a registration request and an approved or rejected decision.']);
            }
            $pdo->beginTransaction();
            $requestQuery = $pdo->prepare(
                'SELECT r.request_id, r.student_number, r.first_name, r.last_name, r.name_suffix,
                        r.date_of_birth, r.email, r.password_hash, r.request_status,
                        roster.program_id, roster.year_level,
                        CASE WHEN roster.student_number IS NOT NULL
                          AND LOWER(TRIM(r.first_name)) = LOWER(TRIM(roster.first_name))
                          AND LOWER(TRIM(r.last_name)) = LOWER(TRIM(roster.last_name))
                          AND LOWER(TRIM(COALESCE(r.name_suffix, \'\'))) = LOWER(TRIM(COALESCE(roster.name_suffix, \'\')))
                          AND r.date_of_birth = roster.date_of_birth THEN 1 ELSE 0 END AS roster_identity_match
                 FROM student_registration_requests r
                 LEFT JOIN campus_student_registry roster ON roster.student_number = r.student_number
                 WHERE r.request_id = :request_id FOR UPDATE'
            );
            $requestQuery->execute(['request_id' => $requestId]);
            $registration = $requestQuery->fetch();
            if (!$registration || $registration['request_status'] !== 'pending') {
                $pdo->rollBack();
                send_json(409, ['error' => 'That registration request is no longer pending or does not exist.']);
            }

            $createdUserId = null;
            if ($status === 'approved') {
                if (!$registration['roster_identity_match'] || !$registration['program_id'] || !$registration['year_level']) {
                    $pdo->rollBack();
                    send_json(422, ['error' => 'This request does not match an eligible campus student record. Check the student number, name, suffix, and date of birth.']);
                }
                $programId = $registration['program_id'];
                $yearLevel = (int)$registration['year_level'];
                $existing = $pdo->prepare(
                    'SELECT 1 FROM users WHERE email = :email
                     UNION ALL SELECT 1 FROM student_profiles WHERE student_number = :student_number LIMIT 1'
                );
                $existing->execute([
                    'email' => $registration['email'],
                    'student_number' => $registration['student_number'],
                ]);
                if ($existing->fetchColumn()) {
                    $pdo->rollBack();
                    send_json(409, ['error' => 'The email or student number was registered while this request was pending. Resolve the duplicate before approving.']);
                }

                $fullName = trim(implode(' ', array_filter([
                    $registration['first_name'],
                    $registration['last_name'],
                    $registration['name_suffix'],
                ], static fn($part) => $part !== null && $part !== '')));
                $createUser = $pdo->prepare(
                    'INSERT INTO users (full_name, email, password_hash, role, account_status)
                     VALUES (:full_name, :email, :password_hash, \'student\', \'active\')'
                );
                $createUser->execute([
                    'full_name' => $fullName,
                    'email' => $registration['email'],
                    'password_hash' => $registration['password_hash'],
                ]);
                $createdUserId = (int)$pdo->lastInsertId();
                $createProfile = $pdo->prepare(
                    'INSERT INTO student_profiles
                       (user_id, student_number, first_name, last_name, name_suffix, date_of_birth, program_id, year_level)
                     VALUES (:user_id, :student_number, :first_name, :last_name, :name_suffix, :date_of_birth, :program_id, :year_level)'
                );
                $createProfile->execute([
                    'user_id' => $createdUserId,
                    'student_number' => $registration['student_number'],
                    'first_name' => $registration['first_name'],
                    'last_name' => $registration['last_name'],
                    'name_suffix' => $registration['name_suffix'],
                    'date_of_birth' => $registration['date_of_birth'],
                    'program_id' => $programId,
                    'year_level' => $yearLevel,
                ]);
            }

            $update = $pdo->prepare(
                'UPDATE student_registration_requests
                 SET request_status = :status, password_hash = NULL, reviewed_by_user_id = :reviewer,
                     reviewed_at = NOW(), created_user_id = :created_user_id
                 WHERE request_id = :request_id'
            );
            $update->execute([
                'status' => $status,
                'reviewer' => $registrar['user_id'],
                'created_user_id' => $createdUserId,
                'request_id' => $requestId,
            ]);
            $pdo->commit();
            send_json(200, ['message' => $status === 'approved' ? 'Registration approved. The student account is now active.' : 'Registration request rejected.']);
        }

        request_method('GET');
    }

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
            if (!$account) {
                $pending = $pdo->prepare(
                    'SELECT password_hash FROM student_registration_requests
                     WHERE email = :email AND request_status = \'pending\'
                     ORDER BY created_at DESC LIMIT 1'
                );
                $pending->execute(['email' => $email]);
                $pendingHash = $pending->fetchColumn();
                if (is_string($pendingHash) && password_verify($password, $pendingHash)) {
                    send_json(403, ['error' => 'Your student registration is awaiting registrar approval. You can sign in after it is approved.']);
                }
            }
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
                        sp.student_number, sp.first_name, sp.last_name, sp.name_suffix, sp.date_of_birth,
                        sp.year_level, sp.student_status,
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

    if ($action === 'registrar_faculty') {
        require_user('registrar');
        if ($method !== 'GET') {
            send_json(405, ['error' => 'Method not allowed.']);
        }

        $faculty = $pdo->query(
            'SELECT u.user_id, ep.employee_number, u.full_name, u.email,
                    d.department_code, d.department_name, ep.office,
                    u.account_status
             FROM users u
             JOIN employee_profiles ep ON ep.user_id = u.user_id
             LEFT JOIN departments d ON d.department_id = ep.department_id
             WHERE u.role = \'faculty\'
             ORDER BY u.account_status, u.full_name'
        )->fetchAll();
        $assignments = $pdo->query(
            'SELECT co.faculty_user_id, co.offering_id, co.course_number,
                    c.course_code, c.course_title, co.section_code,
                    t.term_name, ay.year_label, p.program_code
             FROM course_offerings co
             JOIN courses c ON c.course_id = co.course_id
             JOIN academic_terms t ON t.term_id = co.term_id
             JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
             LEFT JOIN programs p ON p.program_code = SUBSTRING_INDEX(co.section_code, \'-\', 1)
             WHERE co.faculty_user_id IS NOT NULL
               AND t.term_status IN (\'active\', \'upcoming\')
               AND co.offering_status <> \'cancelled\'
             ORDER BY ay.start_date DESC, t.start_date, c.course_code, co.section_code'
        )->fetchAll();
        $assignmentsByFaculty = [];
        foreach ($assignments as $assignment) {
            $assignmentsByFaculty[(int)$assignment['faculty_user_id']][] = $assignment;
        }
        foreach ($faculty as &$member) {
            $member['assignments'] = $assignmentsByFaculty[(int)$member['user_id']] ?? [];
            $member['assignment_count'] = count($member['assignments']);
        }
        unset($member);

        send_json(200, ['faculty' => $faculty]);
    }

    if ($action === 'registrar_sections') {
        $registrar = require_user('registrar');

        if ($method === 'GET') {
            $programs = $pdo->query(
                'SELECT program_id, program_code, program_name FROM programs
                 WHERE is_active = 1 ORDER BY program_code'
            )->fetchAll();
            $terms = $pdo->query(
                'SELECT t.term_id, t.term_name, t.term_status, ay.year_label
                 FROM academic_terms t JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
                 WHERE t.term_status IN (\'active\', \'upcoming\')
                   AND t.term_name IN (\'1st semester\', \'2nd semester\')
                 ORDER BY ay.start_date DESC, t.start_date'
            )->fetchAll();
            $faculty = $pdo->query(
                'SELECT u.user_id, u.full_name FROM users u
                 JOIN employee_profiles ep ON ep.user_id = u.user_id
                 WHERE u.role = \'faculty\' AND u.account_status = \'active\'
                 ORDER BY u.full_name'
            )->fetchAll();

            $programId = trim((string)($_GET['program_id'] ?? ''));
            $termId = filter_var($_GET['term_id'] ?? null, FILTER_VALIDATE_INT);
            $roster = [];
            $offerings = [];
            if ($programId !== '' && $termId) {
                $rosterQuery = $pdo->prepare(
                    'SELECT r.student_number, r.first_name, r.last_name, r.name_suffix,
                            r.student_email, r.year_level, r.section_code
                     FROM campus_student_registry r
                     WHERE r.program_id = :program_id
                     ORDER BY r.section_code, r.year_level, r.last_name, r.first_name'
                );
                $rosterQuery->execute(['program_id' => $programId]);
                $roster = $rosterQuery->fetchAll();

                $offeringQuery = $pdo->prepare(
                    'SELECT pc.course_id, c.course_code, c.course_title, c.units,
                            pc.recommended_year, sections.section_letter,
                            CONCAT(p.program_code, \'-\', pc.recommended_year, \'-\', sections.section_letter) AS section_code,
                            co.offering_id, co.course_number, co.offering_status,
                            co.faculty_user_id, faculty.full_name AS faculty_name,
                            (SELECT COUNT(*) FROM enrollments e
                             WHERE e.offering_id = co.offering_id AND e.enrollment_status = \'approved\') AS enrolled_count
                     FROM programs p
                     JOIN program_courses pc ON pc.program_id = p.program_id
                       AND pc.recommended_semester = CASE
                         WHEN (SELECT term_name FROM academic_terms WHERE term_id = :term_for_semester) = \'1st semester\' THEN 1 ELSE 2 END
                       AND pc.is_required = 1
                     JOIN courses c ON c.course_id = pc.course_id AND c.course_status = \'active\'
                     CROSS JOIN (SELECT \'A\' AS section_letter UNION ALL SELECT \'B\' UNION ALL SELECT \'C\') sections
                     LEFT JOIN course_offerings co ON co.course_id = c.course_id
                       AND co.term_id = :term_for_offering
                       AND co.section_code = CONCAT(p.program_code, \'-\', pc.recommended_year, \'-\', sections.section_letter)
                     LEFT JOIN users faculty ON faculty.user_id = co.faculty_user_id
                     WHERE p.program_id = :program_id
                     ORDER BY pc.recommended_year, c.course_code, sections.section_letter'
                );
                $offeringQuery->execute([
                    'term_for_semester' => $termId,
                    'term_for_offering' => $termId,
                    'program_id' => $programId,
                ]);
                $offerings = $offeringQuery->fetchAll();
            }
            send_json(200, [
                'programs' => $programs,
                'terms' => $terms,
                'faculty' => $faculty,
                'roster' => $roster,
                'offerings' => $offerings,
            ]);
        }

        if ($method === 'POST') {
            $body = request_body();
            $task = (string)($body['task'] ?? '');
            if ($task === 'prepare') {
                $programId = trim((string)($body['program_id'] ?? ''));
                $termId = filter_var($body['term_id'] ?? null, FILTER_VALIDATE_INT);
                if ($programId === '' || !$termId) {
                    send_json(422, ['error' => 'Select a program and semester.']);
                }
                $pdo->beginTransaction();
                $termQuery = $pdo->prepare(
                    'SELECT t.term_id, t.term_name, t.term_status, ay.year_label, p.program_code
                     FROM academic_terms t
                     JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
                     JOIN programs p ON p.program_id = :program_id AND p.is_active = 1
                     WHERE t.term_id = :term_id AND t.term_status IN (\'active\', \'upcoming\')
                       AND t.term_name IN (\'1st semester\', \'2nd semester\') FOR UPDATE'
                );
                $termQuery->execute(['program_id' => $programId, 'term_id' => $termId]);
                $term = $termQuery->fetch();
                if (!$term) {
                    $pdo->rollBack();
                    send_json(404, ['error' => 'The selected program or semester is no longer available.']);
                }
                $semester = $term['term_name'] === '1st semester' ? 1 : 2;
                $curriculumQuery = $pdo->prepare(
                    'SELECT pc.course_id, pc.recommended_year, c.course_code, c.units
                     FROM program_courses pc JOIN courses c ON c.course_id = pc.course_id
                     WHERE pc.program_id = :program_id AND pc.recommended_semester = :semester
                       AND pc.is_required = 1 AND c.course_status = \'active\'
                     ORDER BY pc.recommended_year, c.course_code'
                );
                $curriculumQuery->execute(['program_id' => $programId, 'semester' => $semester]);
                $courses = $curriculumQuery->fetchAll();
                $units = array_sum(array_map(static fn($course) => (int)$course['units'], $courses));
                if (!$courses || $units < 21) {
                    $pdo->rollBack();
                    send_json(409, ['error' => 'Complete a 21-unit curriculum for this program and semester before forming sections.']);
                }

                $profiles = $pdo->prepare(
                    'SELECT sp.user_id, r.section_code
                     FROM student_profiles sp
                     JOIN users u ON u.user_id = sp.user_id AND u.account_status = \'active\'
                     LEFT JOIN campus_student_registry r ON r.student_number = sp.student_number
                     WHERE sp.program_id = :program_id AND sp.student_status = \'active\'
                     ORDER BY sp.student_number'
                );
                $profiles->execute(['program_id' => $programId]);
                $sectionCounts = ['A' => 0, 'B' => 0, 'C' => 0];
                $saveSection = $pdo->prepare(
                    'INSERT INTO student_section_assignments (student_user_id, term_id, section_code, assigned_by_user_id)
                     VALUES (:student_user_id, :term_id, :section_code, :assigned_by)
                     ON DUPLICATE KEY UPDATE section_code = VALUES(section_code), assigned_by_user_id = VALUES(assigned_by_user_id), assigned_at = NOW()'
                );
                foreach ($profiles->fetchAll() as $profile) {
                    $section = $profile['section_code'];
                    if (!in_array($section, ['A', 'B', 'C'], true)) {
                        asort($sectionCounts);
                        $section = (string)array_key_first($sectionCounts);
                    }
                    $sectionCounts[$section]++;
                    $saveSection->execute([
                        'student_user_id' => $profile['user_id'],
                        'term_id' => $termId,
                        'section_code' => $section,
                        'assigned_by' => $registrar['user_id'],
                    ]);
                }

                $insertOffering = $pdo->prepare(
                    'INSERT INTO course_offerings (course_id, term_id, section_code, capacity, offering_status)
                     VALUES (:course_id, :term_id, :section_code, 40, \'open\')
                     ON DUPLICATE KEY UPDATE offering_id = LAST_INSERT_ID(offering_id)'
                );
                $getOffering = $pdo->prepare(
                    'SELECT offering_id, course_number FROM course_offerings
                     WHERE course_id = :course_id AND term_id = :term_id AND section_code = :section_code FOR UPDATE'
                );
                $numberOffering = $pdo->prepare('UPDATE course_offerings SET course_number = :course_number WHERE offering_id = :offering_id AND course_number IS NULL');
                $yearPrefix = substr((string)$term['year_label'], 0, 4);
                foreach ($courses as $course) {
                    foreach (['A', 'B', 'C'] as $section) {
                        $sectionCode = $term['program_code'] . '-' . $course['recommended_year'] . '-' . $section;
                        $insertOffering->execute([
                            'course_id' => $course['course_id'],
                            'term_id' => $termId,
                            'section_code' => $sectionCode,
                        ]);
                        $getOffering->execute([
                            'course_id' => $course['course_id'],
                            'term_id' => $termId,
                            'section_code' => $sectionCode,
                        ]);
                        $offering = $getOffering->fetch();
                        if (!$offering) {
                            $pdo->rollBack();
                            send_json(500, ['error' => 'Unable to create a section offering.']);
                        }
                        if (!$offering['course_number']) {
                            $numberOffering->execute([
                                'course_number' => $yearPrefix . (string)$semester . str_pad((string)$offering['offering_id'], 4, '0', STR_PAD_LEFT),
                                'offering_id' => $offering['offering_id'],
                            ]);
                        }
                    }
                }
                $studentList = $pdo->prepare(
                    'SELECT sp.user_id, sp.student_number, p.program_code, sp.year_level,
                            COALESCE(section_assignment.section_code, roster.section_code, "A") AS section_letter
                     FROM student_profiles sp
                     JOIN users u ON u.user_id = sp.user_id AND u.account_status = "active"
                     JOIN programs p ON p.program_id = sp.program_id AND p.is_active = 1
                     LEFT JOIN student_section_assignments section_assignment
                       ON section_assignment.student_user_id = sp.user_id
                      AND section_assignment.term_id = :term_id
                     LEFT JOIN campus_student_registry roster ON roster.student_number = sp.student_number
                     WHERE sp.program_id = :program_id AND sp.student_status = "active"
                     ORDER BY sp.student_number'
                );
                $studentList->execute([
                    'program_id' => $programId,
                    'term_id' => $termId,
                ]);
                $offeringLookup = $pdo->prepare(
                    'SELECT offering_id, course_id, section_code, offering_status, capacity
                     FROM course_offerings
                     WHERE term_id = :term_id AND course_id = :course_id AND section_code = :section_code
                     LIMIT 1 FOR UPDATE'
                );
                $existingEnrollment = $pdo->prepare(
                    'SELECT enrollment_id, enrollment_status
                     FROM enrollments
                     WHERE student_user_id = :student_user_id AND offering_id = :offering_id
                     LIMIT 1 FOR UPDATE'
                );
                $enrollStudent = $pdo->prepare(
                    'INSERT INTO enrollments
                       (request_code, student_user_id, offering_id, enrollment_status,
                        reviewed_by_user_id, reviewed_at, decision_note)
                     VALUES (:request_code, :student_user_id, :offering_id, "approved", :reviewer, NOW(), :note)
                     ON DUPLICATE KEY UPDATE enrollment_status = "approved",
                       requested_at = NOW(), reviewed_by_user_id = VALUES(reviewed_by_user_id),
                       reviewed_at = NOW(), decision_note = VALUES(decision_note)'
                );
                $studentCount = 0;
                foreach ($studentList->fetchAll() as $studentProfile) {
                    $studentSectionCode = (string)$studentProfile['section_letter'];
                    foreach ($courses as $course) {
                        $sectionCode = $studentProfile['program_code'] . '-' . $studentProfile['year_level'] . '-' . $studentSectionCode;
                        $offeringLookup->execute([
                            'term_id' => $termId,
                            'course_id' => $course['course_id'],
                            'section_code' => $sectionCode,
                        ]);
                        $offering = $offeringLookup->fetch();
                        if (!$offering || $offering['offering_status'] !== 'open') {
                            continue;
                        }
                        $existingEnrollment->execute([
                            'student_user_id' => $studentProfile['user_id'],
                            'offering_id' => $offering['offering_id'],
                        ]);
                        $currentEnrollment = $existingEnrollment->fetch();
                        if ($currentEnrollment && in_array($currentEnrollment['enrollment_status'], ['pending', 'approved'], true)) {
                            continue;
                        }
                        $requestCode = 'REG-' . date('ymdHis') . '-' . strtoupper(bin2hex(random_bytes(3)));
                        $enrollStudent->execute([
                            'request_code' => $requestCode,
                            'student_user_id' => $studentProfile['user_id'],
                            'offering_id' => $offering['offering_id'],
                            'reviewer' => $registrar['user_id'],
                            'note' => 'Batch enrollment for ' . $studentProfile['program_code'] . ' Year ' . $studentProfile['year_level'] . ' Section ' . $studentSectionCode . '.',
                        ]);
                        $studentCount++;
                    }
                }
                $pdo->commit();
                send_json(200, [
                    'message' => $term['program_code'] . ' sections A, B, and C are ready for ' . $term['term_name'] . '. Course numbers and student enrollments have been assigned.',
                    'unit_total' => $units,
                    'enrollment_rows' => $studentCount,
                ]);
            }
            send_json(422, ['error' => 'Choose a supported section management action.']);
        }

        if ($method === 'PATCH') {
            $body = request_body();
            $offeringId = filter_var($body['offering_id'] ?? null, FILTER_VALIDATE_INT);
            $facultyId = ($body['faculty_user_id'] ?? '') === '' ? null : filter_var($body['faculty_user_id'], FILTER_VALIDATE_INT);
            if (!$offeringId || (($body['faculty_user_id'] ?? '') !== '' && !$facultyId)) {
                send_json(422, ['error' => 'Choose a valid course section and faculty member.']);
            }
            if ($facultyId) {
                $facultyCheck = $pdo->prepare(
                    'SELECT 1 FROM users u JOIN employee_profiles ep ON ep.user_id = u.user_id
                     WHERE u.user_id = :faculty_user_id AND u.role = \'faculty\' AND u.account_status = \'active\''
                );
                $facultyCheck->execute(['faculty_user_id' => $facultyId]);
                if (!$facultyCheck->fetchColumn()) {
                    send_json(422, ['error' => 'Select an active faculty account.']);
                }
            }
            $updateFaculty = $pdo->prepare(
                'UPDATE course_offerings SET faculty_user_id = :faculty_user_id
                 WHERE offering_id = :offering_id AND course_number IS NOT NULL'
            );
            $updateFaculty->execute(['faculty_user_id' => $facultyId, 'offering_id' => $offeringId]);
            if ($updateFaculty->rowCount() !== 1) {
                send_json(404, ['error' => 'Prepare the course sections before assigning faculty.']);
            }
            send_json(200, ['message' => 'Faculty assignment saved for this course number.']);
        }
        request_method('GET');
    }

    if ($action === 'registrar_enrollment') {
        $registrar = require_user('registrar');

        if ($method === 'GET') {
            $students = $pdo->query(
                'SELECT sp.user_id, sp.student_number, u.full_name AS student_name,
                        sp.program_id, p.program_code, p.program_name, sp.year_level
                 FROM student_profiles sp
                 JOIN users u ON u.user_id = sp.user_id AND u.account_status = \'active\'
                 JOIN programs p ON p.program_id = sp.program_id AND p.is_active = 1
                 WHERE sp.student_status = \'active\'
                 ORDER BY p.program_code, sp.year_level, u.full_name'
            )->fetchAll();
            $terms = $pdo->query(
                'SELECT t.term_id, t.term_name, t.term_status, ay.year_label
                 FROM academic_terms t
                 JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
                 WHERE t.term_status IN (\'active\', \'upcoming\')
                   AND t.term_name IN (\'1st semester\', \'2nd semester\')
                 ORDER BY ay.start_date DESC, t.start_date'
            )->fetchAll();

            $studentUserId = filter_var($_GET['student_user_id'] ?? null, FILTER_VALIDATE_INT);
            $termId = filter_var($_GET['term_id'] ?? null, FILTER_VALIDATE_INT);
            $curriculum = [];
            if ($studentUserId && $termId) {
                $preview = $pdo->prepare(
                    'SELECT c.course_id, c.course_code, c.course_title, c.units,
                            COALESCE(section_assignment.section_code, roster.section_code, \'A\') AS section_letter,
                            EXISTS (
                              SELECT 1 FROM enrollments e
                              JOIN course_offerings co ON co.offering_id = e.offering_id
                              WHERE e.student_user_id = sp.user_id
                                AND co.term_id = t.term_id AND co.course_id = c.course_id
                                AND e.enrollment_status IN (\'pending\', \'approved\')
                            ) AS already_enrolled
                     FROM student_profiles sp
                     JOIN programs p ON p.program_id = sp.program_id
                     JOIN academic_terms t ON t.term_id = :term_id
                       AND t.term_status IN (\'active\', \'upcoming\')
                     JOIN program_courses pc ON pc.program_id = sp.program_id
                       AND pc.recommended_year = sp.year_level
                       AND pc.recommended_semester = CASE t.term_name
                         WHEN \'1st semester\' THEN 1 WHEN \'2nd semester\' THEN 2 ELSE 0 END
                       AND pc.is_required = 1
                     JOIN courses c ON c.course_id = pc.course_id AND c.course_status = \'active\'
                     LEFT JOIN student_section_assignments section_assignment
                       ON section_assignment.student_user_id = sp.user_id AND section_assignment.term_id = t.term_id
                     LEFT JOIN campus_student_registry roster ON roster.student_number = sp.student_number
                     WHERE sp.user_id = :student_user_id AND sp.student_status = \'active\'
                     ORDER BY c.course_code'
                );
                $preview->execute(['term_id' => $termId, 'student_user_id' => $studentUserId]);
                $curriculum = $preview->fetchAll();
            }
            send_json(200, ['students' => $students, 'terms' => $terms, 'curriculum' => $curriculum]);
        }

        if ($method === 'POST') {
            $body = request_body();
            $studentUserId = filter_var($body['student_user_id'] ?? null, FILTER_VALIDATE_INT);
            $termId = filter_var($body['term_id'] ?? null, FILTER_VALIDATE_INT);
            if (!$studentUserId || !$termId) {
                send_json(422, ['error' => 'Select a student and an available semester.']);
            }

            $pdo->beginTransaction();
            $studentQuery = $pdo->prepare(
                'SELECT sp.user_id, sp.student_number, p.program_code, sp.year_level,
                        COALESCE(section_assignment.section_code, roster.section_code, \'A\') AS section_letter,
                        t.term_id, t.term_name, t.term_status, ay.year_label
                 FROM student_profiles sp
                 JOIN users u ON u.user_id = sp.user_id AND u.account_status = \'active\'
                 JOIN programs p ON p.program_id = sp.program_id AND p.is_active = 1
                 JOIN academic_terms t ON t.term_id = :term_id
                   AND t.term_status IN (\'active\', \'upcoming\')
                   AND t.term_name IN (\'1st semester\', \'2nd semester\')
                 JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
                 LEFT JOIN student_section_assignments section_assignment
                   ON section_assignment.student_user_id = sp.user_id AND section_assignment.term_id = t.term_id
                 LEFT JOIN campus_student_registry roster ON roster.student_number = sp.student_number
                 WHERE sp.user_id = :student_user_id AND sp.student_status = \'active\'
                 FOR UPDATE'
            );
            $studentQuery->execute(['term_id' => $termId, 'student_user_id' => $studentUserId]);
            $student = $studentQuery->fetch();
            if (!$student) {
                $pdo->rollBack();
                send_json(404, ['error' => 'The selected student or semester is no longer available.']);
            }

            $semesterNumber = $student['term_name'] === '1st semester' ? 1 : 2;
            $curriculumQuery = $pdo->prepare(
                'SELECT c.course_id, c.course_code, c.units
                 FROM student_profiles sp
                 JOIN program_courses pc ON pc.program_id = sp.program_id
                   AND pc.recommended_year = :year_level
                   AND pc.recommended_semester = :semester
                   AND pc.is_required = 1
                 JOIN courses c ON c.course_id = pc.course_id AND c.course_status = \'active\'
                 WHERE sp.user_id = :student_user_id
                 ORDER BY c.course_code'
            );
            $curriculumQuery->execute([
                'student_user_id' => $studentUserId,
                'year_level' => $student['year_level'],
                'semester' => $semesterNumber,
            ]);
            $courses = $curriculumQuery->fetchAll();
            $unitTotal = array_sum(array_map(static fn($course) => (int)$course['units'], $courses));
            if (!$courses || $unitTotal < 21) {
                $pdo->rollBack();
                send_json(409, ['error' => 'This program semester does not have an active curriculum of at least 21 units. Ask an administrator to complete the curriculum first.']);
            }

            $enrolledCount = 0;
            $insertOffering = $pdo->prepare(
                'INSERT INTO course_offerings (course_id, term_id, section_code, capacity, offering_status)
                 VALUES (:course_id, :term_id, :section_code, 40, \'open\')
                 ON DUPLICATE KEY UPDATE offering_id = LAST_INSERT_ID(offering_id)'
            );
            $getOffering = $pdo->prepare(
                'SELECT offering_id, course_number, capacity, offering_status FROM course_offerings
                 WHERE course_id = :course_id AND term_id = :term_id AND section_code = :section_code
                 FOR UPDATE'
            );
            $existing = $pdo->prepare(
                'SELECT enrollment_id, enrollment_status FROM enrollments
                 WHERE student_user_id = :student_user_id AND offering_id = :offering_id LIMIT 1 FOR UPDATE'
            );
            $activeCount = $pdo->prepare(
                'SELECT COUNT(*) FROM enrollments
                 WHERE offering_id = :offering_id AND enrollment_status IN (\'pending\', \'approved\')'
            );
            $enrollment = $pdo->prepare(
                'INSERT INTO enrollments
                   (request_code, student_user_id, offering_id, enrollment_status,
                    reviewed_by_user_id, reviewed_at, decision_note)
                 VALUES (:request_code, :student_user_id, :offering_id, \'approved\', :reviewer, NOW(), :note)
                 ON DUPLICATE KEY UPDATE enrollment_status = \'approved\', requested_at = NOW(),
                   reviewed_by_user_id = VALUES(reviewed_by_user_id), reviewed_at = NOW(),
                   decision_note = VALUES(decision_note)'
            );

            foreach ($courses as $course) {
                $sectionCode = $student['program_code'] . '-' . $student['year_level'] . '-' . $student['section_letter'];
                $insertOffering->execute([
                    'course_id' => $course['course_id'],
                    'term_id' => $termId,
                    'section_code' => $sectionCode,
                ]);
                $getOffering->execute([
                    'course_id' => $course['course_id'],
                    'term_id' => $termId,
                    'section_code' => $sectionCode,
                ]);
                $offering = $getOffering->fetch();
                if (!$offering || $offering['offering_status'] !== 'open') {
                    $pdo->rollBack();
                    send_json(409, ['error' => $course['course_code'] . ' does not have an open section for this semester.']);
                }
                if (!$offering['course_number']) {
                    $updateCourseNumber = $pdo->prepare(
                        'UPDATE course_offerings SET course_number = :course_number
                         WHERE offering_id = :offering_id AND course_number IS NULL'
                    );
                    $updateCourseNumber->execute([
                        'course_number' => substr((string)$student['year_label'], 0, 4)
                            . (string)$semesterNumber
                            . str_pad((string)$offering['offering_id'], 4, '0', STR_PAD_LEFT),
                        'offering_id' => $offering['offering_id'],
                    ]);
                }

                $existing->execute(['student_user_id' => $studentUserId, 'offering_id' => $offering['offering_id']]);
                $existingEnrollment = $existing->fetch();
                if ($existingEnrollment && $existingEnrollment['enrollment_status'] === 'approved') {
                    $enrolledCount++;
                    continue;
                }
                if (!$existingEnrollment || in_array($existingEnrollment['enrollment_status'], ['cancelled', 'rejected'], true)) {
                    $activeCount->execute(['offering_id' => $offering['offering_id']]);
                    if ((int)$activeCount->fetchColumn() >= (int)$offering['capacity']) {
                        $pdo->rollBack();
                        send_json(409, ['error' => $course['course_code'] . ' has reached its section capacity.']);
                    }
                }

                $requestCode = 'REG-' . date('ymdHis') . '-' . strtoupper(bin2hex(random_bytes(3)));
                $enrollment->execute([
                    'request_code' => $requestCode,
                    'student_user_id' => $studentUserId,
                    'offering_id' => $offering['offering_id'],
                    'reviewer' => $registrar['user_id'],
                    'note' => 'Registrar enrollment for ' . $student['term_name'] . ', ' . $student['program_code'] . ' Year ' . $student['year_level'] . '.',
                ]);
                $enrolledCount++;
            }

            $pdo->commit();
            send_json(200, [
                'message' => $student['student_number'] . ' was enrolled in ' . $student['term_name'] . ' for ' . $student['program_code'] . ' Year ' . $student['year_level'] . '.',
                'enrolled_count' => $enrolledCount,
                'total_units' => $unitTotal,
            ]);
        }

        request_method('GET');
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
            'SELECT co.offering_id, co.course_number, c.course_code, c.course_title, co.section_code,
                    t.term_name, ay.year_label,
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
             JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status IN (\'active\', \'upcoming\')
             JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
             LEFT JOIN enrollments e ON e.offering_id = co.offering_id
               AND e.enrollment_status = \'approved\'
             LEFT JOIN class_meetings cm ON cm.offering_id = co.offering_id
             WHERE co.faculty_user_id = :faculty_user_id
               AND co.offering_status = \'open\' AND c.course_status = \'active\'
               AND (:active_only = 0 OR t.term_status = \'active\')
             GROUP BY co.offering_id, co.course_number, c.course_code, c.course_title, co.section_code,
                      t.term_name, ay.year_label, co.capacity
             ORDER BY ay.start_date DESC, t.start_date, c.course_code, co.section_code'
        );
        $statement->execute([
            'faculty_user_id' => $user['user_id'],
            'active_only' => ($_GET['active_only'] ?? '') === '1' ? 1 : 0,
        ]);
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
