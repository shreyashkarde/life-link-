# 👨‍⚕️ Prescripto - Full Stack Doctor Appointment Booking System (MERN Stack)

A production-grade, full-stack **MERN** (MongoDB, Express.js, React + Vite, Node.js) doctor appointment scheduling and healthcare management platform based on the **GreatStack** architecture.

Featuring **3-Level Authentication (Patient, Doctor, and Admin)**, dynamic **7-day slot booking calendar**, comprehensive **specialty discovery**, integrated **online payment processing simulation**, doctor **earnings analytics**, and a real-time **doctor availability manager**.

---

## 🌟 Key Features

### 1. 🏥 Patient Portal
- **Speciality Discovery**: Browse doctors across 6 core specialties:
  1. *General physician*
  2. *Gynecologist*
  3. *Dermatologist*
  4. *Pediatricians*
  5. *Neurologist*
  6. *Gastroenterologist*
- **Dynamic 7-Day Slot Booking**: Real-time date selector and time slot chips with automatic double-booking prevention.
- **Related Doctors**: Instant discovery of other specialists in the same field.
- **My Profile Manager**: Edit contact info, phone, address (Line 1 & Line 2), gender, and birthday.
- **My Appointments**:
  - View upcoming and past appointments with doctor photo, specialty, and formatted date/time.
  - **Pay Online**: Simulated payment gateway (Razorpay / Stripe / Pay at Clinic).
  - **Cancel Appointment**: Instant cancellation with automatic slot release.

### 2. 👨‍⚕️ Doctor Dashboard & Portal
- **Secure Doctor Login**: Dedicated portal for registered physicians.
- **Earnings & Practice Analytics**: Real-time earnings counter ($), total appointments, and unique patient counts.
- **Appointment Queue**:
  - Full list of scheduled consultations with patient details and payment status.
  - One-click **Complete Appointment** (✓) to credit doctor earnings.
  - One-click **Cancel Appointment** (✕) with slot restoration.
- **Doctor Profile Management**:
  - Edit consultation fee ($) and clinic address.
  - Interactive **Availability Toggle** to turn patient booking on/off.

### 3. 🎯 Admin Management Panel
- **Secure Admin Authentication**: Centralized system administration portal.
- **Global Platform Dashboard**: Metrics on total doctors, total appointments, total patients, and latest bookings.
- **All Appointments Directory**: Complete master table across all physicians with administrative cancellation control.
- **Add Doctor Form**: Onboard new verified doctors with specialty, experience, degree, fees, photo, and clinic address.
- **Doctors List**: Real-time card view with interactive **Available toggle checkbox** for instant availability updates.

---

## 👥 Demo Credentials

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@prescripto.com` | `admin123` | Dashboard metrics, All appointments oversight, Add doctors, Doctors availability toggle |
| **Doctor** | `doc1@prescripto.com` | `doc123` | Dr. Richard James (General physician) - Earnings dashboard, Appointments queue, Profile |
| **Patient** | `patient@prescripto.com` | `password123` | Edward Vincent - Book appointments, Profile editor, Online payment, Cancellation |

---

## 🛠️ Tech Stack & Architecture

- **Frontend**:
  - React 18 / Vite
  - Tailwind CSS (`primary: #5f6fff`)
  - Google Fonts (`Outfit`)
  - Axios with JWT Interceptors
  - React Router DOM v6
- **Backend**:
  - Node.js & Express (TypeScript)
  - MongoDB & Mongoose ORM
  - JSON Web Tokens (JWT) & bcryptjs
  - High-performance dual store with zero-downtime offline support
  - CORS, Dotenv

---

## 🚀 How to Run Locally

### 1. Install Dependencies
From the root workspace folder:
```powershell
npm run install:all
```

### 2. Start Both Backend & Frontend
Run both the API server (Port 5000) and Frontend (Port 5173):
```powershell
npm run dev
```

Or run individually:
- **Backend**: `cd backend && npm run dev`
- **Frontend**: `cd frontend && npm run dev`

Open your browser at: **`http://localhost:5173`**  
Access Admin / Doctor Panel directly via the **"Admin Panel"** button in the header or at **`http://localhost:5173/admin`**.

---

## 📄 License
MIT License. Inspired by GreatStack Prescripto Full Stack MERN tutorial.
