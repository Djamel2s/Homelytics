# Homelytics

Estimateur de prix immobilier (California Housing) avec un pipeline MLOps complet : versioning des données, tracking d'expériences, registry de modèles, CI/CD à quality gates, monitoring et déploiement cloud.

Le modèle (un `RandomForestRegressor` sklearn) n'est pas l'objectif du projet — c'est l'infrastructure MLOps autour qui est évaluée.

## Stack technique

| Domaine | Outil |
|---|---|
| Backend | FastAPI (Python) |
| Frontend | Next.js (React) |
| Versioning des données | DVC (remote DagsHub) |
| Tracking / Registry ML | MLflow (hébergé sur DagsHub) |
| Conteneurisation | Docker + docker-compose |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Déploiement | Render |

## Architecture

```
                ┌─────────────┐        POST /predict        ┌──────────────┐
   utilisateur ─▶  Frontend   │ ───────────────────────────▶ │   Backend    │
                │  (Next.js)  │ ◀─────────────────────────── │  (FastAPI)   │
                └─────────────┘        predicted_price       └──────┬───────┘
                                                                     │ charge le modèle
                                                                     │ models:/homelytics-price-model@production
                                                                     ▼
┌────────────┐   dvc push/pull   ┌──────────────┐   log runs   ┌───────────────┐
│  data/*.py │ ─────────────────▶│   DagsHub    │◀─────────────│  data/train.py │
│ (dataset)  │                   │ (DVC + MLflow)│              │data/evaluate.py│
└────────────┘                   └──────────────┘              └───────────────┘

Backend expose /metrics  ──▶  Prometheus  ──▶  Grafana (dashboard)
```

## Structure du repo

```
backend/            API FastAPI (endpoints, chargement du modèle, tests unit/integration)
frontend/           Application Next.js (formulaire, carte, historique)
data/               Scripts data/ML : fetch.py, train.py, evaluate.py, verify.py
e2e/                Test end-to-end Selenium (parcours utilisateur complet)
monitoring/         Config Prometheus + provisioning Grafana (datasource + dashboard)
.github/workflows/  Les 3 pipelines CI/CD
docker-compose.yml  Stack complète en local (backend, frontend, prometheus, grafana)
```

## Stratégie de branching

```
feature/*  →  dev  →  staging  →  main
```

- Tout développement se fait sur une branche `feature/...` (ou `fix/...`)
- **Jamais de commit direct** sur `dev`, `staging` ou `main` — tout passe par une Pull Request
- `dev` : intégration continue des features
- `staging` : validation pré-production (tests complets, E2E, entraînement + quality gate du modèle)
- `main` : production (vérification finale + déploiement)

## Démarrage rapide (local)

### Avec Docker (recommandé)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend (API + docs Swagger) | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 (login `admin` / `admin`) |

Les ports sont configurables via des variables d'environnement (`BACKEND_PORT`, `FRONTEND_PORT`, `PROMETHEUS_PORT`, `GRAFANA_PORT`), voir `docker-compose.yml`.

### Sans Docker

**Backend**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

export MLFLOW_TRACKING_URI=https://dagshub.com/djamelofficiel.pro/homelytics.mlflow
export MLFLOW_TRACKING_USERNAME=<ton_username_dagshub>
export MLFLOW_TRACKING_PASSWORD=<ton_token_dagshub>
export MODEL_ALIAS=production   # ou "staging" pour tester un modèle non encore validé

uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
Nécessite un fichier `.env.local` (voir `.env.exemple`) avec `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Données & DVC

Le dataset (California Housing, via `sklearn.datasets`) est versionné avec **DVC**, remote hébergé sur **DagsHub** (pas Google Drive, choix assumé après un essai infructueux sur un précédent projet).

```bash
pip install dvc dvc-s3
dvc remote modify origin --local user <ton_username_dagshub>
dvc remote modify origin --local password <ton_token_dagshub>
dvc pull      # récupère data/california_housing.csv
```

Seul le pointeur (`data/california_housing.csv.dvc`, quelques lignes avec un hash) est suivi par Git — le vrai fichier vit sur DagsHub.

## MLflow — tracking & registry

Chaque entraînement (`data/train.py`) logue dans l'expérience `homelytics-price-prediction` :
- params : `n_estimators`, `max_depth`, `git_commit`, `dvc_data_version`
- métrique : `rmse`
- le modèle, enregistré sous `homelytics-price-model` (nouvelle version à chaque run)

Le modèle utilise le système d'**aliases** MLflow (`@staging`, `@production`) plutôt que l'ancien système de "stages" (déprécié depuis MLflow 2.9, et non supporté par le serveur MLflow de DagsHub pour les clients MLflow 3.x).

`data/evaluate.py` calcule le R2 du modèle fraîchement entraîné ; si R2 ≥ 0.60 (quality gate), l'alias `production` est posé automatiquement. `data/verify.py` vérifie qu'un tel alias existe avant tout déploiement en production.

## Tests

| Niveau | Emplacement | Ce qu'ils vérifient |
|---|---|---|
| Unitaires | `backend/tests/unit/` | Validation du schéma de requête, quality gate (R2 seuil) |
| Intégration | `backend/tests/integration/` | `/predict` et `/health` via une vraie app FastAPI + modèle chargé |
| End-to-end | `e2e/test_userflow.py` | Parcours complet dans un vrai navigateur (Selenium) : formulaire → soumission → résultat affiché |

```bash
cd backend && pytest tests/ -v          # unit + intégration
cd e2e && pytest test_userflow.py -v    # E2E (nécessite frontend + backend démarrés)
```

## CI/CD

Trois workflows GitHub Actions (`.github/workflows/`) :

**`pr-to-dev.yml`** — à chaque PR vers `dev` :
lint (`ruff`) → tests unitaires → tests d'intégration → build Docker (sans push)

**`dev-to-staging.yml`** — à chaque push sur `staging` :
suite de tests complète → E2E Selenium → build & push des images Docker (GHCR) → déploiement staging (Render) ; en parallèle : `dvc pull` → `train.py` → `evaluate.py` (quality gate, pose les alias)

**`staging-to-main.yml`** — à chaque push sur `main` :
vérifie qu'une version du modèle a l'alias `production` (`verify.py`) → déploiement production (Render)

## Monitoring

Le backend expose ses métriques sur `/metrics` (via `prometheus-fastapi-instrumentator`) : volume de requêtes, latence, taux d'erreur, plus les métriques standard `up{job="backend"}` générées par Prometheus lui-même.

Le dashboard Grafana (`monitoring/grafana/provisioning/`) est **provisionné automatiquement** (pas de configuration manuelle) avec 4 panels : volume de requêtes, latence de `/predict`, taux d'erreur, statut de santé du backend.

> Actuellement, la stack de monitoring (Prometheus + Grafana) ne tourne qu'en local via `docker-compose`. Le endpoint `/metrics` du backend de production, lui, est bien exposé publiquement.

## Déploiement

Hébergé sur [Render](https://render.com), avec des services distincts pour `staging` et `production` :

| Environnement | Frontend |
|---|---|
| Staging | https://homelytics-frontend-staging.onrender.com |
| Production | https://homelytics-frontend-production.onrender.com |

Le déploiement est déclenché automatiquement par les workflows CI/CD via des "deploy hooks" Render (secrets GitHub Actions).

## Variables d'environnement

| Variable | Utilisée par | Description |
|---|---|---|
| `MLFLOW_TRACKING_URI` | backend, data/ | URL du serveur MLflow (DagsHub) |
| `MLFLOW_TRACKING_USERNAME` / `MLFLOW_TRACKING_PASSWORD` | backend, data/ | Identifiants DagsHub |
| `MODEL_ALIAS` | backend | Alias du modèle à charger (`production` par défaut, `staging` pour tester) |
| `ALLOWED_ORIGINS` | backend | Origines autorisées pour le CORS (liste séparée par des virgules) |
| `NEXT_PUBLIC_API_URL` | frontend | URL du backend appelée par le formulaire |
