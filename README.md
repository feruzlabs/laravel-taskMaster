# TaskManager – Laravel + React + PostgreSQL

A full-stack learning project featuring:
- Backend: Laravel 11 (Sanctum, Eloquent, L5-Swagger)
- Frontend: React + Vite + Tailwind
- DB: PostgreSQL
- Containerization: Docker / Docker Compose
- Orchestration: Kubernetes (Namespace, ConfigMap, Secret, PVC, Deployments, Services, Ingress)

The app supports daily pages for tasks, automatic rollover for incomplete tasks, authentication, and OpenAPI docs.

## Quick Links
- API base: `/api/v1`
- Auth endpoints: `/api/v1/auth/*` (`/register`, `/login`, `/logout`, `/me`)
- Tasks: `/api/v1/tasks` (CRUD) and `/api/v1/tasks/rollover`
- Swagger UI (local): `http://localhost:8000/api/documentation`
- Production host (example): `https://taskmanager.feruzlabs.dev`

---

## 1) Local Development with Docker Compose

### Prerequisites
- Docker Desktop 4.x or later
- Git, Make (optional)

### Structure
```
backend/             # Laravel 11 API
frontend/            # React + Vite + Tailwind
k8s/                 # Kubernetes manifests
docker/              # Compose and Dockerfiles
```

### Start services
From `docker/` directory:
```bash
# Start Postgres, backend and frontend in dev mode
docker compose up -d --build

# Tail logs (optional)
docker compose logs -f
```

### Environment
- Backend env in `docker/backend.env`.
- Compose maps backend on `http://localhost:8000`, frontend on `http://localhost:5173`.
- API base used by frontend: `http://localhost:8000/api/v1` (configured directly in code for dev).

### Useful backend commands
```bash
# Exec into backend container
docker compose exec backend sh

# Clear caches and run migrations
php artisan optimize:clear
php artisan migrate --force --no-interaction

# List routes
php artisan route:list
```

---

## 2) Production Build (Container Images)

You can push images to any registry (Docker Hub, GHCR, etc.). Replace `REGISTRY/USER` with yours.

### Backend image
```bash
# From repo root
docker build -t REGISTRY/USER/taskmanager-backend:latest -f docker/backend/Dockerfile .
docker push REGISTRY/USER/taskmanager-backend:latest
```

### Frontend image (static, served by nginx)
Create a small multi-stage Dockerfile (suggested) or adapt your CI. Example Dockerfile:
```Dockerfile
# docker/frontend/Dockerfile.prod
FROM node:20-alpine AS build
WORKDIR /app
COPY ./frontend/package*.json ./
RUN npm ci
COPY ./frontend .
# Inject API url for prod build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```
Build and push:
```bash
docker build -t REGISTRY/USER/taskmanager-frontend:latest \
  -f docker/frontend/Dockerfile.prod \
  --build-arg VITE_API_BASE_URL="https://taskmanager.feruzlabs.dev/api/v1" .
docker push REGISTRY/USER/taskmanager-frontend:latest
```

Update images in `k8s/backend.yaml` and `k8s/frontend.yaml` accordingly.

---

## 3) Kubernetes – Zero to Hero

### Prerequisites
- A Kubernetes cluster (minikube/kind/dev/prod)
- `kubectl` configured
- NGINX Ingress Controller installed
- cert-manager installed with a `ClusterIssuer` named `letsencrypt-prod`
- DNS `A` record for `taskmanager.feruzlabs.dev` pointing to your Ingress controller’s public IP

### Manifests overview
- `k8s/namespace.yaml` – Namespace `taskmanager`
- `k8s/configmap.yaml` – App configs (`APP_URL`, DB connection, etc.)
- `k8s/secret.yaml` – DB credentials
- `k8s/pvc.yaml` – Persistent volume for Postgres
- `k8s/postgres.yaml` – Postgres Deployment + Service (ClusterIP)
- `k8s/backend.yaml` – Laravel Deployment + Service (ClusterIP)
- `k8s/frontend.yaml` – Frontend Deployment + Service (ClusterIP)
- `k8s/ingress.yaml` – Ingress with TLS, routes `/` to frontend and `/api` to backend

### Apply manifests (order matters)
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml -n taskmanager
kubectl apply -f k8s/secret.yaml -n taskmanager
kubectl apply -f k8s/pvc.yaml -n taskmanager
kubectl apply -f k8s/postgres.yaml -n taskmanager
kubectl apply -f k8s/backend.yaml -n taskmanager
kubectl apply -f k8s/frontend.yaml -n taskmanager
kubectl apply -f k8s/ingress.yaml -n taskmanager
```

### Wait for resources
```bash
kubectl get all -n taskmanager
kubectl describe ingress taskmanager-ingress -n taskmanager
```

### Run Laravel migrations in the cluster
Option A: rely on container entrypoint (already runs `migrate --force`).
Option B: exec once manually:
```bash
kubectl exec -n taskmanager deploy/backend -- \
  php artisan optimize:clear && php artisan migrate --force --no-interaction
