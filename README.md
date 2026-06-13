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

When deploying frontend and backend separately (for example frontend on Vercel and backend on Render), set these environment variables carefully:

- Frontend: `VITE_API_URL=https://your-backend-domain.com` (no trailing slash)
- Backend: `FRONTEND_URL=https://your-frontend-domain.com` (can be a comma-separated list for multiple frontends)
- Backend: set `NODE_ENV=production`

If `VITE_API_URL` includes a trailing slash (for example `https://api.example.com/`), some requests can become malformed and return 404s. The frontend now normalizes this, but using a slash-free value is still recommended.
