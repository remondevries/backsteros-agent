# Deploy staging (`staging.backsteros.com`)

Web-first BacksterOS Agent on **backsteros.com** (`161.35.86.25`) via **Kamal** + host **nginx** TLS.

## Prerequisites

- [Kamal](https://kamal-deploy.org/) CLI — on macOS with Homebrew Ruby: `/opt/homebrew/opt/ruby/bin/gem install kamal`
- Docker (OrbStack or Docker Desktop; use `docker context use orbstack` if buildx fails)
- SSH access: `ssh backsteros.com` (OpenSSH + 1Password agent works; Kamal’s Net::SSH does **not** — see below)
- GHCR: `gh auth token` works as `KAMAL_REGISTRY_PASSWORD` if the token has `write:packages`

## 1. Secrets

```bash
cp .kamal/secrets.example .kamal/secrets
# KAMAL_REGISTRY_PASSWORD=$(gh auth token)
# SIDECAR_TOKEN from ~/.backsteros-agent/.env (or generate a new token)
chmod 600 .kamal/secrets
```

Generate a server access token (if you do not reuse your local dev token):

```bash
openssl rand -base64 32
```

Users paste this in **Settings → Account → Server access** after deploy.

### SSH for Kamal (1Password)

`kamal` uses Ruby Net::SSH, which cannot talk to the 1Password SSH agent. Workaround:

```bash
ssh-keygen -t ed25519 -f /tmp/backsteros-kamal-staging.key -N ""
ssh backsteros.com "grep -Fq \"$(cat /tmp/backsteros-kamal-staging.key.pub)\" ~/.ssh/authorized_keys || cat /tmp/backsteros-kamal-staging.key.pub >> ~/.ssh/authorized_keys"
```

Uncomment the `ssh.keys` entry in `config/deploy.yml` (or keep a local `config/deploy.local.yml` overlay) pointing at that private key.

## 2. DNS

Add an **A record**:

| Name | Value |
|------|--------|
| `staging.backsteros.com` | `161.35.86.25` |

(Cloudflare proxy is fine. Use **SSL/TLS → Full (strict)** once Certbot has issued a cert on the droplet.)

## 3. nginx on the server

After DNS propagates:

```bash
scp deploy/nginx/staging.backsteros.com.conf backsteros.com:/tmp/staging-backsteros.conf
ssh backsteros.com 'sudo cp /tmp/staging-backsteros.conf /etc/nginx/sites-available/staging-backsteros && \
  sudo ln -sf /etc/nginx/sites-available/staging-backsteros /etc/nginx/sites-enabled/ && \
  sudo nginx -t && sudo systemctl reload nginx'
ssh backsteros.com 'sudo certbot --nginx -d staging.backsteros.com'
```

This matches **agent.backsteros.com**: nginx → `127.0.0.1:8082` (kamal-proxy) → container `:3847`.

## 4. Deploy

From the repo root (with `ssh.keys` uncommented if you use the 1Password workaround):

```bash
export PATH="/opt/homebrew/lib/ruby/gems/4.0.0/bin:/opt/homebrew/opt/ruby/bin:$PATH"

# Build Linux image locally (labels image for Kamal)
docker build --platform linux/amd64 --label service=backsteros-staging \
  -t ghcr.io/lemo-design/backsteros-agent-ui:latest -f Dockerfile .
docker push ghcr.io/lemo-design/backsteros-agent-ui:latest

# Pull on server and boot (env + kamal-proxy route)
ssh backsteros.com 'docker pull ghcr.io/lemo-design/backsteros-agent-ui:latest'
kamal build pull -c config/deploy.yml
kamal app boot -c config/deploy.yml
```

`kamal deploy` clones **committed** git HEAD and may ignore local Dockerfile fixes until they are pushed. Prefer **build → push → pull → boot** while iterating.

Useful commands:

```bash
kamal app logs -c config/deploy.yml
kamal app exec -c config/deploy.yml --interactive --reuse "ls -la /data"
docker pull ghcr.io/lemo-design/backsteros-agent-ui:latest   # on server, before re-boot
kamal app boot -c config/deploy.yml
```

## 5. Verify

```bash
curl -sS https://staging.backsteros.com/healthz | jq .
```

Open `https://staging.backsteros.com`, sign in with `SIDECAR_TOKEN`, connect Linear, then add your **Cursor API key** in the connect gate or **Settings → Cursor** (each user provides their own key; it is stored on the server volume under `/data`).

Seed OAuth files on the volume or configure client id/secret in secrets if needed.

### Linear OAuth redirect URI (staging)

On staging, Linear must redirect to the **public** callback on the server — not `localhost:3510`:

```text
https://staging.backsteros.com/linear/oauth/callback
```

Add that URI exactly in your [Linear OAuth application](https://linear.app/settings/api/applications). The connect gate on staging shows the same URL. Local desktop dev still uses `http://localhost:3510–3515/linear/oauth/callback`.

The sidecar picks the public URL automatically from `ALLOWED_ORIGINS` when `NODE_ENV=production`. Override with `LINEAR_OAUTH_PUBLIC_BASE_URL` if needed.

## Data volume

Persistent state lives in Docker volume `backsteros_staging_data` mounted at `/data` (`BACKSTER_DATA_DIR`):

- Accounts, workspace, integration tokens, profiles

To copy local dev data once:

```bash
# Example: tar local ~/.backsteros-agent and extract into the container volume (adjust paths)
kamal app exec -c config/deploy.yml --interactive --reuse "ls /data"
```

### Whoop

Whoop sign-in runs on the server — no local CLI required.

1. Open **Settings → Whoop** on staging.
2. Enter your Whoop email and password, then **Sign in to Whoop**.
3. If MFA is enabled, enter the SMS or authenticator code.
4. Click **Test connection** to verify today's snapshot loads.

Tokens are stored in `/data/totem.env` on the server volume. Re-sign in when tokens expire (~30 days).

## Desktop remote shell

After staging works in the browser:

```bash
BACKSTER_SERVER_URL=https://staging.backsteros.com npm run tauri:dev
```

## Config reference

| File | Purpose |
|------|---------|
| `config/deploy.yml` | Kamal service, env, proxy host, volume |
| `.kamal/secrets` | Registry + app secrets (gitignored) |
| `Dockerfile` | Production image (Bun + `dist/` + sidecar) |
| `deploy/nginx/staging.backsteros.com.conf` | Host TLS + proxy to Kamal |

## Legacy agent

`agent.backsteros.com` still serves the **old Python** agent on the same server. This staging app uses image `lemo-design/backsteros-agent-ui` and service `backsteros-staging` — no collision with `backsteros-agent-web`.
