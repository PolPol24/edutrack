# EduTrack - Student Information System

EduTrack uses a Next.js/JavaScript frontend with a PHP API and MySQL database.
XAMPP provides Apache, PHP, MySQL, and phpMyAdmin for local development.

## Run with XAMPP

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open `http://localhost/phpmyadmin`, select **Import**, and import
   [`database/edutrack_db.sql`](./database/edutrack_db.sql). This creates the
   `edutrack_db` database, schema, and starter catalog.
3. Copy the contents of [`backend/`](./backend) into
   `C:\xampp\htdocs\edutrack-api\`. The API URL should then be
   `http://localhost/edutrack-api/api.php`.
4. In that XAMPP folder, copy `local_config.php.example` to `local_config.php`.
   Set the MySQL password if your XAMPP `root` account has one. The example uses
   XAMPP's common local defaults: host `127.0.0.1`, port `3306`, database
   `edutrack_db`, user `root`, and an empty password.
5. Open PowerShell and create local demo accounts and course offerings:

   ```powershell
   C:\xampp\php\php.exe C:\xampp\htdocs\edutrack-api\setup_demo.php
   ```

   All four local demo accounts use the password `password`:

   - Student: `student@edutrack.edu`
   - Faculty: `faculty@edutrack.edu`
   - Registrar: `registrar@edutrack.edu`
   - Admin: `admin@edutrack.edu`

6. In the project directory, start the frontend:

   ```powershell
   $env:Path = 'C:\Program Files\nodejs;' + $env:Path
   & 'C:\Program Files\nodejs\npm.cmd' install
   & 'C:\Program Files\nodejs\npm.cmd' run dev -- -p 3001
   ```

7. Open `http://localhost:3001`. Sign-in, enrollment requests, registrar
   approvals, faculty grades and attendance, student and staff profiles, admin
   accounts, courses, settings, and reports use the PHP API and persist to MySQL.

Use **Log out** in the navigation to sign out and return to the login screen
between presentations. The demo accounts are listed above; each uses the
password `password`.

The frontend defaults to `http://localhost/edutrack-api/api.php`. To use a
different API URL, set `NEXT_PUBLIC_EDUTRACK_API_URL` in a project-root
`.env.local` file and restart Next.js. If the frontend origin changes, add that
exact origin to `allowed_origins` in `local_config.php`. The provided local
configuration allows both frontend ports 3000 and 3001.

## Included backend actions

- `POST ?action=login`, `GET ?action=me`, and `POST ?action=logout`
- `GET ?action=courses` for active course offerings
- `GET|POST|DELETE ?action=enrollments` for student requests
- `GET|PATCH ?action=approvals` for registrar review
- Profile, student roster/course/attendance, admin account/catalog/settings,
  and database report actions for the role pages

PHP uses PDO with prepared statements, password hashes, role checks, and
server-side sessions. Keep `local_config.php` private and change or remove the
demo passwords before using the system outside a local development environment.
Other dashboard pages still contain frontend sample data and need their own API
integration before they read or write MySQL.

## XAMPP troubleshooting

- Confirm Apache and MySQL show **Running** in the XAMPP Control Panel.
- If PHP reports a missing MySQL driver, enable `pdo_mysql` in the active
  `C:\xampp\php\php.ini`, then restart Apache.
- If the API reports a database connection error, verify the credentials in
  `local_config.php` and confirm that the SQL import created `edutrack_db`.
- If the browser reports a CORS error, check that the frontend address is listed
  in `allowed_origins` and that frontend requests use `localhost` consistently.
