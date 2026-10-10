# Requirement Analysis Document
## Sports Facility Booking System

---

### 1. Problem Summary
Modern sports facilities face significant challenges in managing court and field bookings due to fragmented manual records, double bookings, lack of real-time availability visibility, and inaccurate operational status tracking. 

The **Sports Facility Booking System** is an enterprise-grade reservation engine engineered with Node.js, Express, MySQL, and vanilla modern web technologies. It provides atomic, transactional facility reservations, strict inventory control, transparent fare calculation with automatic fee threshold logic, role-based access control, one-time stock-restoring cancellations, and complete operational lifecycle tracking with immutable audit histories.

---

### 2. Actors Specification
In accordance with the assessment specification, exactly **two actors** are modeled and implemented:

1. **User (Customer / Member)**:
   - Searches and browses active sports facilities, schedules, and live availability.
   - Selects desired facilities and specifies integer slot quantities (1 to 5).
   - Enters customer identity details (name, 10-digit phone number, booking date, identity proof).
   - Submits reservations and receives atomic booking confirmations with unique references.
   - Views **only their own** reservation history (ownership-scoped).
   - Cancels their own bookings **only while in CONFIRMED status**, atomically restoring facility availability.

2. **Administrator (Facility Manager / Operator)**:
   - Views the master schedule and all customer reservations across all users.
   - Advances operational booking status strictly through valid stages (`CONFIRMED` → `CHECKED_IN` → `COMPLETED`).
   - Prevented from skipping operational stages (e.g., cannot jump from `CONFIRMED` to `COMPLETED`).
   - Inspects the complete, timestamped status history and audit trail for any reservation.
   - Manages facility inventory and re-seeds synthetic demonstration datasets.

---

### 3. Functional Requirements (FR1 – FR10)

| Requirement ID | Requirement Name | Detailed Functional Specification |
| :--- | :--- | :--- |
| **FR1** | **Facility Search & Catalog** | The system shall search and display active sports facilities with unique identifier (`resource_code`, e.g., R101), category/name, operating schedule/slots, hourly rate, and real-time available quantity. |
| **FR2** | **Quantity Selection & Validation** | The system shall accept only integer booking quantities between 1 and 5 inclusive. Any input of 0, negative integers, decimals (e.g., 1.5), or integers greater than 5 shall be rejected with descriptive validation errors. |
| **FR3** | **Fare & Booking Charge Calculation** | The system shall compute base amount = `hourly_rate × quantity`. If base amount is below Rs.1,000, a booking charge of Rs.50 shall be added; if base amount is Rs.1,000 or above, the booking charge shall be Rs.0. The system must display base rate, quantity, base amount, booking charge, and total amount payable. |
| **FR4** | **Customer Details Validation** | The system shall validate customer details prior to reservation creation: customer name must be non-blank; mobile phone number must contain exactly 10 numeric digits; booking date must be today or a future date; identity/reference proof must be non-blank. |
| **FR5** | **Atomic Reservation Creation & Snapshotting** | The system shall create exactly one unique reservation with a generated reference (`BK-YYYYMMDD-XXXX`), capture immutable snapshots of unit rate, customer details, date, quantity, base amount, booking charge, and total amount, decrement resource availability, and record initial status history (`CONFIRMED`) atomically within a single ACID transaction. |
| **FR6** | **Ownership-Scoped Booking Retrieval** | The system shall enforce data ownership: regular Users can query and view only their own bookings. Any attempt by a User to view another user's booking shall be rejected with HTTP 403 Forbidden. Administrators can view all system bookings. |
| **FR7** | **Operational Status Progression** | The system shall allow authorized Administrators to advance booking status strictly along the operational lifecycle: `CONFIRMED` → `CHECKED_IN` (or `BOARDED`) → `COMPLETED`. Skipping stages (e.g., `CONFIRMED` directly to `COMPLETED`) is strictly rejected. Every transition logs an audit history entry. |
| **FR8** | **Booking Cancellation & One-Time Stock Restoration** | The system shall allow Users to cancel only their own bookings, and only if the booking is currently in `CONFIRMED` status. Upon cancellation, the booking transitions to `CANCELLED`, facility available quantity is restored by the booked quantity, and an audit entry is created. Repeated cancellations on an already cancelled booking are rejected, preventing duplicate stock replenishment. |
| **FR9** | **Role-Based Access Control & Error Handling** | The system shall enforce role boundaries: Users cannot advance operational stages; non-administrators cannot access administrative views; all invalid inputs, concurrency conflicts, and unauthorized operations return clear, structured JSON error responses with appropriate HTTP status codes (400, 401, 403, 404). |
| **FR10** | **Relational MySQL Persistence** | The system shall persist users, resources, schedules, reservations, reservation line items, and booking status histories in a normalized MySQL relational schema with foreign key constraints, indexes, and transactional integrity. |

