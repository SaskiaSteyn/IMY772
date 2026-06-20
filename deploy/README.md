# MicroTrack — Auto-deploy to AWS

Deploy to the production EC2 host (`micro-track.co.za`) is **manual**: click
**Run workflow** on the "Deploy to AWS (EC2)" Action. The deploy **refuses to run
unless the latest "CI - Build & Test" run on the branch passed**, so a red build
can never reach prod. The pipeline is `.github/workflows/deploy.yml`; the work
runs on the box via `deploy/deploy.sh`.

## How it works

```
push to dev ──▶ CI - Build & Test          (automatic)
manual click ──▶ Deploy workflow ──▶ gate: latest CI == success?
                                     └▶ aws ssm send-command ──▶ EC2 runs deploy/deploy.sh
                (no SSH, no inbound ports — uses the SSM agent already on the box)
```

`deploy.sh` on the instance, in order (build before touching live services):

1. `git reset --hard origin/dev`, **preserving the box-local `docker-compose.yml`**
   (prod uses RDS + CloudWatch `awslogs`; the committed compose has a throwaway
   local Postgres that must never reach prod).
2. Builds the frontend with `NODE_OPTIONS=--max-old-space-size=768` (the box is a
   2 GB t3.small). A build failure aborts here, leaving prod untouched.
3. Publishes `dist/` to `/var/www/microtrack` via an **atomic directory swap**
   (no empty-web-root window), keeping the last 3 timestamped backups.
4. Restarts the backend container (`docker compose down && up -d`) — backend code
   is bind-mounted, so the container reinstalls deps and re-runs migrations on boot.
5. **Health-gates** the backend: polls `:3000/api/auth/me` for up to 180 s and
   **fails the deploy** (red pipeline) if the container never serves — so a bad
   migration can't leave prod silently down behind a green build.

Secrets live only in the box's gitignored `.env`; the pipeline never reads or
writes them.

## Verified facts this is built on

| Item | Value |
| --- | --- |
| Instance | `i-014127f47881b6eea` (us-east-1, SSM Online, Ubuntu) |
| Deployed branch | `dev` (box HEAD == `origin/dev`; reflog only ever `pull origin dev`) |
| Backend | container `imy772-backend`, code bind-mounted from `backend/`, talks to RDS `microtrack-db` |
| Frontend | nginx serves `/var/www/microtrack`; `/api/` proxied to `localhost:3000` |
| Account | `184353711080` |

## One-time setup (repo owner)

### 1. Create a scoped CI IAM user

IAM ▸ Users ▸ **Create user** (e.g. `microtrack-ci-deploy`), no console access.
Attach this inline policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "SendDeployCommand",
            "Effect": "Allow",
            "Action": "ssm:SendCommand",
            "Resource": [
                "arn:aws:ec2:us-east-1:184353711080:instance/i-014127f47881b6eea",
                "arn:aws:ssm:us-east-1::document/AWS-RunShellScript"
            ]
        },
        {
            "Sid": "ReadCommandResult",
            "Effect": "Allow",
            "Action": [
                "ssm:GetCommandInvocation",
                "ssm:ListCommandInvocations"
            ],
            "Resource": "*"
        }
    ]
}
```

Create an access key for it (use case: Application running outside AWS).

### 2. Add the key as GitHub repo secrets

Repo ▸ Settings ▸ Secrets and variables ▸ Actions ▸ **New repository secret**:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 3. Test

Actions ▸ **Deploy to AWS (EC2)** ▸ **Run workflow** (manual dispatch). Watch the
job log — it streams the on-box stdout/stderr and fails if the SSM command fails.

## Upgrade path (optional, more secure)

Replace the static access key with GitHub OIDC: create an IAM role trusting
`token.actions.githubusercontent.com`, give the workflow `permissions: id-token: write`,
and swap the `configure-aws-credentials` inputs to `role-to-assume`. Removes the
long-lived secret entirely.