```

### Verify
- Frontend: `https://taskmanager.feruzlabs.dev/`
- API: `https://taskmanager.feruzlabs.dev/api/v1/tasks`
- Swagger: `https://taskmanager.feruzlabs.dev/api/documentation`

If 404 for static assets, ensure frontend image serves `/index.html` and `ingress` path `/` routes to `frontend` service.

---

## 4) Configuration Details

### Backend (`k8s/backend.yaml`)
- Listens on container port `8000`
- Uses `backend-config` for app and DB settings, `db-secret` for credentials
- Service `backend` exposes port `8000` (ClusterIP)

### Frontend (`k8s/frontend.yaml`)
- Serves static build over port `80`
- Service `frontend` exposes port `80` (ClusterIP)
- Build arg `VITE_API_BASE_URL` must be set to the prod URL before building

### Ingress (`k8s/ingress.yaml`)
- Host: `taskmanager.feruzlabs.dev`
- TLS: secret `taskmanager-tls` managed by cert-manager (`letsencrypt-prod` ClusterIssuer)
- Routes:
  - `/` → Service `frontend:80`
  - `/api` → Service `backend:8000`

### Database
- `k8s/pvc.yaml` attaches persistent storage to Postgres
- `k8s/postgres.yaml` uses env from ConfigMap/Secret
- Backend `DB_HOST` is set to `postgres` (Service name)

---

## 5) Security, Scalability, and Best Practices

- Security
  - Use `Secret` for DB credentials. Consider external secret stores for production (e.g., ExternalSecrets).
  - Restrict Ingress with `ssl-redirect` and force HTTPS (already enabled).
  - Enable Laravel `APP_ENV=production`, `APP_DEBUG=false`.
  - Keep `SESSION_DOMAIN` and `SANCTUM_STATEFUL_DOMAINS` consistent per your domain.

- Scalability
  - Set resource requests/limits in Deployments.
  - Use Horizontal Pod Autoscaler (HPA) for backend if needed.
  - Use a managed Postgres for production or StatefulSet with proper HA.

- Observability
  - Add readiness/liveness probes for backend and postgres.
  - Centralized logging (ELK/EFK) and metrics (Prometheus/Grafana).

- Networking/CORS
  - CORS is configured (`backend/config/cors.php`). Update allowed origins for your domain.

- Build & Release
  - CI to build and push images with unique tags (git SHA) and use immutable tags in manifests.
  - Prefer `ConfigMap` for non-sensitive configs and `Secret` for secrets.

- Database Migrations
  - Run migrations on deploy (entrypoint) or via an init Job. Avoid multiple parallel migrations by ensuring a single runner.

- Frontend
  - Build-time inject `VITE_API_BASE_URL` that matches your Ingress `/api/v1` path.

---

## 6) API Summary

- Auth
  - `POST /api/v1/auth/register`: { username, email, password }
  - `POST /api/v1/auth/login`: { email, password }
  - `POST /api/v1/auth/logout` (Bearer)
  - `GET /api/v1/auth/me` (Bearer)

- Tasks (Bearer)
  - `GET /api/v1/tasks?date=YYYY-MM-DD`
  - `POST /api/v1/tasks`: { title, description? }
  - `GET /api/v1/tasks/{id}`
  - `PUT /api/v1/tasks/{id}`: { title?, description?, is_completed? }
  - `DELETE /api/v1/tasks/{id}`
  - `POST /api/v1/tasks/rollover`

---

## 7) Troubleshooting

- 502/404 on host
  - Check Ingress, ensure DNS resolves to Ingress Controller IP.
  - `kubectl describe ingress taskmanager-ingress -n taskmanager` for events.

- SSL issues
  - Ensure cert-manager installed and `letsencrypt-prod` ClusterIssuer exists.
  - Check Certificate and Order resources: `kubectl get certificate,order,challenge -n taskmanager`.

- Backend using wrong DB host
  - Verify `DB_HOST=postgres` in `ConfigMap`, clear caches: `php artisan optimize:clear`.

- Swagger empty or 500
  - Set `L5_SWAGGER_GENERATE_ALWAYS=true`, clear caches, and ensure routes loaded.

- Frontend cannot reach API
  - Confirm `VITE_API_BASE_URL` at build matches `https://taskmanager.feruzlabs.dev/api/v1`.
  - CORS: ensure backend `cors.php` allows your origin.

---

## 8) Local vs Production Matrix

| Aspect | Local (Compose) | Production (K8s) |
|---|---|---|
| Backend URL | http://localhost:8000 | https://taskmanager.feruzlabs.dev/api |
| Frontend URL | http://localhost:5173 | https://taskmanager.feruzlabs.dev |
| DB | docker `postgres` | k8s `postgres` service or managed DB |
| TLS | none | cert-manager + Let’s Encrypt |

---

## 9) Cleanup
```bash
kubectl delete namespace taskmanager
```

Happy hacking and learning Kubernetes with Laravel! 🚀
