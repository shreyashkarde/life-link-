# 🚑 LifeLink - Smart Healthcare & Live Ambulance Dispatch System

A production-grade, full-stack **MERN** (MongoDB, Express, React+Vite, Node.js) healthcare and ambulance dispatch platform featuring **5 dedicated role-based dashboards**, real-time **Socket.io** event dispatching, live **Leaflet GPS tracking** with animated markers, instant **1-Click SOS emergency escalation**, verified **doctor appointments**, and **rating & review systems**.

---

## 🌟 Key System Features

1. **Uber-Like Ambulance Dispatch**:
   - Search nearest available ambulances (ALS, BLS, and Oxygen tiers).
   - Real-time GPS location updates emitted every 3–5 seconds from the driver.
   - Smooth animated vehicle marker on interactive Leaflet maps with dynamic route lines and live ETA.
   - Full ride lifecycle: `PENDING` ➔ `ACCEPTED` ➔ `ONGOING` ➔ `ARRIVED_AT_PATIENT` ➔ `ARRIVED_AT_HOSPITAL` ➔ `COMPLETED`.

2. **🚨 1-Click Instant SOS Dispatch**:
   - Emergency button with auto-geocoded GPS pickup coordinates.
   - Immediate high-priority broadcast to all nearest drivers and trauma centers.
   - Auto-assigned fastest ALS response unit.

3. **👨‍⚕️ Verified Doctor Consultations & Slot Manager**:
   - Filter specialists by Cardiology, Neurology, Orthopedics, Pediatrics, General Medicine, and Emergency Trauma.
   - Interactive calendar with dynamic slot selection.
   - Complete consultation workflow with digital prescriptions and clinical notes.

4. **⭐ Rating & Review System**:
   - Patients can rate doctors and drivers on a 1–5 star scale with written feedback.
   - Dynamic recalculation of average ratings and total review counters.

---

## 👥 5 Role-Based Dashboards

| Role | Demo Credentials | Key Capabilities |
| :--- | :--- | :--- |
| **Patient** | `patient@lifelink.com` / `password123` | Search doctors, book appointments, book ambulance, 1-click SOS, live GPS tracking, ride history, star ratings. |
| **Doctor** | `doctor1@lifelink.com` / `password123` | Manage daily consultation queue, slot manager (add/delete times), write digital prescriptions, patient history, view ratings. |
| **Ambulance Driver** | `driver1@lifelink.com` / `password123` | Online/Offline toggle, live GPS transmitter & driving simulator, audio-visual incoming ride request popup, ride stage stepper. |
| **Hospital Admin** | `admin@hospital.com` / `password123` | Bed & ICU occupancy monitoring, doctor staff & ambulance fleet oversight, incoming trauma emergency triage feed. |
| **Super Admin** | `superadmin@lifelink.com` / `password123` | Global platform analytics, user directory management, account activation/deactivation, hospital network facilities. |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**:
  - React 18 / Vite
  - Tailwind CSS with White + Blue theme (`#2563EB`, `#3B82F6`, `#F8FAFC`)
  - Lucide React Icons
  - Leaflet & React-Leaflet for interactive live mapping
  - Axios with JWT Interceptor
  - Socket.io-client
  - React Router DOM v6
- **Backend**:
  - Node.js & Express (TypeScript)
  - MongoDB & Mongoose ORM
  - Socket.io (Room-based event dispatching)
  - JSON Web Tokens (JWT) & bcryptjs
  - CORS, Dotenv

---

## 🚀 How to Run the Project

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (Local `mongodb://127.0.0.1:27017` or cloud MongoDB Atlas connection string)

### 2. Install Dependencies
From the root workspace folder:
```powershell
npm run install:all
```
*(Or run `npm install` inside `backend` and `frontend` separately).*

### 3. Seed Demo Data
Populate the database with hospitals, 5 role demo accounts, doctors, ambulances, and slots:
```powershell
npm run seed
```

### 4. Start the Application
Run both backend (Port 5000) and frontend (Port 5173) simultaneously:
```powershell
npm run dev
```

Or run individually in separate terminals:
- **Backend API**: `cd backend && npm run dev`
- **Frontend App**: `cd frontend && npm run dev`

Open your browser at **`http://localhost:5173`**.

---

## 📡 Socket.io Real-Time Events Reference

| Event Name | Direction | Payload Description |
| :--- | :--- | :--- |
| `join_user` | Client ➔ Server | Joins user private room `user_{id}` |
| `join_driver` | Client ➔ Server | Joins driver room `driver_{id}` and `online_drivers` pool |
| `join_booking` | Client ➔ Server | Joins ride tracking room `booking_{id}` |
| `booking:newRequest` | Client ➔ Server | Emits new ambulance booking to target driver or pool |
| `booking:driverAccepted` | Client ➔ Server | Emits acceptance notification to patient |
| `booking:updateStatus` | Client ➔ Server | Updates ride stage (`ONGOING`, `ARRIVED_AT_PATIENT`, `COMPLETED`) |
| `driver:locationUpdate` | Client ➔ Server | Transmits live lat/lng every 3–5 seconds to tracking room |
| `emergency:sosTriggered` | Client ➔ Server | Broadcasts critical SOS emergency to all drivers & trauma centers |

---

## 📄 License
MIT License. Built for Production-Grade Emergency Healthcare and Dispatch Systems.
