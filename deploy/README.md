# MicroTrack — Deploying (Vercel + Render + Neon)

Free-tier setup. Both hosts auto-deploy from GitHub; there is no deploy workflow
in this repo.

```
browser ──▶ Vercel (frontend/, static Vite build)
              └─ /api/* rewrite ──▶ Render (backend/, Express) ──▶ Neon Postgres
                                                           └────▶ S3 / R2 (profile images)
```

**Why the `/api` rewrite:** the login token is an httpOnly cookie. If the browser
called `*.onrender.com` directly it would be a third-party cookie, which Safari
and Firefox block. Proxying through Vercel keeps everything same-origin, so
**leave `VITE_API_URL` unset** in production (the client falls back to relative
`/api` paths).

## 1. Database — Neon

Don't use Render's free Postgres, it is deleted after 30 days.

1. Create a project at [neon.tech](https://neon.tech) and copy the connection
   string (it includes `?sslmode=require`).
2. Copy existing data across (skip for a fresh DB — the backend migrates and seeds
   on boot):

   ```bash
   pg_dump --no-owner --no-acl -Fc "$OLD_DATABASE_URL" -f microtrack.dump
   pg_restore --no-owner --no-acl -d "$NEON_DATABASE_URL" microtrack.dump
   ```

## 2. Backend — Render

1. Render ▸ **New ▸ Blueprint** ▸ pick this repo. It reads [`render.yaml`](../render.yaml).
2. Fill in the prompted env vars:

   | Var | Value |
   | --- | --- |
   | `DATABASE_URL`, `PRISMA_DATABASE_URL` | Neon connection string (same value for both) |
   | `FRONTEND_URL` | `https://<your-app>.vercel.app` (comma-separate extras) |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
   | `GEMINI_API_KEY`, `OPENAI_API_KEY` | AI features |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | admin account created/updated on boot |
   | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET` | image storage, see step 4 |
   | `S3_ENDPOINT` | leave empty for AWS S3; set for R2 |

   `JWT_SECRET` is generated automatically. Note: a new secret logs everyone out once.
3. The service lives at `https://microtrack-backend-mohl.onrender.com` (Render added
   the suffix). If the service is ever recreated with a different URL, update the
   `/api` rewrite in [`frontend/vercel.json`](../frontend/vercel.json).

Boot runs `fix-migration` → `prisma migrate deploy` → admin seed → `npm start`,
mirroring `docker-compose.yml`. Render only deploys once GitHub CI checks pass
(`autoDeployTrigger: checksPass`).

**Free-tier limits:** sleeps after 15 min idle (first request takes ~30–60 s —
open the site before a demo), 512 MB RAM (OCR image upload is the heaviest route).

## 3. Frontend — Vercel

1. Vercel ▸ **Add New ▸ Project** ▸ this repo.
2. **Root Directory:** `frontend`. Framework preset: Vite (auto-detected).
3. Env var: `VITE_GOOGLE_CLIENT_ID`. Do **not** set `VITE_API_URL`.
4. Google Cloud Console ▸ OAuth client ▸ add `https://<your-app>.vercel.app` to
   **Authorized JavaScript origins**.

## 4. Image storage

Profile images use the S3 API ([`backend/lib/s3.js`](../backend/lib/s3.js)). Pick one:

- **Keep AWS S3** — create an IAM user with `s3:PutObject/GetObject/DeleteObject`
  on `arn:aws:s3:::microtrack-images/*` and put its access key in Render. Costs
  cents at this size.
- **Cloudflare R2** (10 GB free) — create a bucket and an R2 API token, then set
  `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `AWS_REGION=auto`,
  `S3_BUCKET=<bucket>`, and the token's key pair as `AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY`. Existing images need copying across (e.g. `rclone`).

The thumbnail Lambda in `lambda/image-processor` is optional — the app doesn't
read the thumbnails.

## 5. Shut down AWS

Once the new site works: stop/terminate the EC2 instance, snapshot then delete the
RDS instance, and delete the `microtrack-ci-deploy` IAM user and the
`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` GitHub repo secrets.
