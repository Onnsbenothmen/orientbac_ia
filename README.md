# EduStat-TN — Orientation Universitaire Tunisie

[![CI/CD](https://github.com/Mohamedali2329/EduStat-TN/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Mohamedali2329/EduStat-TN/actions)

> Plateforme BI & IA d'aide à la décision pour les bacheliers tunisiens.  
> Développée par deux étudiants en 4ème année Data Science.

---

## Architecture

| Couche              | Technologie                                                  |
| ------------------- | ------------------------------------------------------------ |
| **Backend**         | Django 4.2 + Django REST Framework                           |
| **Base de données** | PostgreSQL 16                                                |
| **IA / ML**         | XGBoost (prédiction), OpenRouter API (Chatbot Mistral/Llama) |
| **Frontend**        | Next.js 14 + Tailwind CSS + Recharts                         |
| **Infra**           | Docker Compose, GitHub Actions → Vercel                      |

---

## Démarrage rapide

### Prérequis

- Docker & Docker Compose **OU**
- Python 3.12+, Node.js 20+, PostgreSQL 16

### Option 1 — Docker (recommandé)

```bash
# Cloner le repo
git clone https://github.com/Mohamedali2329/EduStat-TN.git
cd EduStat-TN

# Copier les fichiers d'environnement
cp backend/.env.example backend/.env

# Lancer tout
docker compose up --build
```

→ Frontend : http://localhost:3000  
→ Backend API : http://localhost:8000/api/  
→ Admin Django : http://localhost:8000/admin/

### Option 2 — Développement local

**Backend :**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Configurer PostgreSQL

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Importer les données CSV :**

```bash
python manage.py import_scores --csv ../data/scores.csv --delimiter ";"
```

**Entraîner / réentraîner le modèle (Notebook principal) :**

Ouvrir puis exécuter toutes les cellules du notebook :

`backend/notebooks/models_form.ipynb`

**Frontend :**

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

## Endpoints API

| Méthode | URL                     | Description                          |
| ------- | ----------------------- | ------------------------------------ |
| GET     | `/api/gouvernorats/`    | Liste des gouvernorats               |
| GET     | `/api/universites/`     | Liste des universités                |
| GET     | `/api/filieres/`        | Liste des filières (filtrable)       |
| GET     | `/api/scores/`          | Scores historiques                   |
| GET     | `/api/stats/dashboard/` | Statistiques agrégées (Dashboard BI) |
| POST    | `/api/predict/`         | Prédiction d'admission (XGBoost)     |
| POST    | `/api/chat/`            | Chatbot IA (OpenRouter)              |

### Exemple — Prédiction

```json
POST /api/predict/
{
  "score": 2.85,
  "section_bac": "S",
  "filiere_code": "601"
}
```

### Exemple — Chatbot

```json
POST /api/chat/
{
  "message": "Chnahiya a7san filière lel section maths?"
}
```

---

## Structure du projet

```
EduStat-TN/
├── backend/
│   ├── edustat/              # Config Django (settings, urls, wsgi)
│   ├── orientation/          # App principale
│   │   ├── models.py         # Gouvernorat, Universite, Filiere, ScoreHistorique
│   │   ├── views.py          # API views (Dashboard, Predict, Chat)
│   │   ├── serializers.py    # DRF serializers
│   │   ├── urls.py           # Routes API
│   │   ├── services/
│   │   │   ├── prediction.py # XGBoost train & predict
│   │   │   └── chatbot.py    # OpenRouter integration
│   │   └── management/commands/
│   │       ├── import_scores.py  # ETL CSV → PostgreSQL
│   │       └── train_model.py    # Entraîner le modèle
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/              # Pages Next.js (Dashboard, Predict, Chat)
│   │   ├── components/       # Composants Recharts
│   │   └── lib/api.ts        # Client API
│   ├── Dockerfile
│   └── package.json
├── data/
│   └── scores.csv            # Données d'exemple (40 lignes)
├── docker-compose.yml
├── .github/workflows/ci-cd.yml
└── README.md
```

---

## Organisation du travail (2 étudiants)

| Étudiant A (Backend/ML)                  | Étudiant B (Frontend/Chatbot) |
| ---------------------------------------- | ----------------------------- |
| [x] Modèles Django & migrations          | [x] Setup Next.js + Tailwind  |
| [x] Script ETL `import_scores`           | [x] Dashboard BI (Recharts)   |
| [x] Entraînement XGBoost                 | [x] Page Prédiction           |
| [x] API Predict                          | [x] Page Chatbot              |
| [ ] Tests unitaires backend              | [ ] Tests E2E frontend        |
| [ ] Déploiement backend (Railway/Render) | [ ] Déploiement Vercel        |

---

## Validation par étape

1. **60% — Données fonctionnelles**
   - [ ] CSV importé en base PostgreSQL
   - [ ] Dashboard affiche les graphiques
   - [ ] API `/api/stats/dashboard/` retourne les stats

2. **100% — IA intégrée**
   - [ ] Modèle XGBoost entraîné & prédiction fonctionnelle
   - [ ] Chatbot répond en français et derja
   - [ ] CI/CD déployé sur Vercel

---

## Variables d'environnement

| Variable             | Description                  |
| -------------------- | ---------------------------- |
| `DJANGO_SECRET_KEY`  | Clé secrète Django           |
| `POSTGRES_DB`        | Nom de la base PostgreSQL    |
| `POSTGRES_USER`      | Utilisateur PostgreSQL       |
| `POSTGRES_PASSWORD`  | Mot de passe PostgreSQL      |
| `OPENROUTER_API_KEY` | Clé API OpenRouter (Chatbot) |
| `VERCEL_TOKEN`       | Token Vercel (CI/CD)         |

---

## Licence

Projet académique — 4ème année Data Science, 2025/2026.
