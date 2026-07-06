# Homelytics

A real-estate price estimator (California Housing) built around a complete MLOps pipeline: data versioning, experiment tracking, model registry, CI/CD with quality gates, monitoring, and cloud deployment.

The model itself (a sklearn `RandomForestRegressor`) isn't the point of the project — the MLOps infrastructure around it is what's being evaluated.

## Tech stack

| Area | Tool |
|---|---|
| Backend | FastAPI (Python) |
| Frontend | Next.js (React) |
| Data versioning | DVC (DagsHub remote) |
| ML tracking / registry | MLflow (hosted on DagsHub) |
| Containerization | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Deployment | Render |

## Architecture

```
                ┌─────────────┐        POST /predict        ┌──────────────┐
       user ───▶│  Frontend   │ ───────────────────────────▶ │   Backend    │
                │  (Next.js)  │ ◀─────────────────────────── │  (FastAPI)   │
                └─────────────┘        predicted_price       └──────┬───────┘
                                                                     │ loads the model
                                                                     │ models:/homelytics-price-model@production
                                                                     ▼
┌────────────┐   dvc push/pull   ┌──────────────┐   log runs   ┌───────────────┐
│  data/*.py │ ─────────────────▶│   DagsHub    │◀─────────────│  data/train.py │
│ (dataset)  │                   │ (DVC + MLflow)│              │data/evaluate.py│
└────────────┘                   └──────────────┘              └───────────────┘

Backend exposes /metrics  ──▶  Prometheus  ──▶  Grafana (dashboard)
```

## Repo structure

```
backend/            FastAPI API (endpoints, model loading, unit/integration tests)
frontend/           Next.js app (form, map, history page)
data/               Data/ML scripts: fetch.py, train.py, evaluate.py, verify.py
e2e/                Selenium end-to-end test (full user flow)
monitoring/         Prometheus config + Grafana provisioning (datasource + dashboard)
.github/workflows/  The 3 CI/CD pipelines
docker-compose.yml  Full local stack (backend, frontend, prometheus, grafana)
```

## Branching strategy

```
feature/*  →  dev  →  staging  →  main
```

- All development happens on a `feature/...` (or `fix/...`) branch
- **Never commit directly** to `dev`, `staging`, or `main` — everything goes through a Pull Request
- `dev`: continuous integration of features
- `staging`: pre-production validation (full test suite, E2E, model training + quality gate)
- `main`: production (final check + deployment)

## Getting started (local)

### With Docker (recommended)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend (API + Swagger docs) | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (login `admin` / `admin`) |

Ports are configurable via environment variables (`BACKEND_PORT`, `FRONTEND_PORT`, `PROMETHEUS_PORT`, `GRAFANA_PORT`), see `docker-compose.yml`.

### Without Docker

**Backend**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

export MLFLOW_TRACKING_URI=https://dagshub.com/djamelofficiel.pro/homelytics.mlflow
export MLFLOW_TRACKING_USERNAME=<your_dagshub_username>
export MLFLOW_TRACKING_PASSWORD=<your_dagshub_token>
export MODEL_ALIAS=production   # or "staging" to test a not-yet-validated model

uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
Requires a `.env.local` file (see `.env.exemple`) with `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Data & DVC

The dataset (California Housing, via `sklearn.datasets`) is versioned with **DVC**, remote hosted on **DagsHub** (not Google Drive — a deliberate choice, after a failed attempt with Google Drive on a previous project).

```bash
pip install dvc dvc-s3
dvc remote modify origin --local user <your_dagshub_username>
dvc remote modify origin --local password <your_dagshub_token>
dvc pull      # fetches data/california_housing.csv
```

Only the pointer file (`data/california_housing.csv.dvc`, a few lines with a hash) is tracked by Git — the real file lives on DagsHub.

## MLflow — tracking & registry

Each training run (`data/train.py`) logs to the `homelytics-price-prediction` experiment:
- params: `n_estimators`, `max_depth`, `git_commit`, `dvc_data_version`
- metric: `rmse`
- the model itself, registered under `homelytics-price-model` (a new version on every run)

The model uses MLflow's **alias** system (`@staging`, `@production`) rather than the legacy "stages" system (deprecated since MLflow 2.9, and not supported by DagsHub's MLflow server for MLflow 3.x clients).

`data/evaluate.py` computes the R2 score of the freshly trained model; if R2 ≥ 0.60 (quality gate), the `production` alias is set automatically. `data/verify.py` checks that such an alias exists before any production deployment.

## Tests

| Level | Location | What it checks |
|---|---|---|
| Unit | `backend/tests/unit/` | Request schema validation, quality gate (R2 threshold) |
| Integration | `backend/tests/integration/` | `/predict` and `/health` through a real FastAPI app + loaded model |
| End-to-end | `e2e/test_userflow.py` | Full flow in a real browser (Selenium): form → submit → result displayed |

```bash
cd backend && pytest tests/ -v          # unit + integration
cd e2e && pytest test_userflow.py -v    # E2E (requires frontend + backend running)
```

## CI/CD

Three GitHub Actions workflows (`.github/workflows/`):

**`pr-to-dev.yml`** — on every PR to `dev`:
lint (`ruff`) → unit tests → integration tests → Docker build (no push)

**`dev-to-staging.yml`** — on every push to `staging`:
full test suite → E2E Selenium → build & push Docker images (GHCR) → staging deployment (Render); in parallel: `dvc pull` → `train.py` → `evaluate.py` (quality gate, sets aliases)

**`staging-to-main.yml`** — on every push to `main`:
checks that a model version has the `production` alias (`verify.py`) → production deployment (Render)

## Monitoring

The backend exposes its metrics on `/metrics` (via `prometheus-fastapi-instrumentator`): request volume, latency, error rate, plus the standard `up{job="backend"}` metric generated by Prometheus itself.

The Grafana dashboard (`monitoring/grafana/provisioning/`) is **provisioned automatically** (no manual configuration) with 4 panels: request volume, `/predict` latency, error rate, backend health status.

The monitoring stack also runs locally via `docker-compose`, and is additionally deployed to Render to monitor the real production backend continuously (see [Deployment](#deployment)).

## Deployment

Hosted on [Render](https://render.com), with separate services for `staging` and `production`:

| Environment | Frontend |
|---|---|
| Staging | https://homelytics-frontend-staging.onrender.com |
| Production | https://homelytics-frontend-production.onrender.com |

| Monitoring | URL |
|---|---|
| Grafana | https://homelytics-grafana.onrender.com |
| Prometheus | https://homelytics-prometheus.onrender.com |

Deployment is triggered automatically by the CI/CD workflows via Render "deploy hooks" (GitHub Actions secrets).

## Environment variables

| Variable | Used by | Description |
|---|---|---|
| `MLFLOW_TRACKING_URI` | backend, data/ | MLflow server URL (DagsHub) |
| `MLFLOW_TRACKING_USERNAME` / `MLFLOW_TRACKING_PASSWORD` | backend, data/ | DagsHub credentials |
| `MODEL_ALIAS` | backend | Model alias to load (`production` by default, `staging` for testing) |
| `ALLOWED_ORIGINS` | backend | Allowed CORS origins (comma-separated list) |
| `NEXT_PUBLIC_API_URL` | frontend | Backend URL called by the form |
| `FRONTEND_URL` | e2e | Frontend URL the Selenium test drives (defaults to `http://localhost:3000`) |
| `BACKEND_PORT` / `FRONTEND_PORT` / `PROMETHEUS_PORT` / `GRAFANA_PORT` | docker-compose | Local port overrides for each service (see [Getting started](#getting-started-local)) |
| `BACKEND_TARGET` | monitoring/prometheus (cloud) | Backend hostname Prometheus scrapes in prod, e.g. `homelytics-backend-production.onrender.com` |
| `PROMETHEUS_URL` | monitoring/grafana (cloud) | Prometheus URL Grafana's datasource points to in prod, e.g. `https://homelytics-prometheus.onrender.com` |
