# Software Engineering MCQ Preparation & Viva Defense Guidance
## Sports Facility Booking System

This comprehensive study guide is structured for both written MCQ assessments and technical viva voce interviews, covering transactional software engineering, design patterns, testing strategies, and system architecture.

---

## Part 1: Software Engineering Multiple Choice Questions (MCQs)

### Question 1: Concurrency and Race Conditions
**During simultaneous booking confirmation requests for the last remaining slot of a sports facility, which mechanism best prevents overselling (negative inventory)?**
- A) Client-side button disabling immediately upon click
- B) An in-memory JavaScript mutex lock inside the Node.js event loop
- C) Pessimistic row-level locking (`SELECT ... FOR UPDATE`) inside an isolated ACID database transaction
- D) An optimistic HTTP header check on the frontend
**Correct Answer: C**  
*Explanation*: Client-side or in-memory checks cannot prevent race conditions across concurrent HTTP requests or multi-process server instances. A database row-level lock (`SELECT ... FOR UPDATE`) serializes access at the storage layer, ensuring availability is rechecked and decremented atomically.

---

### Question 2: Boundary Value Analysis (BVA)
**According to rule BR1 (quantity must be an integer between 1 and 5 inclusive), which input set represents a comprehensive Boundary Value Analysis test suite?**
- A) { 2, 3, 4 }
- B) { 0, 1, 5, 6, 1.5 }
- C) { -5, 0, 10 }
- D) { "one", "two", "three" }
**Correct Answer: B**  
*Explanation*: Boundary Value Analysis focuses on boundary limits (1 and 5), values immediately outside boundaries (0 and 6), and data type boundary violations such as decimal fractions (1.5).

---

### Question 3: Fee Threshold Logic
**Rule BR4 specifies that a booking charge of Rs.50 applies when the base amount is below Rs.1,000, and Rs.0 when it is Rs.1,000 or above. For facility R101 (rate Rs.499) booked for quantity 2, what is the total payable amount?**
- A) Rs. 998.00
- B) Rs. 1,048.00
- C) Rs. 1,000.00
- D) Rs. 948.00
**Correct Answer: B**  
*Explanation*: Base amount = 499 × 2 = Rs.998. Since Rs.998 < Rs.1,000, the Rs.50 booking charge is triggered. Total payable amount = 998 + 50 = Rs.1,048.00.

---

### Question 4: Snapshot Pattern & Financial Immutability
**Why must the unit rate and calculated amounts be stored as snapshot fields on the `reservations` table rather than dynamically calculated by joining the `resources` table?**
- A) To avoid writing SQL JOIN queries
- B) To save database disk storage
- C) To preserve financial immutability so future price changes do not distort historical invoices
- D) Because MySQL cannot calculate multiplication in queries
**Correct Answer: C**  
*Explanation*: The Snapshot Pattern decouples historical financial records from dynamic master catalog updates. If facility rates increase in the future, past completed bookings must still reflect the exact rate agreed upon at the time of confirmation.

---

### Question 5: Database Failure Atomicity
**If an exception occurs during the insertion of reservation items after availability has been decremented, what must occur to satisfy rule BR6?**
- A) Availability remains decremented, and the error is logged to a text file
- B) The database transaction is rolled back completely, restoring availability and leaving zero orphaned records
- C) An alert is sent to the user asking them to retry
- D) The reservation is saved with status `PARTIAL`
**Correct Answer: B**  
*Explanation*: Failure atomicity (the 'A' in ACID) dictates that an operation either completes in its entirety or leaves no side-effects. A complete rollback ensures resource stock is not lost.

---

### Question 6: Finite State Machine (FSM) Lifecycle
**Under operational rule BR8, which transition sequence is strictly permitted for an Administrator?**
- A) `CONFIRMED` → `COMPLETED`
- B) `CONFIRMED` → `CHECKED_IN` → `COMPLETED`
- C) `CANCELLED` → `CHECKED_IN`
- D) `COMPLETED` → `CONFIRMED`
**Correct Answer: B**  
*Explanation*: BR8 enforces stage-by-stage progression: `CONFIRMED` must advance to `CHECKED_IN` (or `BOARDED`) before it can transition to `COMPLETED`. Stage-skipping is forbidden.

