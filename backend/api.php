<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function create_user_account(PDO $pdo, array $body, ?string $forcedRole = null): array
{
    $name = trim((string)($body['full_name'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $role = $forcedRole ?? strtolower(trim((string)($body['role'] ?? '')));
    $password = (string)($body['password'] ?? 'password');
    if ($name === '' || mb_strlen($name) > 160 || !filter_var($email, FILTER_VALIDATE_EMAIL)
        || !in_array($role, ['student', 'registrar', 'admin'], true)
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
                $checkNumber = $pdo->prepare('SELECT 1 FROM users WHERE student_number = :student_number');
                $checkNumber->execute(['student_number' => $studentNumber]);
            } while ($checkNumber->fetchColumn());
        }
        $profile = $pdo->prepare(
            'UPDATE users
             SET student_number = :student_number, program_id = :program_id,
                 year_level = :year_level, student_status = \'active\'
             WHERE user_id = :user_id'
        );
        $profile->execute([
            'user_id' => $userId,
            'student_number' => $studentNumber,
            'program_id' => $programId,
            'year_level' => $yearLevel,
        ]);
    } elseif ($role === 'registrar') {
        $departmentId = filter_var($body['department_id'] ?? null, FILTER_VALIDATE_INT) ?: null;
        $employeeNumber = trim((string)($body['employee_number'] ?? ''));
        if ($employeeNumber === '') {
            $employeeNumber = strtoupper(substr($role, 0, 3)) . '-' . str_pad((string)$userId, 6, '0', STR_PAD_LEFT);
        }
        $profile = $pdo->prepare(
            'UPDATE users SET employee_number = :employee_number,
                 department_id = :department_id, office = :office
             WHERE user_id = :user_id'
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

$storedUploads = [];

function student_registration_term(PDO $pdo, int $userId): ?array
{
    $statement = $pdo->prepare(
        'SELECT u.year_level, t.term_id, t.term_name, ay.year_label
         FROM users u
         LEFT JOIN academic_terms t ON t.term_status = \'active\'
         LEFT JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
         WHERE u.user_id = :user_id
         ORDER BY t.start_date DESC
         LIMIT 1'
    );
    $statement->execute(['user_id' => $userId]);
    $term = $statement->fetch();
    return $term ?: null;
}

function student_registration_is_eligible(?array $term): bool
{
    return $term !== null
        && (int)$term['year_level'] === 1
        && $term['term_name'] === '1st semester'
        && $term['term_id'] !== null;
}

function private_registration_storage_directory(): string
{
    global $localConfig;
    $configured = $localConfig['private_storage_path'] ?? null;
    return is_string($configured) && trim($configured) !== ''
        ? rtrim($configured, "\\/")
        : dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'edutrack-private';
}

try {
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    $pdo = database();

    if (in_array($action, ['faculty_classes', 'faculty_grades', 'faculty_attendance'], true)) {
        send_json(404, ['error' => 'Faculty portal workflows are no longer available.']);
    }

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
                 SELECT 1 FROM users WHERE student_number = :student_number
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
                     UNION ALL SELECT 1 FROM users WHERE student_number = :student_number LIMIT 1'
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
                    'INSERT INTO users
                       (full_name, email, password_hash, role, account_status, student_number,
                        first_name, last_name, name_suffix, date_of_birth, program_id, year_level,
                        student_status)
                     VALUES
                       (:full_name, :email, :password_hash, \'student\', \'active\', :student_number,
                        :first_name, :last_name, :name_suffix, :date_of_birth, :program_id, :year_level,
                        \'active\')'
                );
                $createUser->execute([
                    'full_name' => $fullName,
                    'email' => $registration['email'],
                    'password_hash' => $registration['password_hash'],
                    'student_number' => $registration['student_number'],
                    'first_name' => $registration['first_name'],
                    'last_name' => $registration['last_name'],
                    'name_suffix' => $registration['name_suffix'],
                    'date_of_birth' => $registration['date_of_birth'],
                    'program_id' => $programId,
                    'year_level' => $yearLevel,
                ]);
                $createdUserId = (int)$pdo->lastInsertId();
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
                        u.student_number, u.first_name, u.last_name, u.name_suffix, u.date_of_birth,
                        u.year_level, u.student_status,
                        p.program_code, p.program_name, d.department_name,
                        u.employee_number, u.office, u.hire_date,
                        (SELECT t.term_name FROM academic_terms t
                         WHERE t.term_status = \'active\' ORDER BY t.start_date DESC LIMIT 1) AS active_term_name,
                        (SELECT ay.year_label FROM academic_terms t
                         JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
                         WHERE t.term_status = \'active\' ORDER BY t.start_date DESC LIMIT 1) AS active_year_label
                 FROM users u
                 LEFT JOIN programs p ON p.program_id = u.program_id
                 LEFT JOIN departments d ON d.department_id = u.department_id
                 WHERE u.user_id = :user_id'
            );
            $statement->execute(['user_id' => $user['user_id']]);
            send_json(200, ['profile' => $statement->fetch()]);
        }
        if ($method === 'PATCH') {
            $body = request_body();
            if ((array_key_exists('full_name', $body)
                    && trim((string)$body['full_name']) !== $user['full_name'])
                || (array_key_exists('email', $body)
                    && strtolower(trim((string)$body['email'])) !== $user['email'])) {
                send_json(403, ['error' => 'Your name and school email are read-only. Contact an administrator to request a correction.']);
            }
            $phone = trim((string)($body['phone'] ?? ''));
            $address = trim((string)($body['address'] ?? ''));
            $office = trim((string)($body['office'] ?? ''));
            if (strlen($phone) > 40 || strlen($address) > 255 || strlen($office) > 160) {
                send_json(422, ['error' => 'Check the contact field lengths.']);
            }
            $update = $pdo->prepare(
                'UPDATE users SET phone = :phone, address = :address WHERE user_id = :user_id'
            );
            $update->execute([
                'phone' => $phone !== '' ? $phone : null,
                'address' => $address !== '' ? $address : null,
                'user_id' => $user['user_id'],
            ]);
            if (in_array($user['role'], ['registrar', 'admin'], true)) {
                $staff = $pdo->prepare('UPDATE users SET office = :office WHERE user_id = :user_id');
                $staff->execute(['office' => $office !== '' ? $office : null, 'user_id' => $user['user_id']]);
            }
            send_json(200, ['message' => 'Profile changes were saved.', 'user' => $_SESSION['edutrack_user']]);
        }
        request_method('GET');
    }

    if ($action === 'student_schedule') {
        request_method('GET');
        $user = require_user('student');
        $term = $pdo->query(
            'SELECT t.term_id, t.term_name, ay.year_label
             FROM academic_terms t
             JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
             WHERE t.term_status = \'active\'
             ORDER BY t.start_date DESC
             LIMIT 1'
        )->fetch();
        if (!$term) {
            send_json(200, ['term' => null, 'meetings' => []]);
        }
        $statement = $pdo->prepare(
            'SELECT c.course_code, c.course_title, co.section_code, cm.day_of_week,
                    cm.start_time, cm.end_time, cm.room
             FROM enrollments e
             JOIN course_offerings co ON co.offering_id = e.offering_id
             JOIN courses c ON c.course_id = co.course_id
             JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
             LEFT JOIN class_meetings cm ON cm.offering_id = co.offering_id
             WHERE e.student_user_id = :student_user_id
               AND e.enrollment_status = \'approved\'
             ORDER BY FIELD(cm.day_of_week, \'monday\', \'tuesday\', \'wednesday\', \'thursday\', \'friday\', \'saturday\'),
                      cm.start_time, c.course_code'
        );
        $statement->execute(['student_user_id' => $user['user_id']]);
        send_json(200, [
            'term' => ['term_name' => $term['term_name'], 'year_label' => $term['year_label']],
            'meetings' => $statement->fetchAll(),
        ]);
    }

    if ($action === 'student_document_registrations') {
        $student = require_user('student');
        $term = student_registration_term($pdo, (int)$student['user_id']);
        $eligible = student_registration_is_eligible($term);

        if ($method === 'GET') {
            $request = null;
            if ($eligible) {
                $latest = $pdo->prepare(
                    'SELECT request_id, request_status, submitted_at, reviewed_at, decision_note
                     FROM student_document_registration_requests
                     WHERE student_user_id = :student_user_id AND term_id = :term_id
                     ORDER BY submitted_at DESC
                     LIMIT 1'
                );
                $latest->execute([
                    'student_user_id' => $student['user_id'],
                    'term_id' => $term['term_id'],
                ]);
                $request = $latest->fetch() ?: null;
                if ($request) {
                    $documents = $pdo->prepare(
                        'SELECT document_id, slot_number, original_filename, size_bytes
                         FROM student_registration_documents
                         WHERE request_id = :request_id
                         ORDER BY slot_number'
                    );
                    $documents->execute(['request_id' => $request['request_id']]);
                    $request['documents'] = $documents->fetchAll();
                }
            }
            send_json(200, [
                'eligible' => $eligible,
                'year_level' => $term['year_level'] ?? null,
                'term_name' => $term['term_name'] ?? null,
                'year_label' => $term['year_label'] ?? null,
                'request' => $request,
            ]);
        }

        request_method('POST');
        if (!$eligible) {
            send_json(403, ['error' => 'Document registration is available only to first-year students during the active first semester.']);
        }

        $uploads = [];
        for ($slot = 1; $slot <= 3; $slot++) {
            $field = 'document_' . $slot;
            $file = $_FILES[$field] ?? null;
            if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                send_json(422, ['error' => 'Select a PDF file for all three document slots.']);
            }
            if (!is_uploaded_file((string)$file['tmp_name'])
                || (int)$file['size'] < 1
                || (int)$file['size'] > 10 * 1024 * 1024) {
                send_json(422, ['error' => 'Each PDF must be smaller than or equal to 10 MB.']);
            }
            $originalFilename = trim(basename(str_replace('\\', '/', (string)$file['name'])));
            if ($originalFilename === '' || strlen($originalFilename) > 255
                || strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION)) !== 'pdf') {
                send_json(422, ['error' => 'Upload PDF files with a valid .pdf filename.']);
            }
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            if ($finfo->file((string)$file['tmp_name']) !== 'application/pdf') {
                send_json(422, ['error' => 'The selected file is not a valid PDF.']);
            }
            $uploads[] = [
                'slot_number' => $slot,
                'tmp_name' => (string)$file['tmp_name'],
                'original_filename' => $originalFilename,
                'size_bytes' => (int)$file['size'],
                'storage_filename' => bin2hex(random_bytes(16)) . '.pdf',
            ];
        }

        $pdo->beginTransaction();
        $lockStudent = $pdo->prepare(
            'SELECT user_id FROM users WHERE user_id = :user_id AND role = \'student\' FOR UPDATE'
        );
        $lockStudent->execute(['user_id' => $student['user_id']]);
        if (!$lockStudent->fetchColumn()) {
            $pdo->rollBack();
            send_json(404, ['error' => 'Student account not found.']);
        }
        $existing = $pdo->prepare(
            'SELECT request_status FROM student_document_registration_requests
             WHERE student_user_id = :student_user_id AND term_id = :term_id
             ORDER BY submitted_at DESC LIMIT 1 FOR UPDATE'
        );
        $existing->execute([
            'student_user_id' => $student['user_id'],
            'term_id' => $term['term_id'],
        ]);
        $lastRequestStatus = $existing->fetchColumn();
        if (in_array($lastRequestStatus, ['pending', 'approved'], true)) {
            $pdo->rollBack();
            send_json(409, ['error' => $lastRequestStatus === 'pending'
                ? 'Your registration documents are already awaiting registrar review.'
                : 'Your registration documents have already been approved for this semester.']);
        }

        $storageDirectory = private_registration_storage_directory()
            . DIRECTORY_SEPARATOR . 'registration-documents';
        if (!is_dir($storageDirectory)
            && !mkdir($storageDirectory, 0700, true)
            && !is_dir($storageDirectory)) {
            throw new RuntimeException('Unable to create private registration document storage.');
        }
        $insertRequest = $pdo->prepare(
            'INSERT INTO student_document_registration_requests (student_user_id, term_id)
             VALUES (:student_user_id, :term_id)'
        );
        $insertRequest->execute([
            'student_user_id' => $student['user_id'],
            'term_id' => $term['term_id'],
        ]);
        $requestId = (int)$pdo->lastInsertId();
        $insertDocument = $pdo->prepare(
            'INSERT INTO student_registration_documents
               (request_id, slot_number, original_filename, storage_filename, size_bytes)
             VALUES (:request_id, :slot_number, :original_filename, :storage_filename, :size_bytes)'
        );
        foreach ($uploads as $upload) {
            $destination = $storageDirectory . DIRECTORY_SEPARATOR . $upload['storage_filename'];
            if (!move_uploaded_file($upload['tmp_name'], $destination)) {
                throw new RuntimeException('Unable to store a submitted registration document.');
            }
            $storedUploads[] = $destination;
            $insertDocument->execute([
                'request_id' => $requestId,
                'slot_number' => $upload['slot_number'],
                'original_filename' => $upload['original_filename'],
                'storage_filename' => $upload['storage_filename'],
                'size_bytes' => $upload['size_bytes'],
            ]);
        }
        $pdo->commit();
        $storedUploads = [];
        send_json(201, ['message' => 'Your registration documents were sent to the registrar for review.']);
    }

    if ($action === 'registrar_student_document_registrations') {
        $registrar = require_user('registrar');
        if ($method === 'GET') {
            $requests = $pdo->query(
                'SELECT r.request_id, r.request_status, r.submitted_at, r.reviewed_at, r.decision_note,
                        u.full_name, u.student_number, p.program_name, u.year_level,
                        t.term_name, ay.year_label
                 FROM student_document_registration_requests r
                 JOIN users u ON u.user_id = r.student_user_id
                 LEFT JOIN programs p ON p.program_id = u.program_id
                 JOIN academic_terms t ON t.term_id = r.term_id
                 JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
                 ORDER BY CASE r.request_status WHEN \'pending\' THEN 0 ELSE 1 END, r.submitted_at DESC'
            )->fetchAll();
            if ($requests) {
                $documents = $pdo->prepare(
                    'SELECT document_id, request_id, slot_number, original_filename, size_bytes
                     FROM student_registration_documents
                     WHERE request_id IN (' . implode(',', array_map(
                        static fn(array $request): string => (string)(int)$request['request_id'],
                        $requests
                    )) . ')
                     ORDER BY request_id, slot_number'
                );
                $documents->execute();
                $documentsByRequest = [];
                foreach ($documents->fetchAll() as $document) {
                    $documentsByRequest[$document['request_id']][] = $document;
                }
                foreach ($requests as &$request) {
                    $request['documents'] = $documentsByRequest[$request['request_id']] ?? [];
                }
                unset($request);
            }
            send_json(200, ['requests' => $requests]);
        }
        if ($method === 'PATCH') {
            $body = request_body();
            $requestId = filter_var($body['request_id'] ?? null, FILTER_VALIDATE_INT);
            $status = (string)($body['status'] ?? '');
            $note = trim((string)($body['decision_note'] ?? ''));
            if (!$requestId || !in_array($status, ['approved', 'rejected'], true) || mb_strlen($note) > 500) {
                send_json(422, ['error' => 'Choose an existing request, a decision, and a note no longer than 500 characters.']);
            }
            $decision = $pdo->prepare(
                'UPDATE student_document_registration_requests
                 SET request_status = :status, reviewed_by_user_id = :reviewer,
                     reviewed_at = NOW(), decision_note = :decision_note
                 WHERE request_id = :request_id AND request_status = \'pending\''
            );
            $decision->execute([
                'status' => $status,
                'reviewer' => $registrar['user_id'],
                'decision_note' => $note !== '' ? $note : null,
                'request_id' => $requestId,
            ]);
            if ($decision->rowCount() !== 1) {
                send_json(409, ['error' => 'That document request is no longer pending or does not exist.']);
            }
            send_json(200, ['message' => "Registration documents were {$status}."]);
        }
        request_method('GET');
    }

    if ($action === 'student_registration_document_file') {
        request_method('GET');
        require_user('registrar');
        $documentId = filter_var($_GET['document_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$documentId) {
            send_json(422, ['error' => 'A valid registration document is required.']);
        }
        $document = $pdo->prepare(
            'SELECT d.original_filename, d.storage_filename
             FROM student_registration_documents d
             JOIN student_document_registration_requests r ON r.request_id = d.request_id
             WHERE d.document_id = :document_id'
        );
        $document->execute(['document_id' => $documentId]);
        $file = $document->fetch();
        if (!$file) {
            send_json(404, ['error' => 'That registration document was not found.']);
        }
        $path = private_registration_storage_directory()
            . DIRECTORY_SEPARATOR . 'registration-documents'
            . DIRECTORY_SEPARATOR . $file['storage_filename'];
        if (!is_file($path) || !is_readable($path)) {
            send_json(404, ['error' => 'The stored registration document is unavailable.']);
        }
        header('Content-Type: application/pdf');
        header('Content-Length: ' . (string)filesize($path));
        header('Content-Disposition: attachment; filename="registration-document.pdf"; filename*=UTF-8\'\'' . rawurlencode($file['original_filename']));
        header('Cache-Control: private, no-store');
        readfile($path);
        exit;
    }

    if ($action === 'student_courses') {
        request_method('GET');
        $user = require_user('student');
        $statement = $pdo->prepare(
            'SELECT e.enrollment_id, c.course_code, c.course_title, c.units,
                    co.section_code, COALESCE(co.instructor_name, \'Unassigned\') AS instructor
             FROM enrollments e
             JOIN course_offerings co ON co.offering_id = e.offering_id
             JOIN courses c ON c.course_id = co.course_id
             JOIN users sp ON sp.user_id = e.student_user_id
             JOIN programs p ON p.program_id = sp.program_id
             JOIN program_courses pc ON pc.program_id = sp.program_id
               AND pc.course_id = c.course_id AND pc.recommended_year = sp.year_level
             JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
             WHERE e.student_user_id = :student_user_id AND e.enrollment_status = \'approved\'
               AND co.section_code LIKE CONCAT(p.program_code, \'-\', sp.year_level, \'%\')
             ORDER BY c.course_code'
        );
        $statement->execute(['student_user_id' => $user['user_id']]);
        send_json(200, ['courses' => $statement->fetchAll()]);
    }

    if ($action === 'registrar_students') {
        if ($method === 'PATCH') {
            require_user('registrar');
            $userId = filter_var(request_body()['user_id'] ?? null, FILTER_VALIDATE_INT);
            if (!$userId) {
                send_json(422, ['error' => 'Select a valid student record.']);
            }

            $pdo->beginTransaction();
            $student = $pdo->prepare(
                'SELECT student_status FROM users WHERE user_id = :user_id AND role = \'student\' FOR UPDATE'
            );
            $student->execute(['user_id' => $userId]);
            $record = $student->fetch();
            if (!$record) {
                $pdo->rollBack();
                send_json(404, ['error' => 'That student record was not found.']);
            }
            if ($record['student_status'] === 'withdrawn') {
                $pdo->rollBack();
                send_json(409, ['error' => 'That student has already been withdrawn.']);
            }

            $withdraw = $pdo->prepare(
                'UPDATE users SET student_status = \'withdrawn\', account_status = \'suspended\'
                 WHERE user_id = :user_id'
            );
            $withdraw->execute(['user_id' => $userId]);
            $pdo->commit();
            send_json(200, ['message' => 'Student withdrawn. Their account was suspended and academic records were retained.']);
        }
        if ($method === 'POST') {
            require_user('registrar');
            $created = create_user_account($pdo, request_body(), 'student');
            send_json(201, ['message' => 'Student account created. Its initial password is the one entered in the form.', 'user' => $created]);
        }
        request_method('GET');
        require_user('registrar');
        $statement = $pdo->query(
            'SELECT u.user_id, u.full_name, u.email, u.student_number, u.year_level,
                    u.student_status, p.program_name,
                    COALESCE(SUM(CASE WHEN e.enrollment_status = \'approved\' THEN c.units ELSE 0 END), 0) AS units
             FROM users u
             JOIN programs p ON p.program_id = u.program_id
             LEFT JOIN enrollments e ON e.student_user_id = u.user_id
             LEFT JOIN course_offerings co ON co.offering_id = e.offering_id
             LEFT JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
             LEFT JOIN courses c ON c.course_id = co.course_id AND t.term_id IS NOT NULL
             WHERE u.role = \'student\'
             GROUP BY u.user_id, u.full_name, u.email, u.student_number,
                      u.year_level, u.student_status, p.program_name
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
                        COALESCE(u.student_number, u.employee_number, CONCAT(\'USR-\', LPAD(u.user_id, 5, \'0\'))) AS account_number
                 FROM users u
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
            if ($status === 'active') {
                $withdrawnStudent = $pdo->prepare(
                    'SELECT 1 FROM users
                     WHERE user_id = :user_id AND role = \'student\' AND student_status = \'withdrawn\''
                );
                $withdrawnStudent->execute(['user_id' => $userId]);
                if ($withdrawnStudent->fetchColumn()) {
                    send_json(409, ['error' => 'Withdrawn student accounts cannot be reactivated.']);
                }
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
                        COALESCE(GROUP_CONCAT(DISTINCT co.instructor_name ORDER BY co.instructor_name SEPARATOR \', \'), \'Unassigned\') AS instructor
                 FROM courses c
                 LEFT JOIN departments d ON d.department_id = c.department_id
                 LEFT JOIN program_courses pc ON pc.course_id = c.course_id
                 LEFT JOIN programs p ON p.program_id = pc.program_id
                 LEFT JOIN course_offerings co ON co.course_id = c.course_id
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
                    'SELECT u.student_number, u.full_name, u.email, p.program_name, u.year_level, u.student_status
                     FROM users u JOIN programs p ON p.program_id = u.program_id
                     WHERE u.role = \'student\' ORDER BY u.full_name'
                );
                $rows = $statement->fetchAll();
            } else {
                if (!in_array($viewer['role'], ['registrar', 'admin'], true)) {
                    send_json(403, ['error' => 'This report requires a registrar or admin account.']);
                }
                $statement = $pdo->query(
                    'SELECT e.request_code, u.full_name AS student, u.student_number,
                            c.course_code, c.course_title, c.units, e.enrollment_status, e.requested_at
                     FROM enrollments e JOIN users u ON u.user_id = e.student_user_id
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
                    co.section_code, COALESCE(co.instructor_name, \'Unassigned\') AS instructor
             FROM course_offerings co
             JOIN courses c ON c.course_id = co.course_id
             JOIN users sp ON sp.user_id = :student_user_id
             JOIN programs p ON p.program_id = sp.program_id
             JOIN program_courses pc ON pc.program_id = sp.program_id
               AND pc.course_id = c.course_id AND pc.recommended_year = sp.year_level
             JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
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
                            co.instructor_name,
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
                     FROM users sp
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
                     FROM users sp
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
            $instructorName = trim((string)($body['instructor_name'] ?? ''));
            if (!$offeringId || mb_strlen($instructorName) > 160) {
                send_json(422, ['error' => 'Choose a valid course section and instructor name of up to 160 characters.']);
            }
            $sectionExists = $pdo->prepare(
                'SELECT 1 FROM course_offerings
                 WHERE offering_id = :offering_id AND course_number IS NOT NULL'
            );
            $sectionExists->execute(['offering_id' => $offeringId]);
            if (!$sectionExists->fetchColumn()) {
                send_json(404, ['error' => 'Prepare the course sections before adding an instructor reference.']);
            }
            $updateInstructor = $pdo->prepare(
                'UPDATE course_offerings SET instructor_name = :instructor_name
                 WHERE offering_id = :offering_id AND course_number IS NOT NULL'
            );
            $updateInstructor->execute([
                'instructor_name' => $instructorName !== '' ? $instructorName : null,
                'offering_id' => $offeringId,
            ]);
            send_json(200, ['message' => 'Instructor reference saved for this course number.']);
        }
        request_method('GET');
    }

    if ($action === 'registrar_enrollment') {
        $registrar = require_user('registrar');

        if ($method === 'GET') {
            $students = $pdo->query(
                'SELECT sp.user_id, sp.student_number, u.full_name AS student_name,
                        sp.program_id, p.program_code, p.program_name, sp.year_level
                 FROM users sp
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
                     FROM users sp
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
                 FROM users sp
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
                 FROM users sp
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
                 JOIN users sp ON sp.user_id = e.student_user_id
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
                 JOIN users sp ON sp.user_id = :student_user_id
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
                 JOIN users s ON s.user_id = e.student_user_id
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

    send_json(404, ['error' => 'Unknown API action.']);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    foreach ($storedUploads as $path) {
        if (is_file($path)) {
            unlink($path);
        }
    }
    handle_api_error($error);
}
