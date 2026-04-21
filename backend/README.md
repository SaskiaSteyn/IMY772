## Backend (Express) Usage

To run the Express backend server, use the following commands in the `backend` directory:

### Start the Backend

```
cd backend
npm install   # Only needed once to install dependencies
npm start
```

This will start the backend server using Node.js.

### Stop the Backend

To stop the backend server, press `Ctrl + C` in the terminal where it is running.

## Admin Bootstrap (401 Login Setup)

If login returns 401 on a fresh database, create or upgrade the admin account from `.env`:

```bash
# from repo root
npm run bootstrap:admin

# or from backend folder
cd backend
npm run seed:admin
```

This command uses `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, and `ADMIN_SURNAME` from the project `.env`.
If the user already exists, it updates the account to `role=admin`.

## Prisma Migrate Setup (Existing Postgres DB)

This project is configured to use the project `.env` file (`../.env`) for Prisma commands.
Set `PRISMA_DATABASE_URL` in that file to a host-reachable Postgres URL (usually `localhost`).

### Install Dependencies

```bash
cd backend
npm install
```

### Pull Existing Tables Into Prisma Schema

```bash
npm run prisma:pull
npm run prisma:generate
```

### Baseline The Existing Database (One Time)

Use this only once on an already-existing database so Prisma starts tracking migrations without re-creating current tables.

```bash
npm run prisma:migrate:baseline
npm run prisma:migrate:resolve-baseline
```

### Create New Migrations After Schema Changes

```bash
npm run prisma:migrate:dev -- --name your_change_name
```

### Apply Committed Migrations

```bash
npm run prisma:migrate:deploy
```