---

### 4. Business Rules (BR1 – BR10)

- **BR1 (Quantity Constraint)**: Slot quantity must be an integer between 1 and 5 inclusive. Quantities of 0, negative values, decimals, and values > 5 are strictly rejected.
- **BR2 (Availability Recheck at Confirmation)**: Booking is allowed only for active facilities where `available_quantity >= requested_quantity`. Availability must be re-verified at the exact instant of confirmation under a pessimistic database lock (`SELECT ... FOR UPDATE`).
- **BR3 (Immutable Fare Snapshotting)**: The fare must be computed using the active facility rate at confirmation and permanently stored as an immutable snapshot in the reservation record. Subsequent modifications to facility rates will never alter historical booking records.
- **BR4 (Fare Calculation & Fee Threshold)**: Base amount = rate × quantity. Booking charge is Rs.50 when base amount < Rs.1,000, and Rs.0 when base amount >= Rs.1,000. Total amount = base amount + booking charge. All components must be clearly itemized and displayed.
- **BR5 (Mandatory Customer Details)**: Reject blank customer names, phone numbers not containing exactly 10 numeric digits, past or malformed booking dates, and empty identity/reference proofs.
- **BR6 (Failure Atomicity)**: Any validation failure, resource unavailability, or operational error must abort the transaction completely without creating partial records, dangling items, or altering resource availability.
- **BR7 (Atomic Confirmation & Stock Decrement)**: Exactly one unique CONFIRMED booking is created, resource availability is decremented by the requested quantity, and status history is logged atomically within a single MySQL transaction.
- **BR8 (Operational Stage Gating & Cancellation Scope)**: Only `CONFIRMED` → `CHECKED_IN` (or `BOARDED`) → `COMPLETED` transitions are permitted. Administrators cannot skip intermediate stages. Users may only cancel bookings that are in `CONFIRMED` status.
- **BR9 (Idempotent Stock Restoration on Cancellation)**: Cancelling an eligible booking transitions it to `CANCELLED` and restores facility availability by the booked quantity exactly once. Repeated cancellation attempts are rejected and cannot restore stock multiple times.
- **BR10 (Role & Ownership Access Enforcement)**: Users may view and cancel only their own bookings. Only administrators may advance operational status. Clear, descriptive error messages must be returned for invalid input, unauthorized access, and invalid transitions.

---

### 5. Non-Functional Requirements (NFRs)

1. **Reliability**: 
   - ACID compliance using MySQL transactions (`START TRANSACTION`, `COMMIT`, `ROLLBACK`) ensures zero dirty reads, lost updates, or phantom allocations.
   - Pessimistic row locking (`SELECT ... FOR UPDATE`) prevents race conditions and over-booking during concurrent requests.
2. **Persistence**: 
   - All critical domain entities (users, resources, schedules, reservations, reservation items, audit logs) are permanently persisted to disk in MySQL/MariaDB with foreign keys and check constraints.
   - System restarts retain complete historical integrity without state loss.
