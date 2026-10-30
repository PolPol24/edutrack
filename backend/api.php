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
    $faceImages = $role === 'student' ? compreface_images($body) : [];

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
        $subject = compreface_new_subject('student', $userId);
        compreface_register_images($subject, $faceImages);
        try {
            $face = $pdo->prepare('INSERT INTO compreface_student_faces (student_user_id, compreface_subject, template_status, consent_at) VALUES (:student_user_id, :subject, \'active\', NOW())');
            $face->execute(['student_user_id' => $userId, 'subject' => $subject]);
        } catch (Throwable $error) {
            try {
                compreface_delete_subject($subject);
            } catch (Throwable $cleanupError) {
                error_log('Unable to clean up CompreFace enrollment after account creation failed: ' . $cleanupError->getMessage());
            }
            throw $error;
        }
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

function finalize_expired_attendance(PDO $pdo): void
{
    $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
    $expired = $pdo->prepare(
        'SELECT s.session_id, cm.offering_id
         FROM attendance_sessions s JOIN class_meetings cm ON cm.meeting_id = s.meeting_id
         WHERE s.attendance_deadline <= :deadline_now AND s.absences_finalized_at IS NULL'
    );
    $expired->execute(['deadline_now' => $now->format('Y-m-d H:i:s')]);
    $sessions = $expired->fetchAll();
    if (!$sessions) return;

    $pdo->beginTransaction();
    $finalize = $pdo->prepare(
        'UPDATE attendance_sessions SET session_status = \'closed\',
         closed_at = COALESCE(closed_at, :closed_at), absences_finalized_at = :finalized_at
         WHERE session_id = :session_id AND absences_finalized_at IS NULL'
    );
    $absent = $pdo->prepare(
        'INSERT IGNORE INTO attendance_records (session_id, student_user_id, attendance_status, verification_method)
         SELECT :session_id, e.student_user_id, \'absent\', \'system\' FROM enrollments e
         WHERE e.offering_id = :offering_id AND e.enrollment_status = \'approved\''
    );
    foreach ($sessions as $session) {
        $finalize->execute([
            'closed_at' => $now->format('Y-m-d H:i:s'),
            'finalized_at' => $now->format('Y-m-d H:i:s'),
            'session_id' => $session['session_id'],
        ]);
        if ($finalize->rowCount() === 1) {
            $absent->execute(['session_id' => $session['session_id'], 'offering_id' => $session['offering_id']]);
        }
    }
    $pdo->commit();
}

function compreface_configuration(): array
{
    global $localConfig;
    $url = trim((string)($localConfig['compreface_url'] ?? ''));
    $apiKey = trim((string)($localConfig['compreface_api_key'] ?? ''));
    $parts = parse_url($url);
    if (!$parts || !in_array(strtolower((string)($parts['scheme'] ?? '')), ['http', 'https'], true)
        || !in_array(strtolower((string)($parts['host'] ?? '')), ['localhost', '127.0.0.1', '::1'], true)
        || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
        || $apiKey === '' || str_contains($apiKey, 'replace-with')) {
        throw new RuntimeException('Configure a local CompreFace URL and service API key in backend/local_config.php.');
    }
    if (!extension_loaded('curl')) {
        throw new RuntimeException('Enable the PHP cURL extension to connect to local CompreFace.');
    }
    return [rtrim($url, '/'), $apiKey];
}

function compreface_http(string $method, string $path, ?array $form = null): array
{
    [$baseUrl, $apiKey] = compreface_configuration();
    $curl = curl_init($baseUrl . '/api/v1/recognition' . $path);
    if ($curl === false) {
        throw new RuntimeException('Unable to initialize the CompreFace request.');
    }
    curl_setopt_array($curl, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => ['x-api-key: ' . $apiKey, 'Accept: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 60,
    ]);
    if ($form !== null) {
        curl_setopt($curl, CURLOPT_POSTFIELDS, $form);
    }
    $response = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if (!is_string($response)) {
        throw new RuntimeException('The local CompreFace service could not be reached: ' . $curlError);
    }
    if ($status === 404 && $method === 'DELETE') {
        return [];
    }
    $payload = json_decode($response, true);
    if ($status < 200 || $status >= 300 || !is_array($payload)) {
        throw new RuntimeException('The local CompreFace request failed (HTTP ' . $status . ').');
    }
    return $payload;
}

