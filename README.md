# Darkhold Exchange — Setup Guide

## 1. Prerequisites

Install the following before starting:

- Node.js (LTS version)
- npm
- Git
- A Neon PostgreSQL account: https://console.neon.tech/

## 2. Project Structure

```text
DarkHold-Exchange/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── frontend/
│   └── package.json
├── docs/
└── package.json
```

## 3. Install Dependencies

Open a terminal in the project root directory and run:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

## 4. Configure Neon PostgreSQL

### Step 1: Create a Neon Project

1. Visit https://console.neon.tech/
2. Create or select the Darkhold Exchange project.
3. Open the **Connect** dialog.
4. Select the appropriate branch, database, and role.
5. Copy the PostgreSQL connection string.

For development, prefer a separate development branch instead of making changes directly to the production branch.

### Step 2: Initialize the Neon CLI (Optional)

If using the Neon CLI, install it:

```bash
npm install -g neon@latest
```

If the global installation fails, use `npx neon@latest` instead.

From the project root, or from the directory where you want the Neon configuration to live, initialize the existing project:

```bash
neon init -y --org-id org-cold-sea-47575224 --project-id sweet-unit-21091652 --branch production --services postgres
```

If prompted to sign in, complete authentication in the browser.

Deploy the configured Neon services:

```bash
neon deploy
```

Check the generated environment files and keep all database credentials private.

**Note:** Use the actual project and branch IDs for your environment. The command above targets the specified `production` branch.

## 5. Configure Environment Variables

### Backend

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and configure the following values:

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DATABASE_URL="YOUR_NEON_POSTGRESQL_CONNECTION_STRING"

SESSION_SECRET="REPLACE_WITH_A_LONG_RANDOM_SECRET"
SESSION_EXPIRY_HOURS=24
COOKIE_SECURE=false

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_ATTEMPTS=5

MATCHING_SIM_ENABLED=true
```

Replace the placeholder `DATABASE_URL` with the connection string copied from Neon.

Keep the session secret private. For local development, `COOKIE_SECURE=false` allows cookies over HTTP on localhost. Use HTTPS and secure cookie settings in production.

### Frontend

Create the frontend environment file:

```bash
touch frontend/.env.local
```

Configure the API URL and mock mode:

```env
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Verify the variable names against the existing frontend API client before using them. If the application uses a different API URL variable, retain the name expected by the code.

Restart the frontend after modifying environment variables.

### Environment File Security

Ensure the following files are excluded from Git:

```gitignore
.env
.env.*
!.env.example
```

Apply these rules carefully to the relevant project directories. Never commit actual database credentials, session secrets, or production environment files.

## 6. Generate Prisma Client

From the project root, run:

```bash
npm run db:generate
```

This generates the Prisma Client based on the configured schema.

If the root script is unavailable, inspect `backend/package.json` for the corresponding Prisma generation command.

## 7. Run Database Migrations

Run:

```bash
npm run db:migrate
```

If prompted for a migration name, use:

```text
init
```

This applies the database schema to PostgreSQL.

If the command is unavailable, inspect the scripts in the root and backend `package.json` files and use the migration command configured for the installed Prisma version.

**Warning:** Do not run database reset or destructive migration commands against production data without reviewing their effects and creating a backup.

## 8. Seed the Database

After the migrations succeed, run:

```bash
npm run db:seed
```

Seeding may create demo users, assets, balances, and other initial records. Review the seed script before running it against any shared or production database.

## 9. Start the Backend

Open a terminal in the project root:

```bash
npm run dev:backend
```

The backend should listen on:

```text
http://localhost:4000
```

If the root script does not exist, check `backend/package.json` for the configured development script.

## 10. Start the Frontend

Open a second terminal in the project root:

```bash
npm run dev:frontend
```

The frontend should be available at:

```text
http://localhost:3000
```

Open the URL in your browser to access the trading interface.

If the root script does not exist, check `frontend/package.json` for the configured development script.

## 11. Verify the Application

Verify the following:

- [ ] Backend starts without errors.
- [ ] Frontend starts without errors.
- [ ] Backend connects successfully to Neon PostgreSQL.
- [ ] Prisma migrations complete successfully.
- [ ] Demo data is seeded where required.
- [ ] Registration and login communicate with the backend.
- [ ] Wallet data is retrieved from the database.
- [ ] Orders and auctions persist after refreshing the page.
- [ ] Failed transactions do not leave incorrect wallet reservations.
- [ ] The frontend displays errors when the backend is unavailable.

If a health-check endpoint is configured, test it at:

```text
http://localhost:4000/health
```

A successful frontend build alone does not verify database connectivity or transaction correctness. Test the backend and database separately.

## 12. Production Considerations

Before deploying:

- Use a production database branch and properly managed secrets.
- Enable HTTPS and secure cookie settings.
- Configure CORS for the actual frontend domain.
- Review authentication, authorization, and rate limiting.
- Test order reservations, partial fills, cancellations, and concurrent purchases.
- Verify ledger consistency and transaction atomicity.
- Keep mock trading mode disabled in production.
- Back up the database and review migrations before deployment.

## Troubleshooting

### Database connection error

- Check the Neon project and branch status.
- Verify that `DATABASE_URL` is correct.
- Ensure the database URL is configured in the backend environment file.
- Confirm the required SSL settings for the Neon connection.
- Restart the backend after changing environment variables.

### Prisma Client error

Run:

```bash
npm run db:generate
```

Then restart the backend.

### Migration error

Review the Prisma error output and the current schema. Do not reset the database as a first troubleshooting step.

### Frontend cannot reach the backend

- Verify that the backend is running on port 4000.
- Check the API URL configured in `frontend/.env.local`.
- Check CORS settings.
- Verify that the frontend API client uses the configured environment variable.

## Quick Start

After the initial setup and successful migrations, start the application using two terminals.

**Terminal 1 — Backend**

```bash
npm run dev:backend
```

**Terminal 2 — Frontend**

```bash
npm run dev:frontend
```

Open http://localhost:3000 to access Darkhold Exchange.