---

### Question 7: Idempotent Stock Restoration
**What is the expected behavior when a user attempts to cancel a reservation that is already in `CANCELLED` status?**
- A) The booking status remains `CANCELLED` and another unit of inventory is restored
- B) The request is rejected with HTTP 400 Bad Request, and inventory is not altered
- C) The booking is permanently deleted from the database
- D) The status changes to `CONFIRMED`
**Correct Answer: B**  
*Explanation*: Cancellation must be idempotent regarding inventory restoration. Restoring stock on repeat cancellation attempts would artificially inflate available capacity beyond physical limits.

---

### Question 8: Role-Based Access Control (RBAC)
**Which HTTP status code should be returned when User 2 attempts to cancel a booking owned by User 1?**
- A) 200 OK
- B) 400 Bad Request
- C) 403 Forbidden
- D) 500 Internal Server Error
**Correct Answer: C**  
*Explanation*: The requesting user is authenticated but lacks ownership authorization for the targeted resource, warranting HTTP 403 Forbidden.

---

### Question 9: UML Modeling
**In the system's UML Class Diagram, what is the relationship between `Reservation` and `ReservationItem`?**
- A) Generalization (Inheritance)
- B) Composition (Strong Aggregation)
- C) Dependency
- D) Simple Association with multiplicity 0..1
**Correct Answer: B**  
*Explanation*: A `ReservationItem` has no independent lifecycle outside of its parent `Reservation`. If a reservation record is destroyed, its line items are destroyed with it (composition).

---

### Question 10: Non-Functional Requirements (NFRs)
**Which architectural layer is responsible for guaranteeing persistence across server process restarts?**
- A) Frontend Single Page Application (HTML/JS)
- B) Express HTTP Router
- C) Relational Database Management System (MySQL InnoDB Engine)
- D) CSS Style Rules
**Correct Answer: C**  
*Explanation*: InnoDB utilizes a Write-Ahead Log (WAL) and disk tables to ensure durability (D in ACID), preserving all committed data across application server restarts.

---

## Part 2: Viva Voce Technical Defense & Interview Guide

### 1. Can you explain the end-to-end booking workflow of the application?
**Answer**:
The workflow follows a 6-step sequential lifecycle:
1. **Catalog Search (FR1)**: The client queries `/api/facilities`, retrieving active facilities (R101–R105) with operational schedules and real-time inventory.
2. **Selection & Quoting (FR2, FR3)**: The user chooses a facility and selects a quantity (1–5). The frontend and backend calculate base fare (`rate × qty`) and apply threshold charge logic (Rs.50 if base < 1,000; Rs.0 if base >= 1,000).
3. **Details Validation (FR4)**: The user provides name, 10-digit phone, booking date (>= today), and identity reference.
4. **Atomic Confirmation (FR5)**: On submission, the server initiates a MySQL ACID transaction, applies a row lock (`FOR UPDATE`) on the facility, rechecks availability, creates immutable fare snapshots, decrements inventory, inserts the reservation, item, and audit history, and commits.
5. **Scoped Viewing (FR6)**: Regular users view only their own reservations (`user_id` filtering); cross-user access returns HTTP 403.
6. **Operational Progression or Cancellation (FR7, FR8)**: An Administrator advances status sequentially (`CONFIRMED` → `CHECKED_IN` → `COMPLETED`) without skipping stages. Alternatively, the user can cancel their `CONFIRMED` booking, which restores inventory exactly once.

---

### 2. How did you implement Boundary Value Analysis for Quantities and Rates?
**Answer**:
- **Quantity Validation (BR1 / T2)**: The boundary limits are 1 and 5. 
  - Valid boundaries: `1` (minimum valid) and `5` (maximum valid).
  - Invalid boundaries: `0` (lower boundary - 1), `6` (upper boundary + 1), and `1.5` (data-type boundary violation - decimal). The service enforces `Number.isInteger(q) && q >= 1 && q <= 5`.