function compreface_images(array $body, bool $requireConsent = true): array
{
    $images = $body['face_images'] ?? null;
    if (($requireConsent && ($body['face_consent'] ?? false) !== true)
        || !is_array($images) || count($images) < 3 || count($images) > 5) {
        send_json(422, ['error' => 'Capture at least three face images and confirm that they will be processed and stored by the local CompreFace service.']);
    }
    $decoded = [];
    foreach ($images as $image) {
        if (!is_string($image) || !preg_match('/^data:image\\/(jpeg|png|webp);base64,([A-Za-z0-9+\\/=]+)$/', $image, $matches)) {
            send_json(422, ['error' => 'A face image is invalid. Capture your face again.']);
        }
        $bytes = base64_decode($matches[2], true);
        $imageInfo = $bytes === false ? false : getimagesizefromstring($bytes);
        if (!is_string($bytes) || strlen($bytes) > 5 * 1024 * 1024 || $imageInfo === false
            || !in_array($imageInfo['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) {
            send_json(422, ['error' => 'A face image is too large or uses an unsupported format. Capture your face again.']);
        }
        $decoded[] = ['bytes' => $bytes, 'mime' => $imageInfo['mime']];
    }
    return $decoded;
}

function registration_document_uploads(int $yearLevel): array
{
    $uploads = [];
    for ($slot = 1; $slot <= 3; $slot++) {
        $file = $_FILES['document_' . $slot] ?? null;
        if ($yearLevel !== 1) {
            if (is_array($file) && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                send_json(422, ['error' => 'Registration documents are required only for first-year applicants.']);
            }
            continue;
        }
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            send_json(422, ['error' => 'First-year applicants must upload all three required PDF documents.']);
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
    return $uploads;
}

function compreface_new_subject(string $type, int $id): string
{
    if (!in_array($type, ['student', 'registration'], true)) {
        throw new InvalidArgumentException('Unsupported CompreFace subject type.');
    }
    return 'edutrack-' . $type . '-' . $id . '-' . bin2hex(random_bytes(6));
}

function compreface_add_images(string $subject, array $images): void
{
    $temporaryFiles = [];
    try {
        foreach ($images as $image) {
            $temporaryPath = tempnam(sys_get_temp_dir(), 'edutrack-face-');
            if ($temporaryPath === false || file_put_contents($temporaryPath, $image['bytes'], LOCK_EX) !== strlen($image['bytes'])) {
                if (is_string($temporaryPath) && is_file($temporaryPath)) {
                    unlink($temporaryPath);
                }
                throw new RuntimeException('Unable to prepare a face image for local CompreFace.');
            }
            $temporaryFiles[] = $temporaryPath;
            $file = new CURLFile($temporaryPath, $image['mime'], 'face.jpg');
            $path = '/faces?' . http_build_query(['subject' => $subject, 'det_prob_threshold' => '0.8']);
            compreface_http('POST', $path, ['file' => $file]);
        }
    } finally {
        foreach ($temporaryFiles as $temporaryPath) {
            if (is_file($temporaryPath) && !unlink($temporaryPath)) {
                error_log('Unable to remove temporary CompreFace image: ' . $temporaryPath);
            }
        }
    }
}

function compreface_delete_subject(string $subject): void
{
    compreface_http('DELETE', '/subjects/' . rawurlencode($subject));
}

function compreface_register_images(string $subject, array $images): void
{
    try {
        compreface_add_images($subject, $images);
    } catch (Throwable $error) {
        try {
            compreface_delete_subject($subject);
        } catch (Throwable $cleanupError) {
            error_log('Unable to clean up incomplete CompreFace enrollment: ' . $cleanupError->getMessage());
        }
        throw $error;
    }
}

function compreface_recognize_image(array $image): array
{
    $temporaryPath = tempnam(sys_get_temp_dir(), 'edutrack-face-');
    if ($temporaryPath === false || file_put_contents($temporaryPath, $image['bytes'], LOCK_EX) !== strlen($image['bytes'])) {
        if (is_string($temporaryPath) && is_file($temporaryPath)) {
            unlink($temporaryPath);
        }
        throw new RuntimeException('Unable to prepare a face image for local CompreFace.');
    }
    try {
        $file = new CURLFile($temporaryPath, $image['mime'], 'check-in.jpg');
        $payload = compreface_http('POST', '/recognize?limit=0&prediction_count=5&det_prob_threshold=0.8', ['file' => $file]);
        return is_array($payload['result'] ?? null) ? $payload['result'] : [];
    } finally {
        if (is_file($temporaryPath) && !unlink($temporaryPath)) {
            error_log('Unable to remove temporary CompreFace check-in image: ' . $temporaryPath);
        }
    }
}

try {
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    $pdo = database();

    if (in_array($action, ['faculty_classes', 'faculty_grades', 'faculty_attendance'], true)) {
        send_json(404, ['error' => 'Faculty portal workflows are no longer available.']);
    }

    if ($action === 'student_registration_options') {
        request_method('GET');
        $programs = $pdo->query(
            'SELECT program_id, program_code, program_name
             FROM programs WHERE is_active = 1 ORDER BY program_code'
        )->fetchAll();
        send_json(200, ['programs' => $programs]);
    }

    if ($action === 'student_registrations') {
        if ($method === 'POST') {
            $body = isset($_POST['registration_data'])
                ? json_decode((string)$_POST['registration_data'], true)
                : request_body();
            if (!is_array($body)) {
                send_json(422, ['error' => 'Registration details are invalid. Please check the form and try again.']);
            }
            $studentNumber = trim((string)($body['student_number'] ?? ''));
            $firstName = trim((string)($body['first_name'] ?? ''));
            $lastName = trim((string)($body['last_name'] ?? ''));
            $suffix = trim((string)($body['suffix'] ?? ''));
            $dateOfBirth = trim((string)($body['date_of_birth'] ?? ''));
            $programId = trim((string)($body['program_id'] ?? ''));
            $yearLevel = filter_var($body['year_level'] ?? null, FILTER_VALIDATE_INT);
            $email = strtolower(trim((string)($body['email'] ?? '')));
            $phone = trim((string)($body['phone'] ?? ''));
            $password = (string)($body['password'] ?? '');
            $faceImages = compreface_images($body);
            $birthDate = DateTimeImmutable::createFromFormat('!Y-m-d', $dateOfBirth);
            $birthDateErrors = DateTimeImmutable::getLastErrors();

            if ($studentNumber === '' || mb_strlen($studentNumber) > 30
                || $firstName === '' || mb_strlen($firstName) > 80
                || $lastName === '' || mb_strlen($lastName) > 80
                || mb_strlen($suffix) > 20
                || $programId === '' || mb_strlen($programId) > 10
                || !$yearLevel || $yearLevel < 1 || $yearLevel > 4
                || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254
                || strlen($phone) > 40
                || strlen($password) < 8
                || !$birthDate || ($birthDateErrors !== false && ($birthDateErrors['warning_count'] || $birthDateErrors['error_count']))
                || $birthDate->format('Y-m-d') !== $dateOfBirth
                || $birthDate > new DateTimeImmutable('today')) {
                send_json(422, ['error' => 'Check the required fields. Use a valid student number, name, past date of birth, program, year level, email, and a password of at least 8 characters.']);
            }
            $documentUploads = registration_document_uploads((int)$yearLevel);

            $program = $pdo->prepare('SELECT 1 FROM programs WHERE program_id = :program_id AND is_active = 1');
            $program->execute(['program_id' => $programId]);
            if (!$program->fetchColumn()) {
                send_json(422, ['error' => 'Choose an active academic program.']);
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
                   (student_number, first_name, last_name, name_suffix, date_of_birth, program_id, year_level, email, phone, password_hash)
                 VALUES (:student_number, :first_name, :last_name, :name_suffix, :date_of_birth, :program_id, :year_level, :email, :phone, :password_hash)'
            );
            $insert->execute([
                'student_number' => $studentNumber,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name_suffix' => $suffix !== '' ? $suffix : null,
                'date_of_birth' => $dateOfBirth,
                'program_id' => $programId,
                'year_level' => $yearLevel,
                'email' => $email,
                'phone' => $phone !== '' ? $phone : null,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            ]);
            $requestId = (int)$pdo->lastInsertId();
            if ($documentUploads) {
                $storageDirectory = private_registration_storage_directory()
                    . DIRECTORY_SEPARATOR . 'registration-documents';
                if (!is_dir($storageDirectory)
                    && !mkdir($storageDirectory, 0700, true)
                    && !is_dir($storageDirectory)) {
                    throw new RuntimeException('Unable to create private registration document storage.');
                }
                $insertDocument = $pdo->prepare(
                    'INSERT INTO student_registration_request_documents
                       (request_id, slot_number, original_filename, storage_filename, size_bytes)
                     VALUES (:request_id, :slot_number, :original_filename, :storage_filename, :size_bytes)'
                );
                foreach ($documentUploads as $upload) {
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
            }
            $subject = compreface_new_subject('registration', $requestId);
            compreface_register_images($subject, $faceImages);
            try {
                $saveFace = $pdo->prepare('INSERT INTO pending_compreface_student_faces (request_id, compreface_subject, consent_at) VALUES (:request_id, :subject, NOW())');
                $saveFace->execute(['request_id' => $requestId, 'subject' => $subject]);
            } catch (Throwable $error) {
                try {
                    compreface_delete_subject($subject);
                } catch (Throwable $cleanupError) {
                    error_log('Unable to clean up pending CompreFace enrollment after registration failed: ' . $cleanupError->getMessage());
                }
                throw $error;
            }
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
                    r.date_of_birth, r.program_id, r.year_level,
                    r.email, r.phone, r.request_status, r.created_at, r.reviewed_at,
                    p.program_code, p.program_name,
                    (SELECT COUNT(*) FROM student_registration_request_documents d
                     WHERE d.request_id = r.request_id) AS document_count
             FROM student_registration_requests r
             LEFT JOIN programs p ON p.program_id = r.program_id
             ORDER BY CASE r.request_status WHEN \'pending\' THEN 0 ELSE 1 END, r.created_at DESC'
        )->fetchAll();
        $documents = $pdo->prepare(
            'SELECT document_id, slot_number, original_filename, size_bytes
             FROM student_registration_request_documents
             WHERE request_id = :request_id ORDER BY slot_number'
        );
        foreach ($requests as &$request) {
            $documents->execute(['request_id' => $request['request_id']]);
            $request['documents'] = $documents->fetchAll();
        }
        unset($request);
        $programs = $pdo->query(
            'SELECT program_id, program_code, program_name
             FROM programs WHERE is_active = 1 ORDER BY program_code'
        )->fetchAll();
        send_json(200, ['requests' => $requests, 'programs' => $programs]);
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
                        r.program_id, r.year_level, r.phone
                 FROM student_registration_requests r
                 WHERE r.request_id = :request_id FOR UPDATE'
            );
            $requestQuery->execute(['request_id' => $requestId]);
            $registration = $requestQuery->fetch();
            if (!$registration || $registration['request_status'] !== 'pending') {
                $pdo->rollBack();
                send_json(409, ['error' => 'That registration request is no longer pending or does not exist.']);
            }
            if ($status === 'approved' && (int)$registration['year_level'] === 1) {
                $documentCount = $pdo->prepare(
                    'SELECT COUNT(*) FROM student_registration_request_documents
                     WHERE request_id = :request_id'
                );
                $documentCount->execute(['request_id' => $requestId]);
                if ((int)$documentCount->fetchColumn() !== 3) {
                    $pdo->rollBack();
                    send_json(409, ['error' => 'First-year registration cannot be approved until all required documents are submitted.']);
                }
            }

            $createdUserId = null;
            if ($status === 'approved') {
                if (!$registration['program_id'] || !$registration['year_level']) {
                    $pdo->rollBack();
                    send_json(422, ['error' => 'This request has no valid program and year level. Ask the student to submit a new registration.']);
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
                       (full_name, email, phone, password_hash, role, account_status, student_number,
                        first_name, last_name, name_suffix, date_of_birth, program_id, year_level,
                        student_status)
                     VALUES
                       (:full_name, :email, :phone, :password_hash, \'student\', \'active\', :student_number,
                        :first_name, :last_name, :name_suffix, :date_of_birth, :program_id, :year_level,
                        \'active\')'
                );
                $createUser->execute([
                    'full_name' => $fullName,
                    'email' => $registration['email'],
                    'phone' => $registration['phone'],
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
                $pendingFace = $pdo->prepare('SELECT compreface_subject, consent_at FROM pending_compreface_student_faces WHERE request_id = :request_id FOR UPDATE');
                $pendingFace->execute(['request_id' => $requestId]);
                $faceRow = $pendingFace->fetch();
                if (!$faceRow) { $pdo->rollBack(); send_json(409, ['error' => 'This request has no enrolled face template. Ask the student to submit a new registration.']); }
                $saveFace = $pdo->prepare('INSERT INTO compreface_student_faces (student_user_id, compreface_subject, template_status, consent_at) VALUES (:student_user_id, :subject, \'active\', :consent_at)');
                $saveFace->execute(['student_user_id' => $createdUserId, 'subject' => $faceRow['compreface_subject'], 'consent_at' => $faceRow['consent_at']]);
                $deleteFace = $pdo->prepare('DELETE FROM pending_compreface_student_faces WHERE request_id = :request_id');
                $deleteFace->execute(['request_id' => $requestId]);
            }

            if ($status === 'rejected') {
                $pendingFace = $pdo->prepare('SELECT compreface_subject FROM pending_compreface_student_faces WHERE request_id = :request_id FOR UPDATE');
                $pendingFace->execute(['request_id' => $requestId]);
                $faceSubject = $pendingFace->fetchColumn();
                if (is_string($faceSubject) && $faceSubject !== '') {
                    compreface_delete_subject($faceSubject);
                }
                $deleteFace = $pdo->prepare('DELETE FROM pending_compreface_student_faces WHERE request_id = :request_id');
                $deleteFace->execute(['request_id' => $requestId]);
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

    if ($action === 'verify_dashboard_password') {
        request_method('POST');
        $user = require_user('admin');
        $password = (string)(request_body()['password'] ?? '');
        if ($password === '') send_json(422, ['error' => 'Enter the account password to leave kiosk mode.']);
        $statement = $pdo->prepare('SELECT password_hash FROM users WHERE user_id = :user_id AND account_status = \'active\' LIMIT 1');
        $statement->execute(['user_id' => $user['user_id']]);
        $passwordHash = $statement->fetchColumn();
        if (!is_string($passwordHash) || !password_verify($password, $passwordHash)) {
            send_json(403, ['error' => 'That password did not match the signed-in administrator account.']);
        }
        send_json(200, ['verified' => true]);
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
            $hasSubmittedDocuments = $pdo->prepare(
                'SELECT EXISTS (
                   SELECT 1 FROM student_document_registration_requests
                   WHERE student_user_id = :student_user_id
                 ) OR EXISTS (
                   SELECT 1 FROM student_registration_requests r
                   JOIN student_registration_request_documents d ON d.request_id = r.request_id
                   WHERE r.created_user_id = :created_user_id
                 )'
            );
            $hasSubmittedDocuments->execute([
                'student_user_id' => $student['user_id'],
                'created_user_id' => $student['user_id'],
            ]);
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
                'has_submitted_documents' => (bool)$hasSubmittedDocuments->fetchColumn(),
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
                        u.full_name, u.student_number, u.email, u.phone, p.program_name, u.year_level,
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

    if ($action === 'student_registration_request_document_file') {
        request_method('GET');
        require_user('registrar');
        $documentId = filter_var($_GET['document_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$documentId) {
            send_json(422, ['error' => 'A valid registration document is required.']);
        }
        $document = $pdo->prepare(
            'SELECT d.original_filename, d.storage_filename
             FROM student_registration_request_documents d
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
        $disposition = ($_GET['disposition'] ?? '') === 'attachment' ? 'attachment' : 'inline';
        header('Content-Disposition: ' . $disposition . '; filename="registration-document.pdf"; filename*=UTF-8\'\'' . rawurlencode($file['original_filename']));
        header('Cache-Control: private, no-store');
        readfile($path);
        exit;
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
        $disposition = ($_GET['disposition'] ?? '') === 'attachment' ? 'attachment' : 'inline';
        header('Content-Disposition: ' . $disposition . '; filename="registration-document.pdf"; filename*=UTF-8\'\'' . rawurlencode($file['original_filename']));
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
                    'SELECT sp.user_id,
                            COALESCE(sp.student_number, CONCAT("USR-", sp.user_id)) AS student_number,
                            COALESCE(sp.first_name, sp.full_name) AS first_name,
                            COALESCE(sp.last_name, "") AS last_name, sp.name_suffix,
                            sp.email AS student_email, sp.year_level,
                            COALESCE(section_assignment.section_code, roster.section_code) AS section_code
                     FROM users sp
                     JOIN users account ON account.user_id = sp.user_id AND account.account_status = "active"
                     LEFT JOIN student_section_assignments section_assignment
                       ON section_assignment.student_user_id = sp.user_id
                      AND section_assignment.term_id = :term_id
                     LEFT JOIN campus_student_registry roster ON roster.student_number = sp.student_number
                     WHERE sp.role = "student" AND sp.program_id = :program_id
                       AND sp.student_status = "active" AND sp.year_level IS NOT NULL
                     ORDER BY section_assignment.section_code, roster.section_code,
                              sp.year_level, sp.full_name'
                );
                $rosterQuery->execute(['program_id' => $programId, 'term_id' => $termId]);
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
                    'SELECT sp.user_id,
                            COALESCE(section_assignment.section_code, r.section_code) AS section_code
                     FROM users sp
                     JOIN users u ON u.user_id = sp.user_id AND u.account_status = \'active\'
                     LEFT JOIN student_section_assignments section_assignment
                       ON section_assignment.student_user_id = sp.user_id
                      AND section_assignment.term_id = :term_id
                     LEFT JOIN campus_student_registry r ON r.student_number = sp.student_number
                     WHERE sp.program_id = :program_id AND sp.student_status = \'active\'
                     ORDER BY sp.student_number'
                );
                $profiles->execute(['program_id' => $programId, 'term_id' => $termId]);
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
            if (($body['task'] ?? '') === 'assign_student') {
                $studentUserId = filter_var($body['student_user_id'] ?? null, FILTER_VALIDATE_INT);
                $termId = filter_var($body['term_id'] ?? null, FILTER_VALIDATE_INT);
                $programId = trim((string)($body['program_id'] ?? ''));
                $section = strtoupper(trim((string)($body['section_code'] ?? '')));
                if (!$studentUserId || !$termId || $programId === '' || !in_array($section, ['A', 'B', 'C'], true)) {
                    send_json(422, ['error' => 'Choose an active student, semester, and section A, B, or C.']);
                }

                $studentQuery = $pdo->prepare(
                    'SELECT sp.user_id, sp.program_id, p.program_code, sp.year_level
                     FROM users sp
                     JOIN users account ON account.user_id = sp.user_id AND account.account_status = "active"
                     JOIN programs p ON p.program_id = sp.program_id AND p.is_active = 1
                     JOIN academic_terms t ON t.term_id = :term_id
                       AND t.term_status IN ("active", "upcoming")
                       AND t.term_name IN ("1st semester", "2nd semester")
                     WHERE sp.user_id = :student_user_id AND sp.role = "student"
                       AND sp.student_status = "active" AND sp.year_level IS NOT NULL
                     FOR UPDATE'
                );
                $studentQuery->execute(['term_id' => $termId, 'student_user_id' => $studentUserId]);
                $student = $studentQuery->fetch();
                if (!$student) {
                    send_json(404, ['error' => 'That student or semester is no longer available.']);
                }
                if ($student['program_id'] !== $programId) {
                    send_json(422, ['error' => 'The student does not belong to the selected program.']);
                }

                $enrolled = $pdo->prepare(
                    'SELECT 1 FROM enrollments e
                     JOIN course_offerings co ON co.offering_id = e.offering_id
                     WHERE e.student_user_id = :student_user_id AND co.term_id = :term_id
                       AND e.enrollment_status IN ("pending", "approved")
                       AND co.section_code <> :section_code LIMIT 1'
                );
                $enrolled->execute([
                    'student_user_id' => $studentUserId,
                    'term_id' => $termId,
                    'section_code' => $student['program_code'] . '-' . $student['year_level'] . '-' . $section,
                ]);
                if ($enrolled->fetchColumn()) {
                    send_json(409, ['error' => 'This student already has an enrollment in a different section for the selected semester. Update the enrollment records before changing their section.']);
                }

                $saveSection = $pdo->prepare(
                    'INSERT INTO student_section_assignments
                       (student_user_id, term_id, section_code, assigned_by_user_id)
                     VALUES (:student_user_id, :term_id, :section_code, :assigned_by)
                     ON DUPLICATE KEY UPDATE section_code = VALUES(section_code),
                       assigned_by_user_id = VALUES(assigned_by_user_id), assigned_at = NOW()'
                );
                $saveSection->execute([
                    'student_user_id' => $studentUserId,
                    'term_id' => $termId,
                    'section_code' => $section,
                    'assigned_by' => $registrar['user_id'],
                ]);
                send_json(200, ['message' => 'Student assigned to Section ' . $section . '.']);
            }
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
                        sp.program_id, p.program_code, p.program_name, sp.year_level,
                        (EXISTS (
                            SELECT 1 FROM student_document_registration_requests documents
                            WHERE documents.student_user_id = sp.user_id
                          ) OR EXISTS (
                            SELECT 1 FROM student_registration_requests registration
                            JOIN student_registration_request_documents documents
                              ON documents.request_id = registration.request_id
                            WHERE registration.created_user_id = sp.user_id
                          )) AS has_submitted_documents
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

            if ((int)$student['year_level'] === 1) {
                $hasSubmittedDocuments = $pdo->prepare(
                    'SELECT EXISTS (
                       SELECT 1 FROM student_document_registration_requests
                       WHERE student_user_id = :student_user_id
                     ) OR EXISTS (
                       SELECT 1 FROM student_registration_requests r
                       JOIN student_registration_request_documents d ON d.request_id = r.request_id
                       WHERE r.created_user_id = :created_user_id
                     )'
                );
                $hasSubmittedDocuments->execute([
                    'student_user_id' => $studentUserId,
                    'created_user_id' => $studentUserId,
                ]);
                if (!(bool)$hasSubmittedDocuments->fetchColumn()) {
                    $pdo->rollBack();
                    send_json(403, ['error' => 'First-year students must submit their registration documents before enrollment.']);
                }
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
            $studentYear = $pdo->prepare(
                'SELECT year_level FROM users
                 WHERE user_id = :student_user_id AND role = \'student\'
                 FOR UPDATE'
            );
            $studentYear->execute(['student_user_id' => $user['user_id']]);
            $yearLevel = $studentYear->fetchColumn();
            if ($yearLevel === false) {
                $pdo->rollBack();
                send_json(404, ['error' => 'Student account not found.']);
            }
            if ((int)$yearLevel === 1) {
                $hasSubmittedDocuments = $pdo->prepare(
                    'SELECT EXISTS (
                       SELECT 1 FROM student_document_registration_requests
                       WHERE student_user_id = :student_user_id
                     ) OR EXISTS (
                       SELECT 1 FROM student_registration_requests r
                       JOIN student_registration_request_documents d ON d.request_id = r.request_id
                       WHERE r.created_user_id = :created_user_id
                     )'
                );
                $hasSubmittedDocuments->execute([
                    'student_user_id' => $user['user_id'],
                    'created_user_id' => $user['user_id'],
                ]);
                if (!(bool)$hasSubmittedDocuments->fetchColumn()) {
                    $pdo->rollBack();
                    send_json(403, ['error' => 'First-year students must submit their registration documents before enrolling in courses.']);
                }
            }

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

    if ($action === 'attendance_admin') {
        $admin = require_user('admin');
        finalize_expired_attendance($pdo);
        if ($method === 'GET') {
            $offerings = $pdo->query(
                'SELECT co.offering_id, co.section_code, co.instructor_name, c.course_code, c.course_title,
                        t.term_name, ay.year_label
                 FROM course_offerings co JOIN courses c ON c.course_id = co.course_id
                 JOIN academic_terms t ON t.term_id = co.term_id JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
                 WHERE t.term_status = \'active\' AND co.offering_status <> \'cancelled\'
                 ORDER BY c.course_code, co.section_code'
            )->fetchAll();
            $meetings = $pdo->query(
                'SELECT cm.meeting_id, cm.offering_id, cm.day_of_week, cm.start_time, cm.end_time, cm.room,
                        co.section_code, c.course_code, c.course_title, co.instructor_name
                 FROM class_meetings cm JOIN course_offerings co ON co.offering_id = cm.offering_id
                 JOIN courses c ON c.course_id = co.course_id ORDER BY cm.room, cm.day_of_week, cm.start_time'
            )->fetchAll();
            $kiosks = $pdo->query(
                'SELECT k.kiosk_id, k.kiosk_name, k.room, k.kiosk_status,
                        (SELECT s.session_status FROM attendance_sessions s WHERE s.kiosk_id = k.kiosk_id AND s.session_date = CURDATE() ORDER BY s.session_id DESC LIMIT 1) AS session_status
                 FROM attendance_kiosks k ORDER BY k.room'
            )->fetchAll();
            $sessions = $pdo->query(
                'SELECT s.session_id, s.session_date, s.starts_at, s.ends_at, s.attendance_deadline,
                        s.grace_minutes, s.session_status, k.room, c.course_code, c.course_title, co.section_code,
                        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.session_id AND ar.attendance_status IN (\'present\', \'late\')) AS checked_in
                 FROM attendance_sessions s JOIN attendance_kiosks k ON k.kiosk_id = s.kiosk_id
                 JOIN class_meetings cm ON cm.meeting_id = s.meeting_id
                 JOIN course_offerings co ON co.offering_id = cm.offering_id JOIN courses c ON c.course_id = co.course_id
                 ORDER BY s.session_date DESC, s.starts_at DESC LIMIT 100'
            )->fetchAll();
            $settings = $pdo->query('SELECT grace_minutes, attendance_window_minutes, face_similarity_threshold, face_quality_threshold FROM attendance_settings WHERE setting_id = 1')->fetch();
            send_json(200, ['offerings' => $offerings, 'meetings' => $meetings, 'kiosks' => $kiosks, 'sessions' => $sessions, 'settings' => $settings]);
        }
        if ($method === 'POST') {
            $body = request_body();
            $type = (string)($body['type'] ?? '');
            if ($type === 'meeting') {
                $offeringId = filter_var($body['offering_id'] ?? null, FILTER_VALIDATE_INT);
                $day = strtolower(trim((string)($body['day_of_week'] ?? '')));
                $start = (string)($body['start_time'] ?? '');
                $end = (string)($body['end_time'] ?? '');
                $room = trim((string)($body['room'] ?? ''));
                if (!$offeringId || !in_array($day, ['monday','tuesday','wednesday','thursday','friday','saturday'], true)
                    || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $start) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $end)
                    || $end <= $start || $room === '' || mb_strlen($room) > 100) {
                    send_json(422, ['error' => 'Choose an active course offering, a valid day and time range, and a classroom.']);
                }
                $exists = $pdo->prepare('SELECT 1 FROM course_offerings WHERE offering_id = :id AND offering_status <> \'cancelled\'');
                $exists->execute(['id' => $offeringId]);
                if (!$exists->fetchColumn()) send_json(404, ['error' => 'That course offering is unavailable.']);
                $overlap = $pdo->prepare(
                    'SELECT 1 FROM class_meetings WHERE room = :room AND day_of_week = :day
                     AND start_time < :end_time AND end_time > :start_time LIMIT 1'
                );
                $overlap->execute(['room' => $room, 'day' => $day, 'end_time' => $end, 'start_time' => $start]);
                if ($overlap->fetchColumn()) send_json(409, ['error' => 'That room already has a class scheduled during this time.']);
                $insert = $pdo->prepare('INSERT INTO class_meetings (offering_id, day_of_week, start_time, end_time, room) VALUES (:offering_id, :day, :start_time, :end_time, :room)');
                $insert->execute(['offering_id' => $offeringId, 'day' => $day, 'start_time' => $start, 'end_time' => $end, 'room' => $room]);
                send_json(201, ['message' => 'Class meeting scheduled.']);
            }
            if ($type === 'start_session') {
                $meetingId = filter_var($body['meeting_id'] ?? null, FILTER_VALIDATE_INT);
                if (!$meetingId) send_json(422, ['error' => 'Choose a scheduled class to start.']);
                $meetingQuery = $pdo->prepare(
                    'SELECT cm.meeting_id, cm.day_of_week, cm.start_time, cm.end_time, cm.room, co.offering_id
                     FROM class_meetings cm JOIN course_offerings co ON co.offering_id = cm.offering_id
                     JOIN academic_terms t ON t.term_id = co.term_id AND t.term_status = \'active\'
                     JOIN attendance_kiosks k ON k.room = cm.room AND k.kiosk_status = \'active\'
                     WHERE cm.meeting_id = :meeting_id LIMIT 1'
                );
                $meetingQuery->execute(['meeting_id' => $meetingId]); $meeting = $meetingQuery->fetch();
                if (!$meeting) send_json(404, ['error' => 'This scheduled class has no active kiosk assigned.']);
                $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
                if ($meeting['day_of_week'] !== strtolower($now->format('l'))) send_json(409, ['error' => 'You can only start a class scheduled for today.']);
                $scheduledEnd = new DateTimeImmutable($now->format('Y-m-d') . ' ' . $meeting['end_time'], new DateTimeZone('Asia/Manila'));
                if ($now >= $scheduledEnd) send_json(409, ['error' => 'The scheduled class end time has passed.']);
                $sessionStart = $now;
                $settings = $pdo->query('SELECT grace_minutes, attendance_window_minutes FROM attendance_settings WHERE setting_id = 1')->fetch();
                $deadline = $sessionStart->modify('+' . (int)$settings['attendance_window_minutes'] . ' minutes');
                if ($deadline > $scheduledEnd) $deadline = $scheduledEnd;
                if ($deadline <= $now) send_json(409, ['error' => 'There is not enough time left in the attendance window.']);
                $kiosk = $pdo->prepare('SELECT kiosk_id FROM attendance_kiosks WHERE room = :room AND kiosk_status = \'active\' LIMIT 1'); $kiosk->execute(['room' => $meeting['room']]);
                $insert = $pdo->prepare('INSERT INTO attendance_sessions (meeting_id, kiosk_id, session_date, starts_at, ends_at, attendance_deadline, grace_minutes) VALUES (:meeting_id, :kiosk_id, :session_date, :starts_at, :ends_at, :deadline, :grace)');
                try {
                    $insert->execute(['meeting_id' => $meetingId, 'kiosk_id' => $kiosk->fetchColumn(), 'session_date' => $now->format('Y-m-d'), 'starts_at' => $sessionStart->format('Y-m-d H:i:s'), 'ends_at' => $scheduledEnd->format('Y-m-d H:i:s'), 'deadline' => $deadline->format('Y-m-d H:i:s'), 'grace' => (int)$settings['grace_minutes']]);
                } catch (PDOException $error) { if ($error->getCode() === '23000') send_json(409, ['error' => 'An attendance session already exists for this class today.']); throw $error; }
                send_json(201, ['message' => 'Attendance session started.']);
            }
            if ($type === 'kiosk') {
                $name = trim((string)($body['kiosk_name'] ?? ''));
                $room = trim((string)($body['room'] ?? ''));
                if ($name === '' || mb_strlen($name) > 120 || $room === '' || mb_strlen($room) > 100) send_json(422, ['error' => 'Provide a kiosk name and classroom.']);
                $scheduledRoom = $pdo->prepare('SELECT 1 FROM class_meetings WHERE room = :room LIMIT 1');
                $scheduledRoom->execute(['room' => $room]);
                if (!$scheduledRoom->fetchColumn()) send_json(422, ['error' => 'Schedule at least one class in this classroom before registering its kiosk.']);
                $secret = bin2hex(random_bytes(32));
                $insert = $pdo->prepare('INSERT INTO attendance_kiosks (kiosk_name, room, secret_hash, created_by_user_id) VALUES (:name, :room, :secret_hash, :creator)');
                $insert->execute(['name' => $name, 'room' => $room, 'secret_hash' => hash('sha256', $secret), 'creator' => $admin['user_id']]);
                send_json(201, ['message' => 'Kiosk registered. Save its pairing secret now; it will not be shown again.', 'kiosk' => ['kiosk_id' => (int)$pdo->lastInsertId(), 'kiosk_name' => $name, 'room' => $room], 'secret' => $secret]);
            }
            if ($type === 'settings') {
                $grace = filter_var($body['grace_minutes'] ?? null, FILTER_VALIDATE_INT);
                $windowMinutes = filter_var($body['attendance_window_minutes'] ?? null, FILTER_VALIDATE_INT);
                $similarity = filter_var($body['face_similarity_threshold'] ?? null, FILTER_VALIDATE_FLOAT);
                $quality = filter_var($body['face_quality_threshold'] ?? null, FILTER_VALIDATE_FLOAT);
                if ($grace === false || $grace < 0 || $grace > 60 || $windowMinutes === false || $windowMinutes < 15 || $windowMinutes > 480 || $similarity === false || $similarity < 0.30 || $similarity > 0.90 || $quality === false || $quality < 0.40 || $quality > 0.95) send_json(422, ['error' => 'Use a grace period from 0–60 minutes, attendance window from 15–480 minutes, face match from 0.30–0.90, and liveness confidence from 0.40–0.95.']);
                $update = $pdo->prepare('UPDATE attendance_settings SET grace_minutes = :grace, attendance_window_minutes = :window_minutes, face_similarity_threshold = :similarity, face_quality_threshold = :quality, updated_by_user_id = :admin WHERE setting_id = 1');
                $update->execute(['grace' => $grace, 'window_minutes' => $windowMinutes, 'similarity' => $similarity, 'quality' => $quality, 'admin' => $admin['user_id']]);
                send_json(200, ['message' => 'Attendance settings saved.']);
            }
            send_json(422, ['error' => 'Choose a supported attendance administration action.']);
        }
        if ($method === 'PATCH') {
            $body = request_body();
            $meetingId = filter_var($body['meeting_id'] ?? null, FILTER_VALIDATE_INT);
            if ($meetingId) {
                if (!empty($body['delete'])) {
                    $delete = $pdo->prepare('DELETE FROM class_meetings WHERE meeting_id = :id AND NOT EXISTS (SELECT 1 FROM attendance_sessions WHERE meeting_id = :session_meeting_id)');
                    $delete->execute(['id' => $meetingId, 'session_meeting_id' => $meetingId]);
                    if (!$delete->rowCount()) send_json(409, ['error' => 'This class meeting has attendance history and cannot be removed.']);
                    send_json(200, ['message' => 'Class meeting removed.']);
                }
                $offeringId = filter_var($body['offering_id'] ?? null, FILTER_VALIDATE_INT);
                $day = strtolower(trim((string)($body['day_of_week'] ?? '')));
                $start = (string)($body['start_time'] ?? ''); $end = (string)($body['end_time'] ?? ''); $room = trim((string)($body['room'] ?? ''));
                if (!$offeringId || !in_array($day, ['monday','tuesday','wednesday','thursday','friday','saturday'], true)
                    || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $start) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $end)
                    || $end <= $start || $room === '' || mb_strlen($room) > 100) send_json(422, ['error' => 'Choose a valid course, day, time range, and classroom.']);
                $overlap = $pdo->prepare('SELECT 1 FROM class_meetings WHERE meeting_id <> :meeting_id AND room = :room AND day_of_week = :day AND start_time < :end_time AND end_time > :start_time LIMIT 1');
                $overlap->execute(['meeting_id' => $meetingId, 'room' => $room, 'day' => $day, 'end_time' => $end, 'start_time' => $start]);
                if ($overlap->fetchColumn()) send_json(409, ['error' => 'That room already has a class scheduled during this time.']);
                $update = $pdo->prepare('UPDATE class_meetings SET offering_id = :offering, day_of_week = :day, start_time = :start_time, end_time = :end_time, room = :room WHERE meeting_id = :id AND NOT EXISTS (SELECT 1 FROM attendance_sessions WHERE meeting_id = :session_meeting_id)');
                $update->execute(['offering' => $offeringId, 'day' => $day, 'start_time' => $start, 'end_time' => $end, 'room' => $room, 'id' => $meetingId, 'session_meeting_id' => $meetingId]);
                if (!$update->rowCount()) send_json(409, ['error' => 'This class meeting has attendance history or no longer exists.']);
                send_json(200, ['message' => 'Class meeting updated.']);
            }
            $kioskId = filter_var($body['kiosk_id'] ?? null, FILTER_VALIDATE_INT);
            if ($kioskId) {
                $kioskAction = (string)($body['kiosk_action'] ?? '');
                if ($kioskAction === 'revoke') {
                    $revoke = $pdo->prepare('UPDATE attendance_kiosks SET kiosk_status = \'revoked\' WHERE kiosk_id = :id AND kiosk_status = \'active\''); $revoke->execute(['id' => $kioskId]);
                    if (!$revoke->rowCount()) send_json(404, ['error' => 'This kiosk is already revoked or no longer exists.']);
                    send_json(200, ['message' => 'Kiosk access revoked.']);
                }
                if ($kioskAction === 'reissue') {
                    $newSecret = bin2hex(random_bytes(32));
                    $reissue = $pdo->prepare('UPDATE attendance_kiosks SET secret_hash = :secret_hash, kiosk_status = \'active\' WHERE kiosk_id = :id');
                    $reissue->execute(['secret_hash' => hash('sha256', $newSecret), 'id' => $kioskId]);
                    if (!$reissue->rowCount()) send_json(404, ['error' => 'Kiosk not found.']);
                    send_json(200, ['message' => 'A new pairing secret was generated.', 'secret' => $newSecret]);
                }
                send_json(422, ['error' => 'Choose revoke or reissue for this kiosk.']);
            }
            $sessionId = filter_var($body['session_id'] ?? null, FILTER_VALIDATE_INT);
            $status = (string)($body['session_status'] ?? '');
            if (!$sessionId || !in_array($status, ['paused', 'active', 'closed'], true)) send_json(422, ['error' => 'Choose a valid session and status.']);
            $update = $pdo->prepare('UPDATE attendance_sessions SET session_status = :status, closed_at = CASE WHEN :status_closed = \'closed\' THEN NOW() ELSE NULL END WHERE session_id = :session_id AND (session_status <> \'closed\' OR :status_current = \'closed\')');
            $update->execute(['status' => $status, 'status_closed' => $status, 'status_current' => $status, 'session_id' => $sessionId]);
            if (!$update->rowCount()) send_json(409, ['error' => 'That session no longer exists or has already been closed.']);
            send_json(200, ['message' => "Attendance session {$status}."]);
        }
        request_method('GET');
    }

    if ($action === 'kiosk_state') {
        request_method('POST');
        $body = request_body();
        $kioskId = filter_var($body['kiosk_id'] ?? null, FILTER_VALIDATE_INT);
        $secret = (string)($body['secret'] ?? '');
        if (!$kioskId || !preg_match('/^[a-f0-9]{64}$/', $secret)) send_json(401, ['error' => 'This kiosk is not paired. Pair it from Admin → Attendance.']);
        $kioskQuery = $pdo->prepare('SELECT kiosk_id, kiosk_name, room, secret_hash FROM attendance_kiosks WHERE kiosk_id = :id AND kiosk_status = \'active\'');
        $kioskQuery->execute(['id' => $kioskId]);
        $kiosk = $kioskQuery->fetch();
        if (!$kiosk || !hash_equals($kiosk['secret_hash'], hash('sha256', $secret))) send_json(401, ['error' => 'Kiosk authentication failed. Ask an administrator to pair this device again.']);
        finalize_expired_attendance($pdo);
        $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
        $today = $now->format('Y-m-d');
        $weekday = strtolower($now->format('l'));
        $schedule = $pdo->prepare(
            'SELECT cm.meeting_id, cm.start_time, cm.end_time, cm.room, co.offering_id, co.section_code,
                    co.instructor_name, c.course_code, c.course_title
             FROM class_meetings cm JOIN course_offerings co ON co.offering_id = cm.offering_id
             JOIN courses c ON c.course_id = co.course_id JOIN academic_terms t ON t.term_id = co.term_id
             WHERE cm.room = :room AND cm.day_of_week = :weekday AND t.term_status = \'active\'
               AND co.offering_status <> \'cancelled\' ORDER BY cm.start_time'
        );
        $schedule->execute(['room' => $kiosk['room'], 'weekday' => $weekday]);
        $meetings = $schedule->fetchAll();
        $liveMeeting = null;
        foreach ($meetings as $candidate) {
            $startAt = new DateTimeImmutable($today . ' ' . $candidate['start_time'], new DateTimeZone('Asia/Manila'));
            $endAt = new DateTimeImmutable($today . ' ' . $candidate['end_time'], new DateTimeZone('Asia/Manila'));
            $manualCheck = $pdo->prepare('SELECT 1 FROM attendance_sessions WHERE meeting_id = :meeting_id AND session_date = :session_date AND session_status IN (\'active\', \'paused\') AND starts_at <= :start_now AND ends_at > :end_now LIMIT 1');
            $manualNow = $now->format('Y-m-d H:i:s');
            $manualCheck->execute(['meeting_id' => $candidate['meeting_id'], 'session_date' => $today, 'start_now' => $manualNow, 'end_now' => $manualNow]);
            if (($now >= $startAt && $now < $endAt) || $manualCheck->fetchColumn()) { $liveMeeting = [$candidate, $startAt, $endAt]; break; }
        }
        $session = null;
        if ($liveMeeting) {
            [$meeting, $startAt, $endAt] = $liveMeeting;
            $pdo->beginTransaction();
            $findSession = $pdo->prepare('SELECT session_id, session_status, starts_at, attendance_deadline, grace_minutes FROM attendance_sessions WHERE meeting_id = :meeting_id AND session_date = :session_date FOR UPDATE');
            $findSession->execute(['meeting_id' => $meeting['meeting_id'], 'session_date' => $today]);
            $session = $findSession->fetch();
            if (!$session) {
                $settings = $pdo->query('SELECT grace_minutes, attendance_window_minutes FROM attendance_settings WHERE setting_id = 1')->fetch();
                $deadlineAt = $startAt->modify('+' . (int)$settings['attendance_window_minutes'] . ' minutes');
                if ($deadlineAt > $endAt) $deadlineAt = $endAt;
                $createSession = $pdo->prepare('INSERT INTO attendance_sessions (meeting_id, kiosk_id, session_date, starts_at, ends_at, attendance_deadline, grace_minutes) VALUES (:meeting_id, :kiosk_id, :session_date, :starts_at, :ends_at, :deadline, :grace)');
                try {
                    $createSession->execute(['meeting_id' => $meeting['meeting_id'], 'kiosk_id' => $kioskId, 'session_date' => $today, 'starts_at' => $startAt->format('Y-m-d H:i:s'), 'ends_at' => $endAt->format('Y-m-d H:i:s'), 'deadline' => $deadlineAt->format('Y-m-d H:i:s'), 'grace' => (int)$settings['grace_minutes']]);
                    $session = ['session_id' => (int)$pdo->lastInsertId(), 'session_status' => 'active', 'starts_at' => $startAt->format('Y-m-d H:i:s'), 'attendance_deadline' => $deadlineAt->format('Y-m-d H:i:s'), 'grace_minutes' => (int)$settings['grace_minutes']];
                } catch (PDOException $error) {
                    if ($error->getCode() !== '23000') throw $error;
                    $findSession->execute(['meeting_id' => $meeting['meeting_id'], 'session_date' => $today]);
                    $session = $findSession->fetch();
                }
            }
            $pdo->commit();
        }
        if (!$session) {
            foreach ($meetings as $candidate) {
                $candidateEnd = new DateTimeImmutable($today . ' ' . $candidate['end_time'], new DateTimeZone('Asia/Manila'));
                if ($now < $candidateEnd) continue;
                $findEnded = $pdo->prepare('SELECT session_id, session_status, starts_at, attendance_deadline, grace_minutes FROM attendance_sessions WHERE meeting_id = :meeting_id AND session_date = :session_date');
                $findEnded->execute(['meeting_id' => $candidate['meeting_id'], 'session_date' => $today]);
                $ended = $findEnded->fetch();
                if (!$ended) continue;
                if ($now < $candidateEnd->modify('+30 seconds')) { $session = $ended; $meeting = $candidate; }
            }
        }
        if (!$session) {
            $nextMeeting = null;
            foreach ($meetings as $candidate) if ($now->format('H:i:s') < $candidate['start_time']) { $nextMeeting = $candidate; break; }
            send_json(200, ['kiosk' => ['kiosk_name' => $kiosk['kiosk_name'], 'room' => $kiosk['room']], 'session' => null, 'next' => $nextMeeting ? ['course_code' => $nextMeeting['course_code'], 'course_title' => $nextMeeting['course_title'], 'section_code' => $nextMeeting['section_code'], 'starts_at' => $nextMeeting['start_time']] : null]);
        }
        $sessionId = (int)$session['session_id'];
        $count = $pdo->prepare('SELECT COUNT(*) FROM attendance_records WHERE session_id = :id AND attendance_status IN (\'present\', \'late\')');
        $count->execute(['id' => $sessionId]);
        $checkin = null;
        if (isset($body['face_images'])) {
            $images = compreface_images($body, false);
            $real = (float)($body['face_real'] ?? 0);
            $live = (float)($body['face_live'] ?? 0);
            if (($body['blink_confirmed'] ?? false) !== true) {
                send_json(422, ['checkin' => ['success' => false, 'message' => 'Keep your face centered, blink when prompted, and try again.']]);
            }
            $settings = $pdo->query('SELECT face_similarity_threshold, face_quality_threshold FROM attendance_settings WHERE setting_id = 1')->fetch();
            $settings = $settings ?: ['face_similarity_threshold' => 0.5, 'face_quality_threshold' => 0.6];
            if ($real < (float)$settings['face_quality_threshold'] || $live < (float)$settings['face_quality_threshold']) {
                send_json(422, ['checkin' => ['success' => false, 'message' => 'Face liveness could not be confirmed. Improve the lighting and blink again.']]);
            }
            $eligible = $pdo->prepare('SELECT u.user_id, f.compreface_subject FROM enrollments e JOIN users u ON u.user_id = e.student_user_id JOIN compreface_student_faces f ON f.student_user_id = u.user_id AND f.template_status = \'active\' WHERE e.offering_id = :offering_id AND e.enrollment_status = \'approved\' AND u.account_status = \'active\'');
            $eligible->execute(['offering_id' => $meeting['offering_id']]);
            $eligibleSubjects = [];
            foreach ($eligible->fetchAll() as $eligibleStudent) {
                $eligibleSubjects[$eligibleStudent['compreface_subject']] = (int)$eligibleStudent['user_id'];
            }
            $bestId = null;
            $bestScore = 0.0;
            foreach ($images as $image) {
                foreach (compreface_recognize_image($image) as $recognizedFace) {
                    foreach (($recognizedFace['subjects'] ?? []) as $subjectMatch) {
                        $subject = $subjectMatch['subject'] ?? null;
                        $score = filter_var($subjectMatch['similarity'] ?? null, FILTER_VALIDATE_FLOAT);
                        if (is_string($subject) && isset($eligibleSubjects[$subject])
                            && $score !== false && $score > $bestScore) {
                            $bestScore = (float)$score;
                            $bestId = $eligibleSubjects[$subject];
                        }
                    }
                }
            }
            if ($bestId === null || $bestScore < (float)$settings['face_similarity_threshold']) {
                $checkin = ['success' => false, 'message' => 'CompreFace could not match this face to an enrolled student in this class. Ask the registrar to verify your attendance.'];
            } else {
                $now = new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
                if ($now < new DateTimeImmutable($session['starts_at'], new DateTimeZone('Asia/Manila')) || $now >= new DateTimeImmutable($session['attendance_deadline'], new DateTimeZone('Asia/Manila')) || $session['session_status'] !== 'active') {
                    $checkin = ['success' => false, 'message' => 'Attendance is paused or the check-in period has ended.'];
                } else {
                    $status = $now <= (new DateTimeImmutable($session['starts_at'], new DateTimeZone('Asia/Manila')))->modify('+' . (int)$session['grace_minutes'] . ' minutes') ? 'present' : 'late';
                    try {
                        $insert = $pdo->prepare('INSERT INTO attendance_records (session_id, student_user_id, attendance_status, verification_method, checked_in_at) VALUES (:session_id, :student_id, :status, \'face\', :checked_in_at)');
                        $insert->execute(['session_id' => $sessionId, 'student_id' => $bestId, 'status' => $status, 'checked_in_at' => $now->format('Y-m-d H:i:s')]);
                        $checkin = ['success' => true, 'message' => 'Face recognized. Attendance marked ' . $status . '.'];
                    } catch (PDOException $error) {
                        if ($error->getCode() !== '23000') throw $error;
                        $checkin = ['success' => false, 'message' => 'Attendance has already been recorded for this class.'];
                    }
                }
            }
            $count->execute(['id' => $sessionId]);
        }
        send_json(200, ['kiosk' => ['kiosk_name' => $kiosk['kiosk_name'], 'room' => $kiosk['room']], 'session' => ['session_id' => $sessionId, 'status' => $session['session_status'], 'course_code' => $meeting['course_code'], 'course_title' => $meeting['course_title'], 'section_code' => $meeting['section_code'], 'instructor_name' => $meeting['instructor_name'], 'starts_at' => $session['starts_at'], 'attendance_deadline' => $session['attendance_deadline'], 'checked_in' => (int)$count->fetchColumn()], 'checkin' => $checkin]);
    }

    if ($action === 'student_attendance') {
        $student = require_user('student');
        finalize_expired_attendance($pdo);
        if ($method === 'GET') {
            $history = $pdo->prepare(
                'SELECT ar.attendance_status, ar.checked_in_at, s.session_date, c.course_code, c.course_title,
                        co.section_code, cm.room, cm.start_time, cm.end_time
                 FROM attendance_records ar JOIN attendance_sessions s ON s.session_id = ar.session_id
                 JOIN class_meetings cm ON cm.meeting_id = s.meeting_id
                 JOIN course_offerings co ON co.offering_id = cm.offering_id JOIN courses c ON c.course_id = co.course_id
                 WHERE ar.student_user_id = :student_id ORDER BY s.session_date DESC, cm.start_time DESC LIMIT 250'
            );
            $history->execute(['student_id' => $student['user_id']]);
            send_json(200, ['records' => $history->fetchAll()]);
        }
        request_method('GET');
    }

    if ($action === 'student_face') {
        $student = require_user('student');
        if ($method === 'GET') {
            $query = $pdo->prepare('SELECT template_status, \'CompreFace local\' AS model_version, consent_at, created_at FROM compreface_student_faces WHERE student_user_id = :student_id');
            $query->execute(['student_id' => $student['user_id']]);
            send_json(200, ['enrollment' => $query->fetch() ?: null]);
        }
        if ($method === 'POST') {
            $body = request_body();
            $images = compreface_images($body);
            $subject = compreface_new_subject('student', (int)$student['user_id']);
            compreface_register_images($subject, $images);
            $pdo->beginTransaction();
            try {
                $current = $pdo->prepare('SELECT compreface_subject FROM compreface_student_faces WHERE student_user_id = :student_id FOR UPDATE');
                $current->execute(['student_id' => $student['user_id']]);
                $oldSubject = $current->fetchColumn();
                $save = $pdo->prepare('INSERT INTO compreface_student_faces (student_user_id, compreface_subject, template_status, consent_at) VALUES (:student_id, :subject, \'active\', NOW()) ON DUPLICATE KEY UPDATE compreface_subject = VALUES(compreface_subject), template_status = \'active\', consent_at = VALUES(consent_at), updated_at = NOW()');
                $save->execute(['student_id' => $student['user_id'], 'subject' => $subject]);
                $removeLegacyTemplate = $pdo->prepare('DELETE FROM student_face_templates WHERE student_user_id = :student_id');
                $removeLegacyTemplate->execute(['student_id' => $student['user_id']]);
                $pdo->commit();
            } catch (Throwable $error) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                try {
                    compreface_delete_subject($subject);
                } catch (Throwable $cleanupError) {
                    error_log('Unable to clean up failed CompreFace face replacement: ' . $cleanupError->getMessage());
                }
                throw $error;
            }
            $message = 'Your face is enrolled with the local CompreFace service.';
            if (is_string($oldSubject) && $oldSubject !== '' && $oldSubject !== $subject) {
                try {
                    compreface_delete_subject($oldSubject);
                } catch (Throwable $cleanupError) {
                    error_log('Unable to remove the previous CompreFace subject: ' . $cleanupError->getMessage());
                    $message .= ' The previous face record could not be removed; ask an administrator to check the local CompreFace service.';
                }
            }
            send_json(200, ['message' => $message]);
        }
        if ($method === 'DELETE') {
            $query = $pdo->prepare('SELECT compreface_subject FROM compreface_student_faces WHERE student_user_id = :student_id');
            $query->execute(['student_id' => $student['user_id']]);
            $subject = $query->fetchColumn();
            if (is_string($subject) && $subject !== '') {
                compreface_delete_subject($subject);
            }
            $pdo->beginTransaction();
            $delete = $pdo->prepare('UPDATE compreface_student_faces SET template_status = \'revoked\' WHERE student_user_id = :student_id');
            $delete->execute(['student_id' => $student['user_id']]);
            $removeLegacyTemplate = $pdo->prepare('DELETE FROM student_face_templates WHERE student_user_id = :student_id');
            $removeLegacyTemplate->execute(['student_id' => $student['user_id']]);
            $pdo->commit();
            send_json(200, ['message' => 'Your face enrollment and images were removed from the local CompreFace service. Contact the registrar for staff-verified attendance.']);
        }
        request_method('GET');
    }

    if ($action === 'registrar_attendance') {
        $registrar = require_user('registrar');
        finalize_expired_attendance($pdo);
        if ($method === 'GET') {
            $dateFrom = trim((string)($_GET['date_from'] ?? ''));
            $dateTo = trim((string)($_GET['date_to'] ?? ''));
            $courseCode = trim((string)($_GET['course_code'] ?? ''));
            $section = trim((string)($_GET['section_code'] ?? ''));
            $yearLabel = trim((string)($_GET['year_label'] ?? ''));
            $where = ['1 = 1']; $params = [];
            if ($dateFrom !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) { $where[] = 's.session_date >= :date_from'; $params['date_from'] = $dateFrom; }
            if ($dateTo !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) { $where[] = 's.session_date <= :date_to'; $params['date_to'] = $dateTo; }
            if ($courseCode !== '') { $where[] = 'c.course_code = :course_code'; $params['course_code'] = $courseCode; }
            if ($section !== '') { $where[] = 'co.section_code = :section'; $params['section'] = $section; }
            if ($yearLabel !== '') { $where[] = 'ay.year_label = :year_label'; $params['year_label'] = $yearLabel; }
            $sql = 'SELECT ar.attendance_id, s.session_date, c.course_code, c.course_title, co.section_code, cm.room,
                           u.student_number, u.full_name, ar.attendance_status, ar.verification_method, ar.checked_in_at, ay.year_label
                    FROM attendance_records ar JOIN attendance_sessions s ON s.session_id = ar.session_id
                    JOIN class_meetings cm ON cm.meeting_id = s.meeting_id
                    JOIN course_offerings co ON co.offering_id = cm.offering_id JOIN courses c ON c.course_id = co.course_id
                    JOIN academic_terms t ON t.term_id = co.term_id JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
                    JOIN users u ON u.user_id = ar.student_user_id WHERE ' . implode(' AND ', $where) . ' ORDER BY s.session_date DESC, c.course_code, co.section_code, u.full_name LIMIT 2000';
            $records = $pdo->prepare($sql); $records->execute($params);
            $summarySql = 'SELECT s.session_id, s.session_date, c.course_code, c.course_title, co.section_code, cm.room,
                                  COUNT(DISTINCT e.student_user_id) AS total_enrolled,
                                  COALESCE(SUM(ar.attendance_status = \'present\'), 0) AS present_count,
                                  COALESCE(SUM(ar.attendance_status = \'late\'), 0) AS late_count,
                                  COALESCE(SUM(ar.attendance_status = \'absent\'), 0) AS absent_count,
                                  COALESCE(SUM(ar.attendance_status = \'excused\'), 0) AS excused_count
                           FROM attendance_sessions s JOIN class_meetings cm ON cm.meeting_id = s.meeting_id
                           JOIN course_offerings co ON co.offering_id = cm.offering_id JOIN courses c ON c.course_id = co.course_id
                           JOIN academic_terms t ON t.term_id = co.term_id JOIN academic_years ay ON ay.academic_year_id = t.academic_year_id
                           JOIN enrollments e ON e.offering_id = co.offering_id AND e.enrollment_status = \'approved\'
                           LEFT JOIN attendance_records ar ON ar.session_id = s.session_id AND ar.student_user_id = e.student_user_id
                           WHERE ' . implode(' AND ', $where) . '
                           GROUP BY s.session_id, s.session_date, c.course_code, c.course_title, co.section_code, cm.room
                           ORDER BY s.session_date DESC, c.course_code, co.section_code';
            $summary = $pdo->prepare($summarySql); $summary->execute($params);
            $courses = $pdo->query('SELECT DISTINCT c.course_code FROM courses c JOIN course_offerings co ON co.course_id = c.course_id JOIN attendance_sessions s ON s.meeting_id IN (SELECT meeting_id FROM class_meetings WHERE offering_id = co.offering_id) ORDER BY c.course_code')->fetchAll(PDO::FETCH_COLUMN);
            $years = $pdo->query('SELECT DISTINCT ay.year_label FROM academic_years ay JOIN academic_terms t ON t.academic_year_id = ay.academic_year_id JOIN course_offerings co ON co.term_id = t.term_id JOIN class_meetings cm ON cm.offering_id = co.offering_id JOIN attendance_sessions s ON s.meeting_id = cm.meeting_id ORDER BY ay.year_label DESC')->fetchAll(PDO::FETCH_COLUMN);
            $sections = $pdo->query('SELECT DISTINCT co.section_code FROM course_offerings co JOIN class_meetings cm ON cm.offering_id = co.offering_id JOIN attendance_sessions s ON s.meeting_id = cm.meeting_id ORDER BY co.section_code')->fetchAll(PDO::FETCH_COLUMN);
            send_json(200, ['records' => $records->fetchAll(), 'summaries' => $summary->fetchAll(), 'course_codes' => $courses, 'year_labels' => $years, 'section_codes' => $sections]);
        }
        if ($method === 'PATCH') {
            $body = request_body();
            $attendanceId = filter_var($body['attendance_id'] ?? null, FILTER_VALIDATE_INT);
            $status = (string)($body['attendance_status'] ?? '');
            $reason = trim((string)($body['reason'] ?? ''));
            if (!$attendanceId || !in_array($status, ['present', 'late', 'excused', 'absent'], true) || $reason === '' || mb_strlen($reason) > 500) send_json(422, ['error' => 'Choose an attendance status and provide a correction reason.']);
            $pdo->beginTransaction();
            $find = $pdo->prepare('SELECT attendance_status FROM attendance_records WHERE attendance_id = :id FOR UPDATE'); $find->execute(['id' => $attendanceId]); $old = $find->fetch();
            if (!$old) { $pdo->rollBack(); send_json(404, ['error' => 'Attendance record not found.']); }
            $update = $pdo->prepare('UPDATE attendance_records SET attendance_status = :status, verification_method = CASE WHEN :method_status IN (\'present\', \'late\') THEN \'staff_verified\' ELSE verification_method END, checked_in_at = CASE WHEN :checked_status IN (\'present\', \'late\') THEN COALESCE(checked_in_at, NOW()) ELSE checked_in_at END, updated_at = NOW() WHERE attendance_id = :id'); $update->execute(['status' => $status, 'method_status' => $status, 'checked_status' => $status, 'id' => $attendanceId]);
            $audit = $pdo->prepare('INSERT INTO attendance_audit_logs (attendance_id, actor_user_id, previous_status, new_status, reason) VALUES (:attendance_id, :actor, :previous, :new, :reason)');
            $audit->execute(['attendance_id' => $attendanceId, 'actor' => $registrar['user_id'], 'previous' => $old['attendance_status'], 'new' => $status, 'reason' => $reason]);
            $pdo->commit(); send_json(200, ['message' => 'Attendance correction saved to the audit log.']);
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
