# RAKSHAK — Predictive Emergency Intelligence & Response Platform

> An AI-powered predictive emergency intelligence and response platform for public infrastructure such as railway stations, metro stations, airports, campuses, and stadiums.

**RAKSHAK is NOT merely an AI CCTV surveillance application.**

Core pipeline: **DETECT → UNDERSTAND → ASSESS RISK → PREDICT ESCALATION → RECOMMEND RESPONSE → VISUALIZE IMPACT**

---

## Problem Statement

Crowded public infrastructure faces recurring emergencies — fires, crowd surges, restricted area intrusions — where delayed detection and poor evacuation routing cost lives. Traditional CCTV systems passively record footage but do not assess risk, predict escalation, or recommend coordinated responses in real time.

## Solution

RAKSHAK integrates computer vision detection, crowd intelligence, anomaly scoring, risk assessment, short-term trend projection, and rule-based response recommendations into a unified command center. A digital twin simulation engine enables demo scenarios and before/after intervention analysis without requiring live CCTV feeds.

## Architecture

```
Frontend (React + Vite + Tailwind)
        │
        │ REST API + WebSocket
        ▼
FastAPI Backend
        │
   ┌────┴────┐
   │         │
Detection   Risk Engine
Engine      │
   │    Prediction Engine
   │         │
   └────┬────┘
        │
 Response Engine
        │
 Evacuation Router
        │
 Incident Manager
        │
    SQLite DB
        │
 Simulation Engine (Demo)
```

## AI/ML Components

| Component | Type | Status |
|-----------|------|--------|
| Person Detection (YOLO) | Real ML inference | Planned (Step 12) |
| Fire/Smoke Detection | Model adapter + simulation fallback | Planned |
| Crowd Intelligence | Deterministic algorithm | Planned |
| Anomaly Scoring | Weighted deterministic algorithm | Planned |
| Risk Engine | Explainable rule-based scoring | Planned |
| Prediction Engine | Short-term trend projection | Planned |
| Response Engine | Rule-based recommendations | Planned |

All components are clearly labeled as **REAL ML**, **DETERMINISTIC**, **SIMULATION**, or **MOCK** — never presented as fake AI output.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts, Leaflet, Lucide icons
- **Backend:** Python, FastAPI, Pydantic, SQLAlchemy, WebSockets
- **Database:** SQLite (local), structured for PostgreSQL migration
- **ML/CV:** OpenCV, Ultralytics YOLO, NumPy, scikit-learn

## Installation

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd Rakshak2.0

# Copy environment config
cp .env.example .env

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

## Running Locally

### Option 1: Development scripts

```bash
# From project root
./scripts/dev.sh
```

### Option 2: Manual start

```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/api/health

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service health check |
| GET | `/api/incidents` | List incidents *(planned)* |
| GET | `/api/risk/current` | Current risk assessment *(planned)* |
| GET | `/api/predictions/current` | Current predictions *(planned)* |
| POST | `/api/simulation/start` | Start simulation *(planned)* |
| WS | `/ws/live` | Live data stream *(planned)* |

## Limitations

- This is a **hackathon prototype**, not production-ready emergency infrastructure
- Demo mode uses **simulated data** — clearly labeled throughout the UI
- YOLO inference runs on CPU with frame skipping; GPU not required
- Prediction engine performs **short-term trend projection**, not long-range AI forecasting
- No facial recognition; all detections are anonymous
- Human authority must approve all critical emergency actions

## Ethical Design

- No facial recognition or identity tracking
- Anonymous object/person track IDs only
- Configurable data retention
- Human-in-the-loop for all critical decisions
- Decision support only — does not autonomously order evacuations

## Future Deployment Architecture

- PostgreSQL for production database
- Kubernetes deployment with GPU nodes for ML inference
- Real CCTV RTSP feed integration via InputSource abstraction
- Custom fire/smoke model training on dedicated datasets
- Multi-site federation with centralized command center

## Project Structure

```
Rakshak2.0/
├── frontend/          # React command center UI
├── backend/           # FastAPI application
│   └── app/
│       ├── api/       # REST endpoints
│       ├── core/      # Configuration
│       ├── database/  # SQLAlchemy session
│       ├── models/    # Database models
│       ├── schemas/   # Pydantic schemas
│       ├── services/  # Business logic
│       ├── ml/        # ML inference
│       └── simulation/# Demo simulation engine
├── ml/                # Training pipeline & datasets
├── docs/              # Documentation
├── scripts/           # Development scripts
├── .env.example
└── README.md
```

## License

Smart India Hackathon 2026 — Academic/Competition Use