3. **Maintainability**: 
   - Strict layered architecture separating UI Presentation (`public/`), Business Services (`src/services/`), API Controllers (`src/controllers/`), Middleware (`src/middlewares/`), and Database Access (`src/config/`).
   - Clean, modular ES6/CommonJS code adhering to single-responsibility principles.
4. **Usability**: 
   - Responsive, accessible interface featuring modern glassmorphism, athletic color accents, instant input feedback, clear fare calculation summaries, and intuitive role switching.
5. **Security Design**: 
   - Parameterized SQL queries throughout to eliminate SQL injection vulnerabilities.
   - Server-side role-based access control (RBAC) and ownership verification protecting sensitive resources and operational state endpoints.
   - Input sanitization and strict regular expression checks on phone numbers and booking dates.

---

### 6. Scope & Assumptions

#### Scope:
- In-scope: 
  * Two user accounts (`user1`, `user2`) and one administrator account (`admin`).
  * Synthetic demonstration facilities R101 through R105.
  * Complete lifecycle from search to confirmation, cancellation, and administrative status progression.
  * Relational schema DDL, automated seed script, automated test runner covering all 12 mandatory tests, and live web application.
- Out-of-scope:
  * External payment gateways, SMS/Email OTP gateways, biometric logins, external map APIs, AI recommendation engines.

#### Assumptions:
- System runs in a trusted assessment/testing environment with local MySQL/MariaDB database access.
- Role switching is simulated via authenticated context headers (`X-User-Id`) or UI selector to allow smooth examination and grading of multi-role behavior.

---

### 7. Requirements Traceability Matrix (RTM)

| Req ID | Requirement Description | Linked BR | UML Design Element | Implemented Source Component | Test ID |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR1** | Search & browse active sports facilities | BR2 | `AvailabilityService.searchFacilities()`, `Resource` | `src/services/AvailabilityService.js`, `GET /api/facilities` | T1, T3 |
| **FR2** | Integer quantity selection (1 to 5 only) | BR1 | `BookingService.validateQuantity()`, `ReservationItem` | `src/services/BookingService.js:validateQuantity()` | T2 |
| **FR3** | Fare & booking charge calculation | BR4 | `BookingService.calculateFare()`, `Reservation` | `src/services/BookingService.js:calculateFare()`, `POST /api/facilities/quote` | T4 |
| **FR4** | Customer details validation | BR5 | `BookingService.validateCustomerDetails()` | `src/services/BookingService.js:validateCustomerDetails()` | T6 |
| **FR5** | Atomic reservation creation & fare snapshot | BR2, BR3, BR7 | `BookingService.createReservation()`, `Reservation` | `src/services/BookingService.js:createReservation()`, `POST /api/bookings` | T1, T5, T12 |
| **FR6** | User booking view & ownership enforcement | BR10 | `BookingService.getBookings()`, `BookingService.getBookingById()` | `src/controllers/bookingController.js:listBookings()`, `authMiddleware.js` | T8 |
| **FR7** | Operational status progression (no skipping) | BR8 | `BookingService.updateOperationalStatus()`, `BookingStatusHistory` | `src/services/BookingService.js:updateOperationalStatus()`, `PATCH /api/bookings/:ref/status` | T9 |
| **FR8** | User booking cancellation & stock restore | BR8, BR9 | `BookingService.cancelBooking()`, `Reservation`, `Resource` | `src/services/BookingService.js:cancelBooking()`, `POST /api/bookings/:ref/cancel` | T10 |
| **FR9** | Role-based access control & error handling | BR10 | `authMiddleware.js:requireRole()`, `errorHandler.js` | `src/middlewares/authMiddleware.js`, `src/middlewares/errorHandler.js` | T8, T9 |
| **FR10** | Relational MySQL schema & persistence | - | `schema.sql`, All Entities | `database/schema.sql`, `database/seed.sql`, `src/config/database.js` | T11 |