- **Fare Thresholds (BR4 / T4)**: The boundary limit is Rs.1,000.
  - Rs.999: Triggers the standard Rs.50 fee (`total = Rs.1,049`).
  - Rs.1,000: Crosses the threshold, triggering Rs.0 fee (`total = Rs.1,000`).
  - Rs.1,001: Exceeds the threshold, triggering Rs.0 fee (`total = Rs.1,001`).

---

### 3. Why is availability revalidation at confirmation necessary if the user already saw availability on the catalog page?
**Answer**:
Displaying availability on the search page is a read-only snapshot of past state. Between viewing the catalog and clicking 'Confirm', another user could book the remaining slots. Without revalidation under a pessimistic lock (`FOR UPDATE`) inside the database transaction, a classic **Time-of-Check to Time-of-Use (TOCTOU)** race condition occurs, resulting in negative availability and double-booking.

---

### 4. How does the system guarantee Failure Atomicity (BR6)?
**Answer**:
Through MySQL InnoDB transaction management. All write operations—decrementing resource availability, inserting the reservation header, inserting reservation line items, and recording the status history—are executed within a single transaction managed by `withTransaction(async (conn) => { ... })`. If any operation fails or if availability is insufficient, `conn.rollback()` is executed. This guarantees that either all four database changes succeed together, or the database reverts to its exact pre-request state.

---

### 5. How is Role-Based Access Control (RBAC) enforced on the server?
**Answer**:
RBAC is enforced via two layers:
1. **Middleware Layer (`authMiddleware.js`)**: Routes like `PATCH /api/bookings/:id/status` use `requireRole('ADMINISTRATOR')`. If a regular user account attempts to advance operational status, the middleware immediately rejects the request with HTTP 403 Forbidden.
2. **Service Layer Ownership Checks (`BookingService.js`)**: When fetching or cancelling a booking, the service inspects `booking.user_id === requestingUser.id`. If a regular user tries to access another user's booking reference, an error with `statusCode = 403` is thrown.

---

### 6. How did you ensure cancellation stock restoration happens only once (BR9)?
**Answer**:
In `BookingService.cancelBooking()`, the reservation row is locked with `FOR UPDATE`. The method checks `if (booking.status !== 'CONFIRMED')`. If the booking is already `CANCELLED` (or `CHECKED_IN` / `COMPLETED`), the method throws an error rejecting the request. The availability is incremented **only** during the transition from `CONFIRMED` to `CANCELLED`, ensuring stock restoration is strictly idempotent.

---

### 7. What was the AI suggestion that you reviewed and corrected?
**Answer**:
The AI's initial suggestion implemented facility inventory deduction using an in-memory check followed by an un-locked SQL query (`available_quantity = available_quantity - ?`), and allowed status updates to accept any target status string. 
During code review, I identified two flaws:
1. A severe concurrency defect: Under simultaneous load, two requests could interleave, leading to negative inventory and oversold facilities.
2. A state machine violation: Administrators could jump directly from `CONFIRMED` to `COMPLETED`, skipping `CHECKED_IN`.

I corrected this by implementing **pessimistic row locking** (`SELECT ... FOR UPDATE`), atomic transactions with automatic rollback, a database check constraint (`available_quantity >= 0`), and a strict **Finite State Machine** enforcing stage-gated status progression (`CONFIRMED` → `CHECKED_IN` → `COMPLETED`).

---

### 8. Explain the Traceability between Requirements, UML, Code, and Tests.
**Answer**:
Every functional requirement directly maps across four engineering artifacts:
- **Requirement (e.g. FR5/BR7 Atomic Booking)**: Defined in `REQUIREMENT_ANALYSIS.md`.
- **UML Element**: Modeled as `UC4 (Confirm Reservation)` in the Use Case Diagram and `BookingService.createReservation()` in the Class Diagram (`UML_DIAGRAMS.md`).
- **Implementation**: Written in `src/services/BookingService.js:createReservation()` and exposed at `POST /api/bookings`.
- **Verification**: Verified and logged by test **T5** in `tests/testRunner.js` with live assertion logs in `test-results.json`.
