# Financial Crime Investigation System

A lightweight, clean, and professional frontend built with **React + Vite** designed to interface directly with a **Flask REST API** and **SQL Database**.

---

## Core System Flow

The system communicates a streamlined 5-step investigative workflow:

```
[1] Scam happens
      ↓
[2] Case is received
      ↓
[3] AI-assisted investigation
      ↓
[4] Important details are identified
      ↓
[5] Final report is generated
```

---

## Key Features & Architecture

- **Clean, Minimal, Professional UI**:
  - Mostly white & light-gray interface with restrained dark navy/blue accents.
  - Zero unnecessary animations, 3D effects, flashy landing pages, or excessive cards.
  - Desktop-first and responsive. High-readability typography (`Inter` + `JetBrains Mono`).
- **Strict Data Integrity (No Dummy Data)**:
  - No invented static cases, fake names, synthetic amounts, or dummy AI findings.
  - When no backend data exists, clear, calm **empty states** guide the user.
- **Authentication**:
  - Clean **First-Time Admin Signup → Login** workflow.
  - No visible RBAC system in frontend (no user management, role switches, or investigator accounts). Designed specifically for the Admin.
  - Admin credentials are handled securely by the Flask backend and stored in the SQL database.
- **Navigation & Pages**:
  - `Dashboard`: System overview (Cases received, Cases under investigation, Completed investigations, Reports).
  - `Cases`: List of cases ingested into the SQL database with an intake dialog to receive real cases.
  - `Case Details`: Deep inspection of incident summary, financial transactions, and evidence artifacts.
  - `Investigation`: The core AI analysis workspace. Triggers AI investigation, surfaces extracted details, flags suspicious indicators, and outputs findings.
  - `Reports`: Formal final investigation report with verified findings and PDF export / print capabilities.

---

## Technology Stack

- **Frontend**: React 19 + Vite 8
- **Styling**: Vanilla CSS (`src/index.css`)
- **Backend Architecture**: Flask REST API (`flask_backend_template.py`)
- **Database**: SQL / SQLite (`investigation_system.db`)

---

## Getting Started

### 1. Run the React Frontend
```bash
npm install
npm run dev
```
The application will launch at `http://localhost:5173`.

### 2. Optional: Run the Flask REST Backend
A production-ready reference Flask backend is included in `flask_backend_template.py`:
```bash
pip install flask flask-cors
python flask_backend_template.py
```
The Flask API will run on `http://localhost:5000/api`. Vite is preconfigured with a proxy to forward `/api` requests to Flask seamlessly without CORS issues.

---

## Project Structure

```
├── flask_backend_template.py  # Reference Flask REST API + SQLite implementation
├── index.html                 # Main HTML entrypoint with clean typography
├── vite.config.js             # Vite config with /api proxy to Flask port 5000
├── src/
│   ├── main.jsx               # React DOM root entry
│   ├── App.jsx                # Main application component & route management
│   ├── api.js                 # Centralized API client connecting to Flask
│   ├── index.css              # Minimal, clean design system & styles
│   ├── components/
│   │   ├── Navbar.jsx         # Minimal header with navigation & logout
│   │   └── WorkflowBar.jsx    # Visual representation of the 5-step workflow
│   └── pages/
│       ├── Signup.jsx         # First-time Admin account setup
│       ├── Login.jsx          # Admin authentication
│       ├── Dashboard.jsx      # Metrics overview & empty states
│       ├── Cases.jsx          # Received cases list & intake dialog
│       ├── CaseDetails.jsx    # Selected case incident & evidence view
│       ├── Investigation.jsx  # AI investigation execution & findings
│       └── Report.jsx         # Final report dossier & export
```
