# SEAST

SEAST is a full-stack Social Engineering Awareness and Simulation Tool rebuilt around the stack shown in your project photo:

- Frontend: HTML, CSS, React.js
- Backend: Python with Flask
- Database: PostgreSQL
- Visualization: Chart.js
- Deployment: Docker
- Security: JWT auth, password hashing, RBAC, TLS-ready deployment path
- APIs: SendGrid and Twilio integration hooks
- AI Integration: heuristic ML-ready recommendation layer for user risk guidance

## Features

- Admin and user authentication with role-based access control
- First-admin registration flow for an empty database
- User, campaign, training, and quiz management from the UI
- Email and SMS simulation workflows
- Safe fake phishing page that never stores real credentials
- Backend-owned risk scoring, reward points, badges, and activity logs
- Adaptive training assignment after risky behavior
- Risk history, leaderboard, and analytics dashboards
- Dockerized PostgreSQL + Flask + React stack

## Tech Stack

- Frontend: React, Vite, Chart.js, CSS
- Backend: Flask, Flask-JWT-Extended, Flask-SQLAlchemy
- Database: PostgreSQL with SQLAlchemy models
- Containerization: Docker, Docker Compose
- Messaging hooks: SendGrid, Twilio

## Project Structure

```text
/client
  /src
    /api
    /components
    /styles
    App.jsx
    main.jsx

/server
  /app
    /routes
    auth.py
    extensions.py
    integrations.py
    models.py
    services.py
  requirements.txt
  run.py
```

## Environment

Copy and update the env files:

```bash
cp .env.example .env
cp client/.env.example client/.env
```

Root `.env.example`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/seast
JWT_SECRET=replace-with-a-long-random-secret
PORT=5001
CLIENT_URL=http://localhost:5173
POSTGRES_DB=seast
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Client `.env.example`:

```env
VITE_API_URL=http://localhost:5001/api
```

## Install Dependencies

Frontend:

```bash
npm install --prefix client
```

Backend:

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run Locally

Start PostgreSQL first.

Run the Flask backend:

```bash
cd server
source .venv/bin/activate
python3 run.py
```

Run the React frontend in another terminal:

```bash
npm run dev --prefix client
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5001/api`

## Run with Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- PostgreSQL: `localhost:5432`

## First Admin Account

1. Start with an empty PostgreSQL database.
2. Open the frontend.
3. Click `Register`.
4. Select `Admin`.
5. Submit the form.

The backend allows admin creation when there are no users yet, or when no admin exists.

## Add Your Own Data

- Users/Admins: `Users`
- Campaigns: `Campaigns`
- Training modules: `Training`
- Quiz questions: `Quiz Questions`

Users can then log in and interact with the simulations, training modules, and quizzes.

## Demo Workflow

1. Register the first admin.
2. Create training modules.
3. Create quiz questions.
4. Add users.
5. Build and assign email or SMS campaigns.
6. Log in as a user and interact with simulations.
7. Review admin analytics and reports.

## Ethical Disclaimer

- SEAST is for authorized educational awareness simulations only.
- Real credentials are never stored.
- Credential events record only that a submission occurred.
- Simulation content should be clearly labeled as training.
- Use SendGrid, Twilio, and any future ML models only within approved organizational policy.
