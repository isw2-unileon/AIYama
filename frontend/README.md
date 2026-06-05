# Alyama - Frontend Web Application

## About the Project
This directory contains the frontend web application for **Alyama**, an AI-driven dynamic and proactive scheduling system. Built as a Single Page Application (SPA), it provides the user interface for the AI chatbot, the interactive weekly calendar, and the biometric onboarding flow.

Unlike traditional calendars, this interface allows users to interact with an AI assistant in natural language to find optimal time slots based on their energy levels (chronotypes) and daily constraints.

## Tech Stack

The frontend is built with modern web technologies focused on performance and developer experience:

- **Core:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/) (Fast Hot Module Replacement)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Routing:** React Router DOM
- **Icons:** Lucide React / Heroicons

## Directory Structure

```text
src/
├── assets/        # Static assets (images, icons)
├── components/    # Reusable UI components (Buttons, Calendar blocks, Chat bubbles)
├── hooks/         # Custom React hooks (e.g., useChatbot)
├── pages/         # Main route pages (Login, Onboarding, Dashboard)
├── services/      # API communication layer (Axios/Fetch calls to the Go backend)
└── App.tsx        # Main application component
```

## Prerequisites

Make sure you have installed:
- [Node.js](https://nodejs.org/) (Version 22 or higher)
- npm (comes with Node.js)

## Getting Started

1. **Install dependencies:**
```bash
   npm install
   ```

2. **Environment Setup:**
   Ensure your backend (Go) is running. By default, Vite is configured to proxy API requests to `http://localhost:8080`. If you need specific environment variables, create a `.env` file in this directory.

3. **Run the development server:**
```bash
   npm run dev
   ```
   The application will be available at [http://localhost:5173](http://localhost:5173).

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the local development server with HMR. |
| `npm run build` | Compiles the TypeScript code and builds the app for production. |
| `npm run lint` | Runs ESLint to find and fix code quality issues. |
| `npm run preview` | Boots up a local web server to serve the production build. |