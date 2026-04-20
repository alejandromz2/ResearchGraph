# Research Graph

A tool for organizing research papers using a graph-based interface, featuring a PDF viewer, Excalidraw integration, and collaborative features.

## Project Structure

- **backend/**: Express.js server with SQLite (better-sqlite3) for data persistence and Multer for PDF uploads.
- **frontend/**: React application built with Vite, Tailwind CSS, and various visualization libraries.

## Prerequisites

- Node.js (v18 or higher)
- npm

## Installation

You can install all dependencies for the root, backend, and frontend with a single command from the root directory:

```bash
npm run install:all
```

Alternatively, you can install them manually:

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

## Running the Application

To start both the backend and frontend concurrently from the root directory:

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Features

- **Graph View**: Visualize relationships between papers using a force-directed graph.
- **Node Editor**: Edit paper metadata including authors, metrics, and observations.
- **PDF Viewer**: Upload and view PDFs directly in the application with highlighting support.
- **Excalidraw Integration**: Draw and annotate directly on each paper's canvas.
- **Table View**: Manage your research collection in a structured grid format.
- **Project Management**: Organize your research into different projects.

## Tech Stack

- **Backend**: Node.js, Express, SQLite, Multer, TypeScript.
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide React.
- **Visualization**: React Force Graph, Excalidraw, React PDF Highlighter.
