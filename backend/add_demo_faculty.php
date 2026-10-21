<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/config.php';

$faculty = [
    ['Amara Dela Cruz', 'amara.delacruz@edutrack.edu', 'IT'],
    ['Joaquin Padilla', 'joaquin.padilla@edutrack.edu', 'IS'],
    ['Bianca Manalo', 'bianca.manalo@edutrack.edu', 'CS'],
    ['Luis Romero', 'luis.romero@edutrack.edu', 'IT'],
    ['Patricia Alonzo', 'patricia.alonzo@edutrack.edu', 'IS'],
    ['Vincent Chua', 'vincent.chua@edutrack.edu', 'CS'],
];

$pdo = database();
$pdo->beginTransaction();

try {
    $findUser = $pdo->prepare('SELECT user_id, role FROM users WHERE email = :email');
    $createUser = $pdo->prepare(
        'INSERT INTO users (full_name, email, password_hash, role, account_status)
         VALUES (:full_name, :email, :password_hash, \'faculty\', \'active\')'
    );
    $updateUser = $pdo->prepare(
        'UPDATE users SET full_name = :full_name, account_status = \'active\'
         WHERE user_id = :user_id AND role = \'faculty\''
    );
    $findDepartment = $pdo->prepare('SELECT department_id FROM departments WHERE department_code = :code');
    $saveEmployee = $pdo->prepare(
        'INSERT INTO employee_profiles (user_id, employee_number, department_id)
         VALUES (:user_id, :employee_number, :department_id)
         ON DUPLICATE KEY UPDATE department_id = VALUES(department_id)'
    );

    foreach ($faculty as [$name, $email, $departmentCode]) {
        $findUser->execute(['email' => $email]);
        $existing = $findUser->fetch();
        if ($existing && $existing['role'] !== 'faculty') {
            throw new RuntimeException('The demo email is already used by a non-faculty account: ' . $email);
        }

        if ($existing) {
            $userId = (int)$existing['user_id'];
            $updateUser->execute(['full_name' => $name, 'user_id' => $userId]);
        } else {
            $createUser->execute([
                'full_name' => $name,
                'email' => $email,
                'password_hash' => password_hash('password', PASSWORD_DEFAULT),
            ]);
            $userId = (int)$pdo->lastInsertId();
        }

        $findDepartment->execute(['code' => $departmentCode]);
        $departmentId = $findDepartment->fetchColumn();
        if (!$departmentId) {
            throw new RuntimeException('Missing department: ' . $departmentCode);
        }
        $saveEmployee->execute([
            'user_id' => $userId,
            'employee_number' => 'FAC-' . str_pad((string)$userId, 6, '0', STR_PAD_LEFT),
            'department_id' => $departmentId,
        ]);
    }

    $pdo->commit();
    fwrite(STDOUT, 'Added or updated ' . count($faculty) . " demo faculty accounts.\n");
} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}
