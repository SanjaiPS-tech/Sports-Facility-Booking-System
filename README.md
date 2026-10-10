# Sports Facility Booking System
### Enterprise Reservation Engine & Assessment Reference Implementation

[![Node.js](https://img.shields.io/badge/Node.js-v26+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-MariaDB%2012+-4479A1?logo=mysql&logoColor=white)](https://mariadb.org/)
[![Tests](https://img.shields.io/badge/Tests-12%2F12%20Passing-brightgreen?logo=jest&logoColor=white)](file:///tests/testRunner.js)
[![Aesthetics](https://img.shields.io/badge/UI-Modern%20Glassmorphism-00f2fe)](file:///public/css/style.css)

---

## 1. Project Overview

The **Sports Facility Booking System** is a complete, runnable full-stack reservation engine engineered with **HTML5, Vanilla CSS3, Vanilla JavaScript, Node.js, Express, and MySQL (MariaDB)**. Built strictly to satisfy the assessment specification without omitting, modifying, or inventing business rules, the application supports:
- **Requirement Analysis**: Comprehensive problem statement, two actors, FR1–FR10, BR1–BR10, NFRs, and Requirements Traceability Matrix.
- **UML Design**: Exactly two diagrams (Use Case Diagram & Class Diagram) with full attributes, operations, and multiplicities.
- **Transactional Development**: ACID MySQL transactions, row-level locking (`SELECT ... FOR UPDATE`), immutable snapshotting, and failure atomicity.
- **Verification & Testing**: Automated test runner executing all **12 mandatory tests (T1 to T12)** with verifiable log evidence.
- **Viva Voce & MCQ Preparation**: In-depth Q&A defense guide and 10 multiple-choice assessment questions with engineering rationales.

---

## 2. Technology Stack & Architecture

- **Backend**: Node.js v26.8.2, Express v5.x, `mysql2/promise` connection pooling with transaction management.
- **Database**: MariaDB / MySQL with normalized InnoDB schema, foreign key constraints, and check constraints (`available_quantity >= 0`).
- **Frontend**: Semantic HTML5, Vanilla CSS3 (custom design system, glassmorphism, Google Fonts Outfit & Plus Jakarta Sans, vibrant athletic dark mode, micro-animations), Vanilla JavaScript.
- **Security & RBAC**: Strict role boundaries separating **User** and **Administrator**, ownership verification, and parameter-sanitized SQL queries.

```
Sports-Facility-Booking-System/
├── package.json                   # Dependencies and scripts (start, dev, seed, test)
├── .env.example                   # Environment configuration template
├── .env                           # Local environment configuration
├── .gitignore                     # Git exclusions
├── server.js                      # Express HTTP server & database pool bootstrap
├── database/
│   ├── schema.sql                 # MySQL DDL with constraints, FKs, and indexes
│   ├── seed.sql                   # Exact synthetic demonstration dataset
│   └── reset.js                   # Automated database init and reseed script
├── src/
│   ├── config/
│   │   └── database.js            # Connection pool & withTransaction helper
│   ├── services/
│   │   ├── AvailabilityService.js # Catalog query, schedule join, stock checks (FR1)
│   │   └── BookingService.js      # Business rules BR1-BR10, atomic booking, cancellation
│   ├── controllers/
│   │   ├── facilityController.js  # Search, details, and live quotation endpoints
│   │   ├── bookingController.js   # Reservation lifecycle & management endpoints
│   │   └── authController.js      # Actor simulation and session retrieval
│   ├── middlewares/
│   │   ├── authMiddleware.js      # Actor simulation and role-based guards
│   │   └── errorHandler.js        # Uniform JSON error formatting
│   └── routes/
│       └── api.js                 # API route mapping
├── public/
│   ├── index.html                 # Single Page Application HTML5 structure
│   ├── css/
│   │   └── style.css              # Modern CSS design system & dark glassmorphism
│   └── js/
│       └── app.js                 # Interactive client logic & live test harness
├── tests/
│   ├── testRunner.js              # Automated test runner for T1-T12
│   ├── test-results.json          # Structured test execution results artifact
│   └── test-execution.log         # Complete verbatim execution log evidence
└── docs/
    ├── REQUIREMENT_ANALYSIS.md    # FR1-FR10, BR1-BR10, NFRs, Scope, RTM
    ├── UML_DIAGRAMS.md            # Use Case & Class Diagrams (Mermaid)
    ├── AI_TEST_REPORT.md          # Real environment, commit reference, logs, fixes
    └── VIVA_MCQ_PREPARATION.md    # MCQ questions & Viva interview defense guide
```

---

## 3. Synthetic Demonstration Data & Sample Accounts

### Exact Synthetic Facilities Dataset:
| Resource Code | Facility Name | Category | Hourly Rate | Available Quantity | Total Capacity | Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **R101** | Sports Facility A | Indoor Badminton Court | **Rs. 499.00** | **10** | 10 | Active |
| **R102** | Sports Facility B | Championship Tennis Court | **Rs. 799.00** | **5** | 5 | Active |
| **R103** | Sports Facility C | Squash & Table Tennis Arena | **Rs. 199.00** | **20** | 20 | Active |
| **R104** | Sports Facility D | Olympic Swimming Complex | **Rs. 1,299.00** | **0** | 8 | Active (Sold Out) |
| **R105** | Sports Facility E | Indoor Box Cricket Turf | **Rs. 1,000.00** | **3** | 3 | Active |

### Sample Accounts:
- **User 1**: `username: user1`, Full Name: **John Doe**, Phone: `9876543210`, Role: `USER`
- **User 2**: `username: user2`, Full Name: **Jane Smith**, Phone: `9123456780`, Role: `USER`
- **Administrator**: `username: admin`, Full Name: **Facility Administrator**, Phone: `9998887770`, Role: `ADMINISTRATOR`

---

## 4. Installation & Database Setup

### Prerequisites
- Node.js (v18 or higher recommended; developed and verified on Node v26)
- MySQL 8.0+ or MariaDB 10.5+ running locally

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/SanjaiPS-tech/Sports-Facility-Booking-System.git
cd Sports-Facility-Booking-System
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your database credentials match your local MySQL server in `.env`:
```ini
PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=test_sports_facility_db
```

### Step 3: Initialize Database & Seed Synthetic Data
Execute the automated database reset and seed script:
```bash
npm run seed
```
This creates all tables with constraints, foreign keys, and indexes, and seeds the 5 synthetic resources, operating schedules, and 3 sample accounts.

---

## 5. Running the Application

### Start the Server:
```bash
npm start
```
The server will start at:  
👉 **http://localhost:3000**

Open this URL in any modern web browser (Google Chrome, Firefox, Safari, Edge).

---

## 6. Demonstration Walkthrough Steps

Follow these steps to demonstrate the complete specified assessment workflow:

1. **Search Availability (FR1)**:
   - Browse the catalog on the home page. Observe facilities R101–R105 with active rates and real-time slots.
   - Facility **R104** shows `Sold Out (0 Slots)` with the booking button disabled.
   - Use the category filter chips or the search bar (type "Tennis" or "R102") to test live filtering.
2. **Select Sports Facility & Calculate Fare (FR2, FR3 / BR1, BR4)**:
   - Click **Book Facility ⚡** on `R101` (Rate: Rs.499).
   - Use the quantity stepper to change quantity:
     - Set quantity to `1`: Base amount = Rs.499.00, Booking Charge = **Rs.50.00** (Base < Rs.1,000), Total = **Rs.549.00**.
     - Set quantity to `3`: Base amount = Rs.1,497.00, Booking Charge = **Rs.0.00** (Base ≥ Rs.1,000), Total = **Rs.1,497.00**.
     - Observe live badge highlighting the threshold rule.
3. **Enter Details & Validate (FR4 / BR5)**:
   - Customer name, 10-digit phone, booking date, and identity reference are pre-filled or editable.
   - Try entering an invalid phone (e.g. `98765`) or blank name to see instantaneous validation rejection.
4. **Confirm Reservation (FR5 / BR7)**:
   - Click **Confirm Reservation (BR7 Atomic)**.
   - The system executes an ACID transaction with row-level locking, decrements availability by 3, inserts reservation, line item, and status history records, and displays a confirmation receipt dialog with unique booking reference (`BK-YYYYMMDD-XXXX`).
5. **View Booking (FR6 / BR10)**:
   - Switch to the **My Bookings** tab.
   - The booking appears with status `CONFIRMED`, customer details, and immutable fare breakdown.
   - Switch active actor from the top header to `User 2 (Jane Smith)`.
   - Observe that User 1's booking disappears completely, verifying ownership scoping (BR10).
6. **Administrator Status Progression (FR7 / BR8)**:
   - Switch active actor to `Administrator`.
   - The **Administrator Operations** tab unlocks.
   - View all system reservations.
   - On the confirmed booking, click **➔ Check-In (Stage 2)**. Status transitions to `CHECKED_IN`.
   - Click the test button **⚠️ Test Skip to COMPLETED** to verify that skipping from `CONFIRMED` to `COMPLETED` is rejected with HTTP 400.
   - Click **➔ Complete (Stage 3)** to advance to `COMPLETED`.
   - Click **History 📜** to inspect the complete, timestamped audit timeline.
7. **User Cancellation & One-Time Stock Restoration (FR8 / BR8, BR9)**:
   - Create a fresh confirmed booking as User 1. Note the remaining slot count.
   - Click **Cancel (BR9) ✕**.
   - Status changes to `CANCELLED`, and facility availability is restored by the booked quantity.
   - Repeated cancellation attempts are rejected and cannot restore stock multiple times.

---

## 7. Mandatory Assessment Test Suite Execution (T1–T12)

The application includes an automated test suite executing all **12 mandatory tests** against the live server and database:

```bash
npm test
```

### Test Suite Execution Matrix:
| Test ID | Test Name | Linked Requirements | Assertion Focus | Status |
| :---: | :--- | :---: | :--- | :---: |
| **T1** | Duplicate Resource Selection | FR5, BR7 | Rejection without duplicate records | **PASS** |
| **T2** | Quantity Boundaries (0, 1, 5, 6, 1.5) | BR1, FR2 | Integer 1–5 accepted; 0, 6, 1.5 rejected | **PASS** |
| **T3** | Unavailable Resource Rejection | BR2, BR6 | Rejection of R104 (qty 0) without state change | **PASS** |
| **T4** | Base-Amount Boundaries (Rs.999, 1000, 1001) | BR4, FR3 | Rs.999 => Rs.50; Rs.1000/1001 => Rs.0 fee | **PASS** |
| **T5** | Successful Atomic Reservation | FR5, BR7 | ACID transaction, stock decrement, snapshots | **PASS** |
| **T6** | Invalid / Missing Details Rejection | BR5, FR4 | Blank name, 9-digit phone, past date rejected | **PASS** |
| **T7** | Availability Changing / Concurrency | BR2, BR6 | Row locking prevents negative stock | **PASS** |
| **T8** | Unauthorized Access & Updates | BR10, FR6, FR9 | Foreign booking view/update rejected (403) | **PASS** |
| **T9** | Admin Status Progression & Skip | BR8, FR7 | Sequential CONFIRMED->CHECKED_IN->COMPLETED | **PASS** |
| **T10** | One-Time Cancellation Restoration | BR8, BR9, FR8 | Stock restored once; repeat cancel rejected | **PASS** |
| **T11** | Application Process Persistence | FR10 | Booking and stock persist across server restart | **PASS** |
| **T12** | Historical Fare Immutability | BR3, FR5 | Price shifts in catalog do not affect snapshots | **PASS** |

*All 12 tests produce verifiable results stored in `tests/test-results.json` and `tests/test-execution.log`.*

---

## 8. Documentation Index

- [Requirement Analysis Document](file:///docs/REQUIREMENT_ANALYSIS.md) - Problem summary, Actors, FR1–FR10, BR1–BR10, NFRs, Scope, Assumptions, Requirements Traceability Matrix.
- [UML Design Document](file:///docs/UML_DIAGRAMS.md) - Exactly 2 UML diagrams: Use Case Diagram and Class Diagram.
- [AI Test Report](file:///docs/AI_TEST_REPORT.md) - Genuine environment metadata, commit reference, AI prompts, reviewed suggestion, defects, and test logs.
- [Viva & MCQ Preparation Guide](file:///docs/VIVA_MCQ_PREPARATION.md) - 10 Multiple-Choice Questions and 8 technical interview defense answers.

---

## 9. Current Limitations & Future Improvements

### Limitations:
- Session switching is simulated via header context (`X-User-Id`) rather than cryptographic JWTs/OAuth2.
- Concurrency control is optimized for single-instance relational databases using MySQL row-level locking.

### Future Improvements:
- JWT authentication with HTTP-only cookies and bcrypt password hashing.
- Webhook-driven payment gateway integration (Razorpay / Stripe) with idempotency keys.
- Distributed Redis lock orchestration for horizontally-scaled multi-datacenter clusters.

---

## 10. GitHub Submission Checklist

- [x] Runnable backend server in Node.js / Express (`server.js`)
- [x] Working MySQL / MariaDB relational integration (`database/schema.sql`, `database/seed.sql`)
- [x] Environment configuration template (`.env.example`)
- [x] High-aesthetic, responsive HTML5/CSS3/JS UI (`public/`)
- [x] Exact synthetic data implemented (`R101` to `R105`)
- [x] Complete demonstration flow verified
- [x] Requirement analysis with Requirements Traceability Matrix (`docs/REQUIREMENT_ANALYSIS.md`)
- [x] Exactly two UML diagrams: Use Case and Class Diagram (`docs/UML_DIAGRAMS.md`)
- [x] Automated test runner executing all 12 tests with verifiable logs (`tests/testRunner.js`)
- [x] AI Test Report with genuine commit and execution evidence (`docs/AI_TEST_REPORT.md`)
- [x] Software Engineering MCQ and Viva defense guide (`docs/VIVA_MCQ_PREPARATION.md`)
