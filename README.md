# 🚑 LifeLink & Prescripto - Smart Healthcare & Emergency Ambulance Dispatch System (MERN Stack)

A production-grade, enterprise **MERN** (MongoDB, Express.js, React + Vite, Node.js + TypeScript, Socket.IO) full-stack healthcare ecosystem featuring **5-Tier Hierarchical Role Management**, **Real-Time Code-Red Emergency Ambulance Dispatch & Live GPS Telemetry**, **Doctor Consultation Scheduling**, and **Bulk Excel (.xlsx) Data Ingestion**.

---

## 🏛️ System Hierarchy & Architecture

The platform enforces a strict hierarchical data model and relational foreign-key integrity across all entities:

```
                      👑 SuperAdmin (Master System Owner)
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        🏥 Hospital Admin (Lilavati)        🏥 Hospital Admin (Kokilaben)
            │                  │
    ┌───────┴────────┐   ┌─────┴──────────┐
    ▼                ▼   ▼                ▼
👨‍⚕️ Doctors       🚑 Drivers         👨‍⚕️ Doctors
    │                │
    ▼                ▼
👤 Patient Consultations & Emergency SOS Rides
```

---

## 🌟 Core Modules & Capabilities

### 1. 👑 SuperAdmin Portal (`admin@prescripto.com`)
- **Hospital Management**: Complete CRUD operations for hospitals across cities, trauma levels (Level 1 Apex, Level 2), bed capacity, and ICU resuscitation units.
- **System-Wide Telemetry**: Live metrics tracking total hospitals, registered physicians, ambulance fleet, active appointments, and emergency rides.
- **Bulk Hospital Ingestion**: Upload dozens of hospital branches simultaneously via Excel (`.xlsx`).
- **Zero-Data Purge**: One-click purge endpoint (`/api/admin/clear-all-data`) to reset mock data for clean real-time operations.

### 2. 🏥 Hospital Admin Portal (`hospital@prescripto.com`)
- **Dedicated Hospital Desk**: Manages staff, facilities, and emergency intake for a specific hospital (e.g. *Lilavati Hospital & Research Centre*).
- **Physician Roster**: Onboard doctors individually or bulk upload via Excel (`/api/hospital/upload/doctors`).
- **Ambulance Fleet & Paramedics**: Recruit and dispatch drivers, manage vehicle numbers (`MH-01-EQ-1108`), or bulk upload via Excel (`/api/hospital/upload/drivers`).
- **ICU Bed Allocation & Inbound Radar**: Real-time bed counter and incoming trauma patient alerts.
- **Hospital Appointment Queue**: Complete oversight of all appointments scheduled at this hospital.

### 3. 👨‍⚕️ Doctor Consultation Portal (`doc1@prescripto.com`)
- **Practice & Earnings Dashboard**: Real-time revenue counter ($), scheduled patient queues, and unique patient history.
- **Dynamic 7-Day Slot Management**: Automatic slot reservation and double-booking collision prevention.
- **Prescription Generator**: Issue clinical diagnoses, dosage instructions, and medications directly to the patient's portal in real-time.
- **Consultation Lifecycle**: Mark consultations as Completed (✓) or Cancelled (✕) with instant slot release.

### 4. 🚑 Paramedic Driver Portal (`driver1@prescripto.com`)
- **Emergency Dispatch Radar**: Real-time Socket.IO dispatch alerts with patient condition, pickup GPS coordinates, and hospital destination.
- **Accept / Reject Flow**: Accept emergency requests or decline with an explanatory reason.
- **5-Stage Ride Lifecycle**:
  `PENDING` $\rightarrow$ `ACCEPTED` $\rightarrow$ `EN_ROUTE_PICKUP` $\rightarrow$ `PATIENT_ONBOARD` $\rightarrow$ `COMPLETED`
- **Duty Toggle**: Instant Online / Offline status switcher.

