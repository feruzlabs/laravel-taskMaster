# TaskManager Project

## Loyiha haqida

Ushbu loyiha Laravel (REST API), ReactJS (Tailwind CSS), va PostgreSQL asosida TaskManager tizimini yaratish va uni Docker hamda Kubernetes yordamida deploy qilishni o‘rganish uchun mo‘ljallangan.

## Arxitektura va texnologiyalar

- **Backend:** Laravel (REST API)
- **Frontend:** ReactJS (Tailwind CSS)
- **Database:** PostgreSQL
- **Containerization:** Docker, Docker Compose
- **Orchestration:** Kubernetes (K8s)

## Papka tuzilmasi

```
backend/    # Laravel backend (REST API)
frontend/   # ReactJS frontend (Tailwind CSS)
k8s/        # Kubernetes yaml fayllari
docker/     # Dockerfile, docker-compose va env fayllar
README.md   # To‘liq qollanma
```

---

## Backend (Laravel) – ishga tushirish (Docker Compose)

Old shartlar: Docker Desktop o‘rnatilgan.

1. Image build qilish:
```bash
cd docker
docker compose up -d --build
```
2. API base URL: `http://localhost:8000`
3. Foydali endpointlar:
   - Auth: `POST /api/register`, `POST /api/login`, `POST /api/logout`
   - Tasks: `GET /api/tasks?date=YYYY-MM-DD`, `POST /api/tasks`, `GET /api/tasks/{id}`, `PUT /api/tasks/{id}`, `DELETE /api/tasks/{id}`, `POST /api/tasks/rollover`

Eslatma: Birinchi ishga tushirishda migratsiyalar avtomatik bajariladi.

---

## Kubernetes (K8s) – deploy qilish

Old shartlar: `kubectl` sozlangan, lokal klaster (minikube/kind) yoki bulut klaster mavjud.

1. Namespace va konfiguratsiyalarni qo‘llash:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/pvc.yaml
```
2. PostgreSQL deploy:
```bash
kubectl apply -f k8s/postgres.yaml
```
3. Backend image-ni lokalda build qilgan bo‘lsangiz, klasterga import qiling (minikube misolida):
```bash
# minikube uchun
minikube image load taskmanager-backend:latest
```
4. Backend deploy:
```bash
kubectl apply -f k8s/backend.yaml
```
5. Tekshirish:
```bash
kubectl get pods -n taskmanager
kubectl get svc -n taskmanager
```
6. Tashqi kirish (NodePort/Ingress kerak bo‘lsa): `backend` servisini `NodePort` yoki Ingress bilan oching.

---

## Ma’lumotlar modeli

- `users`: username, email, password
- `daily_pages`: date (unique)
- `tasks`: daily_page_id, user_id, title, description, is_completed, completed_at

Logika:
- Har kuni `daily_pages.date` bo‘yicha sahifa yaratiladi.
- Tasklar bugungi sahifaga yoziladi.
- Kechadan bajarilmagan tasklar bugungi sahifaga ko‘chiriladi (`POST /api/tasks/rollover`).

---

## Troubleshooting
- DB ulanmadi: `docker compose logs db` yoki `kubectl logs -n taskmanager deploy/postgres` tekshiring.
- Migratsiya muammosi: konteyner ichida `php artisan migrate --force` ishga tushiring.
- API ishlamayapti: `kubectl port-forward -n taskmanager svc/backend 8000:8000` bilan lokalga ulaning.

---
