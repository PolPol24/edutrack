<?php
declare(strict_types=1);

function send_json(int $status, array $payload): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

$localConfigPath = __DIR__ . '/local_config.php';
$localConfig = is_file($localConfigPath) ? require $localConfigPath : [];
$localConfig = is_array($localConfig) ? $localConfig : [];

$allowedOrigins = array_filter(array_map(
    'trim',
    explode(
        ',',
        getenv('EDUTRACK_ALLOWED_ORIGINS')
            ?: implode(',', $localConfig['allowed_origins'] ?? ['http://localhost:3000', 'http://127.0.0.1:3000'])
    )
));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) {
    send_json(403, ['error' => 'This origin is not allowed to access the EduTrack API.']);
}

if ($origin !== '') {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (PHP_SAPI !== 'cli' && session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}

function database(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    global $localConfig;
    $host = getenv('EDUTRACK_DB_HOST') ?: ($localConfig['host'] ?? '127.0.0.1');
    $port = getenv('EDUTRACK_DB_PORT') ?: ($localConfig['port'] ?? '3306');
    $name = getenv('EDUTRACK_DB_NAME') ?: ($localConfig['database'] ?? 'edutrack_db');
    $user = getenv('EDUTRACK_DB_USER') ?: ($localConfig['username'] ?? 'root');
    $password = getenv('EDUTRACK_DB_PASSWORD') ?: ($localConfig['password'] ?? '');

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_MULTI_STATEMENTS => false,
    ]);

    return $pdo;
}

function request_body(): array
{
    $body = json_decode(file_get_contents('php://input'), true);
    return is_array($body) ? $body : [];
}

function require_user(?string $role = null): array
{
    $user = $_SESSION['edutrack_user'] ?? null;
    if (!is_array($user)) {
        send_json(401, ['error' => 'Please sign in to continue.']);
    }

    $statement = database()->prepare(
        'SELECT full_name, email, role, account_status
         FROM users
         WHERE user_id = :user_id
         LIMIT 1'
    );
    $statement->execute(['user_id' => $user['user_id']]);
    $currentUser = $statement->fetch();

    if (!$currentUser || $currentUser['account_status'] !== 'active') {
        $_SESSION = [];
        session_regenerate_id(true);
        send_json(401, ['error' => 'This account is unavailable. Please sign in with an active account.']);
    }

    $user = [
        'user_id' => (int)$user['user_id'],
        'full_name' => $currentUser['full_name'],
        'email' => $currentUser['email'],
        'role' => $currentUser['role'],
    ];
    $_SESSION['edutrack_user'] = $user;

    if ($role !== null && $user['role'] !== $role) {
        send_json(403, [
            'error' => sprintf(
                'This action requires a %s account. The current session is signed in as %s (%s). Log out, then sign in with a %s account.',
                $role,
                $user['role'],
                $user['email'],
                $role
            ),
        ]);
    }

    return $user;
}

function request_method(string $expected): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $expected) {
        header('Allow: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        send_json(405, ['error' => 'This request method is not supported for this action.']);
    }
}

function handle_api_error(Throwable $error): never
{
    error_log($error->__toString());

    if ($error instanceof PDOException && $error->getCode() === '23000') {
        send_json(409, ['error' => 'This record conflicts with an existing database record.']);
    }

    send_json(500, ['error' => 'The request could not be completed. Check the PHP server log for details.']);
}
