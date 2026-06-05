# Alyama: AI-Driven Dynamic Scheduler

## About the Project
Alyama is a dynamic and proactive scheduling system designed to act as a time-optimization assistant. Unlike traditional calendars, it manages schedules, calculates optimal time slots based on the user's energy levels (chronotypes), and uses a local/cloud AI chatbot (Gemini) to reach consensus on task distribution. 

## Tech Stack

**Frontend:**
- React (SPA) + TypeScript
- Vite (Build tool & Dev server)
- Tailwind CSS (Styling)

**Backend:**
- Go (Golang)
- Gin (HTTP Web Framework)

**Database:**
- PostgreSQL
- Supabase (Hosting & Auth)

**AI Integration:**
- Google Gemini API (Natural Language Processing & Allocation Engine)

**Infrastructure:**
- Docker & Docker Compose
- GitHub Actions (CI/CD)

## Project Structure

```text
├── backend/              Go API server & Calculation Engine (Gin)
├── frontend/             React + TypeScript + Vite + Tailwind
├── docs/                 Technical documentation (SRS, Architecture)
├── e2e/                  Playwright E2E tests
├── .github/workflows/    CI/CD pipelines
├── docker-compose.yml    Docker orchestration for backend services
└── Makefile              Dev commands
```

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) & Docker Compose (for the backend environment)
- [Node.js](https://nodejs.org/) 22+ (for the frontend environment)

## Environment Setup

Before running the application, you need to set up the environment variables:
1. Navigate to the `backend` directory and create a `.env` file based on `.env.example` (if provided). Ensure you configure your **Gemini API Key** and **Database credentials** (Supabase/PostgreSQL URL).
2. Navigate to the `frontend` directory and set up any required `.env` variables for the Vite application.

## Getting Started

### 1. Run the Backend (Docker)
The backend is containerized for consistency. Open a terminal in the root directory and run:

```bash
docker compose up --build
```
*The backend API will be available at `http://localhost:8080`*

### 2. Run the Frontend (React + Vite)
Open a new terminal, navigate to the frontend folder, install dependencies, and start the development server:

```bash
cd frontend
npm install
npm run dev
```
*The frontend will be available at `http://localhost:5173`*

The Vite dev server automatically proxies `/api` requests to the Go backend.

## Available Scripts

| Environment | Command                 | Description                                      |
|-------------|-------------------------|--------------------------------------------------|
| **Backend** | `docker compose up`     | Starts the backend server and its dependencies   |
| **Backend** | `docker compose down`   | Stops and removes the containers                 |
| **Frontend**| `npm run dev`           | Starts the Vite development server               |
| **Frontend**| `npm run build`         | Builds the frontend for production               |
| **Frontend**| `npm run lint`          | Runs ESLint to check code quality                |

## Core API Endpoints

| Method | Path             | Description                                      |
|--------|----------------- |--------------------------------------------------|
| `GET`  | `/health`        | Health check to verify API status                |
| `POST` | `/api/chat`      | Sends user input to the AI scheduling engine     |
| `POST` | `/api/tasks`     | Saves a confirmed task into the database         |