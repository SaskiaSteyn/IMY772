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