### 5. 👤 Patient Care Portal (`patient@prescripto.com`)
- **Doctor Appointment Booking**: Search by specialty (General physician, Gynecologist, Dermatologist, Pediatrician, Neurologist, Gastroenterologist) and filter by hospital.
- **3-Way Appointment Relation**: Stores `patientId` + `doctorId` + `hospitalId`.
- **🚨 1-Click Code-Red Emergency SOS**: Instantly detects and dispatches the nearest available ambulance unit with live ETA calculation and room-based tracking.
- **Patient Health Console**: Live vitals monitoring (Heart Rate, Blood Pressure, Fasting Glucose, Blood Group) and appointments history.

---

## 📊 Bulk Excel Data Import (.xlsx)

The backend features an in-memory streaming engine powered by **Multer** and **SheetJS (`xlsx`)** for bulk data ingestion with duplicate validation and itemized error reports:

| Entity | API Route | Required Excel Columns |
| :--- | :--- | :--- |
| **Doctors** | `POST /api/hospital/upload/doctors` | `name`, `email`, `specialization`, `phone` |
| **Drivers** | `POST /api/hospital/upload/drivers` | `name`, `email`, `phone`, `vehicleNumber` |
| **Hospitals** | `POST /api/superadmin/upload/hospitals` | `name`, `address`, `email`, `phone` |

> [!TIP]
> Ready-to-use sample templates are generated in [`backend/samples/`](file:///c:/Users/Ashut/Desktop/Shreyash/backend/samples/):
> - `sample_doctors.xlsx`
> - `sample_drivers.xlsx`
> - `sample_hospitals.xlsx`

---

## 👥 Demo Login Credentials

| Role | Email | Password | Access Highlights |
| :--- | :--- | :--- | :--- |
| 👑 **Super Admin** | `admin@prescripto.com` | `admin123` | Master platform control, Hospital CRUD, System metrics, Bulk hospital upload |
| 🏥 **Hospital Admin** | `hospital@prescripto.com` | `hospital123` | Lilavati Hospital desk, Staff management, Bulk doctor/driver upload, ICU beds |
| 👨‍⚕️ **Doctor** | `doc1@prescripto.com` | `doc123` | Dr. Richard James - Consultation queue, Prescription creator, Availability toggle |
| 🚑 **Ambulance Driver** | `driver1@prescripto.com` | `driver123` | Paramedic Rajesh Kumar - Emergency SOS intake, Accept/Reject, Ride status |
| 👤 **Patient** | `patient@prescripto.com` | `password123` | Edward Vincent - Appointment booking, Emergency SOS, Health vitals |

---

## 🛠️ Technology Stack

- **Frontend**:
  - React 18 & Vite (TypeScript)
  - Tailwind CSS with customized medical themes
  - Google Fonts (`Outfit`)
  - Axios with JWT Interceptors & Token Service
  - React Router DOM v6
  - Socket.IO Client
- **Backend**:
  - Node.js & Express (TypeScript)
  - MongoDB Atlas & Mongoose ORM
  - High-availability dual store (automatic seamless fallback to in-memory store if offline)
  - Socket.IO Server (Room-based real-time telemetry and alerts)
  - Multer & SheetJS (`xlsx`) for binary Excel parsing
  - JSON Web Tokens (JWT) & bcryptjs
  - CORS, Dotenv

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- npm or yarn

### 2. Install Dependencies
```powershell
# From root workspace directory:
npm run install:all
```

### 3. Start Development Servers
Run both backend and frontend concurrently:
```powershell
npm run dev
```

Or start individually in separate terminals:
- **Backend** (Port 5000):
  ```powershell
  cd backend
  npm run dev
  ```
- **Frontend** (Port 5173):
  ```powershell
  cd frontend
  npm run dev
  ```

### 4. Access Application
- **Main Web Application**: [`http://localhost:5173`](http://localhost:5173)
- **API Health Check**: [`http://localhost:5000/api/health`](http://localhost:5000/api/health)

---

## 🧹 Database & Test Data Purge

To reset all appointments, bookings, ratings, and doctor calendar slots for fresh real-time testing:

- **Via API**:
  ```http
  POST http://localhost:5000/api/admin/clear-all-data
  ```
- **Via CLI Script**:
  ```powershell
  cd backend
  npx ts-node src/scripts/clearDb.ts
  ```

---

## 📄 License
MIT License. Built for Smart Healthcare & Emergency Dispatch Operations.
