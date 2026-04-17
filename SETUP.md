# Setup Guide

Coal Tracker Pro is a Vercel-deployed PWA backed by **Turso** (managed SQLite).
All data lives on the server; users sign in with email + password.

## 1. Create a Turso database

1. Install the Turso CLI and sign up:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth signup
   ```
2. Create the database:
   ```bash
   turso db create coal-tracker
   ```
3. Grab the connection details you'll need as env vars:
   ```bash
   turso db show coal-tracker --url         # -> TURSO_DATABASE_URL
   turso db tokens create coal-tracker      # -> TURSO_AUTH_TOKEN
   ```

## 2. Generate a JWT secret

```bash
openssl rand -base64 48
```

Use the output as `JWT_SECRET`.

## 3. Local development

1. Copy `.env.example` to `.env` and fill in the three secrets above.
2. Install deps:
   ```bash
   npm install
   ```
3. Start the API (Vercel dev) in one terminal:
   ```bash
   npx vercel dev
   ```
   On first run, Vercel will ask you to link the project — pick "create new" if
   you haven't deployed yet.
4. In another terminal, start the Vite frontend:
   ```bash
   npm run dev
   ```
5. Open http://localhost:8080 and log in.

## 4. Default accounts

The backend seeds two users on first cold start. Use them for your first login:

| Role  | Email                     | Password       |
| ----- | ------------------------- | -------------- |
| Admin | `admin@coaltracker.app`   | `Admin#CT2026!` |
| User  | `user@coaltracker.app`    | `User#CT2026!`  |

**Change both passwords immediately** via Settings → Change Password.

### Role permissions

- **User** — read everything; create/edit daily logs and record purchases against existing POs.
- **Admin** — everything above, plus manage vendors, items, delete records, create/edit/delete POs, access Settings, change opening balance, reset database.

## 5. Deploying to Vercel

1. Push to a Git repo Vercel can see.
2. Import into Vercel as a new project. Framework: Vite. Build command: `npm run build`. Output: `dist`.
3. Add all three env vars to the project's Environment Variables section (Production + Preview).
4. Deploy. First visit creates the schema + seeds users.

No other setup is needed — no database migrations to run manually.

## 6. Resetting everything

- Via UI: Settings → Danger Zone → Reset All Data (keeps users).
- To also wipe users + start completely fresh:
  ```bash
  turso db shell coal-tracker "DELETE FROM users"
  ```
  Next cold start reseeds the defaults.
