## Backend (Express) Usage

To run the Express backend server, use the following commands in the `backend` directory:

### Start the Backend

```
cd backend
yarn install   # Only needed once to install dependencies
yarn start
```

This will start the backend server using Node.js.

### Stop the Backend

To stop the backend server, press `Ctrl + C` in the terminal where it is running.
## Docker Compose Usage

To manage the database and related services using Docker Compose, use the following commands:

### Start the Database

Start the database and other services in detached mode:

```
docker compose up -d
```

### Stop the Database

Stop and remove the containers:

```
docker compose down
```

### Check Container Status

To check the status of running containers and images:

```
docker ps
```

This will list all running containers. To see all containers (including stopped ones), use:

```
docker ps -a
```

## Deployment Notes (Auth + API)

Production runs on Vercel (frontend) + Render (backend) + Neon (Postgres). See [deploy/README.md](deploy/README.md) for the full setup.

- Frontend: leave `VITE_API_URL` unset — Vercel proxies `/api` to Render so the auth cookie stays same-origin.
- Backend: `FRONTEND_URL=https://your-frontend-domain.com` (can be a comma-separated list for multiple frontends)
- Backend: set `NODE_ENV=production`
