# Alyama: AI-Driven Dynamic Scheduler

## About the Project
Alyama is a dynamic and proactive scheduling system designed to act as a time-optimization assistant. Unlike traditional calendars, it manages schedules, calculates optimal time slots based on the user's energy levels (chronotypes), and uses a local AI chatbot to reach consensus on task distribution. 

## Project Structure

```text
├── backend/              Go API server & Calculation Engine (Gin)
├── frontend/             React + TypeScript + Vite + Tailwind
├── docs/                 Technical documentation (SRS, Architecture)
├── e2e/                  Playwright E2E tests
├── .github/workflows/    CI/CD pipelines
└── Makefile              Dev commands
```

## Prerequisites

- [Go](https://go.dev/dl/) 1.24+
- [Node.js](https://nodejs.org/) 22+

## Getting Started

```bash
make install

# Terminal 1
make run-backend    # port 8080

# Terminal 2
make run-frontend   # port 5173
```

The Vite dev server proxies `/api` requests to the backend.

## Commands

| Command              | Description                     |
|----------------------|---------------------------------|
| `make install`       | Install all dependencies        |
| `make run-backend`   | Backend with hot reload (Air)   |
| `make run-frontend`  | Frontend dev server (Vite)      |
| `make test`          | Run all tests                   |
| `make lint`          | Run all linters                 |
| `make e2e`           | Run Playwright E2E tests        |

## API

| Method | Path         | Description    |
|--------|------------- |----------------|
| `GET`  | `/health`    | Health check   |
| `GET`  | `/api/hello` | Sample endpoint|