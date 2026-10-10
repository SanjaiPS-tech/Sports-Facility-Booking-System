# UML Design Document
## Sports Facility Booking System

In strict accordance with the assessment specification, this document contains **exactly two UML diagrams**:
1. **Use Case Diagram** (Actor roles and all compulsory system actions)
2. **Class Diagram** (Core domain entities, services, attributes, operations, and multiplicities)

---

### 1. UML Use Case Diagram

The Use Case Diagram defines the interactions between the two system actors (**User** and **Administrator**) and the system boundary. It highlights the compulsory flows including facility search, boundary validation, atomic confirmation, ownership-scoped viewing, one-time stock-restoring cancellation, and stage-gated operational status progression.

```mermaid
flowchart LR
    %% Actors
    subgraph Actors ["Actors"]
        direction TB
        User["fa:fa-user User\n(Customer / Member)"]
        Admin["fa:fa-user-shield Administrator\n(Facility Manager)"]
    end

    %% System Boundary
    subgraph SystemBoundary ["Sports Facility Booking System Boundary"]
        direction TB

        %% User Use Cases
        UC1(["UC1: Search Active Facilities & Schedule (FR1)"])
        UC2(["UC2: Validate Quantity & Compute Fare (FR2, FR3)"])
        UC3(["UC3: Validate Customer & Identity Details (FR4)"])
        UC4(["UC4: Confirm Reservation Atomically (FR5, BR7)"])
        UC5(["UC5: View Own Booking Records (FR6, BR10)"])
        UC6(["UC6: Cancel Confirmed Booking & Restore Stock (FR8, BR9)"])

        %% Administrator Use Cases
        UC7(["UC7: View Master Booking Catalog (FR6)"])
        UC8(["UC8: Advance Operational Status Sequentially (FR7, BR8)"])
        UC9(["UC9: Inspect Complete Audit History Trail (FR7, FR10)"])
        UC10(["UC10: Reset & Reseed Synthetic Demonstration State"])

        %% Relationships & Includes
        UC4 -.->|"<<include>>"| UC2
        UC4 -.->|"<<include>>"| UC3
        UC8 -.->|"<<include>>"| UC9
    end

    %% Actor to Use Case Associations
    User --- UC1
    User --- UC4
    User --- UC5
    User --- UC6

    Admin --- UC1
    Admin --- UC7
    Admin --- UC8
    Admin --- UC9
    Admin --- UC10
```

#### Use Case Description & Actor Mappings:
1. **UC1 (Search Facilities)**: User and Administrator search and browse active facilities (R101–R105), operating schedules, hourly rates, and real-time available quantities.
2. **UC2 (Validate Quantity & Compute Fare)**: Rejects quantities outside 1–5; calculates base amount and applies the Rs.50 / Rs.0 booking charge threshold.
3. **UC3 (Validate Customer Details)**: Verifies non-blank name, 10-digit phone, future date, and identity proof.
4. **UC4 (Confirm Reservation Atomically)**: Re-validates availability under database lock, creates reservation, snapshot items, and status history atomically.
5. **UC5 (View Own Bookings)**: Scoped strictly to the authenticated user ID; unauthorized foreign bookings blocked.
6. **UC6 (Cancel Confirmed Booking)**: Cancels only CONFIRMED bookings; restores inventory exactly once; rejects repeated attempts.
7. **UC7 (View Master Catalog)**: Admin view of all reservations across all users.
8. **UC8 (Advance Operational Status)**: Admin-only transition: `CONFIRMED` → `CHECKED_IN` → `COMPLETED` (skipping stages prohibited).
9. **UC9 (Inspect Audit History)**: Comprehensive timestamped audit timeline inspection.
10. **UC10 (Reset Synthetic State)**: Reinitializes database to clean demonstration data.

---

### 2. UML Class Diagram

The Class Diagram illustrates the architectural structure of the system, including entity classes (`User`, `Resource`, `Schedule`, `Reservation`, `ReservationItem`, `BookingStatusHistory`), service classes (`AvailabilityService`, `BookingService`), their attributes, types, visibility, methods, relationships, and multiplicities.

```mermaid
classDiagram
    direction TB

    %% Entity: User
    class User {
        -int id
        -string username
        -string fullName
        -string email
        -string phone
        -string role
        -datetime createdAt
        +getId() int
        +getUsername() string
        +getRole() string
        +isAdmin() boolean
    }

    %% Entity: Resource (Sports Facility)
    class Resource {
        -int id
        -string resourceCode
        -string name
        -string category
        -decimal hourlyRate
        -int availableQuantity
        -int totalCapacity
        -boolean isActive
        -datetime createdAt
        -datetime updatedAt
        +isAvailable(int requestedQty) boolean
        +decrementAvailability(int qty) void
        +incrementAvailability(int qty) void
        +getHourlyRate() decimal
    }

    %% Entity: Schedule
    class Schedule {
        -int id
        -int resourceId
        -string dayOfWeek
        -time startTime
        -time endTime
        -string slotName
        -boolean isActive
        +getSlotDetails() string
    }

    %% Entity: Reservation (Booking Header)
    class Reservation {
        -int id
        -string bookingReference
        -int userId
        -date bookingDate
        -string status
        -decimal rateSnapshot
        -int quantitySnapshot
        -decimal baseAmountSnapshot
        -decimal bookingChargeSnapshot
        -decimal totalAmountSnapshot
        -string customerName
        -string customerPhone
        -string identityProof
        -datetime createdAt
        -datetime updatedAt
        +isConfirmed() boolean
        +canCancel() boolean
        +transitionTo(string nextStatus) void
        +getFareSummary() object
    }

    %% Entity: ReservationItem (Booking Line Item)
    class ReservationItem {
        -int id
        -int reservationId
        -int resourceId
        -string resourceCodeSnapshot
        -string resourceNameSnapshot
        -decimal unitRateSnapshot
        -int quantity
        -decimal subtotal
        +calculateSubtotal() decimal
    }

    %% Entity: BookingStatusHistory (Audit Log)
    class BookingStatusHistory {
        -int id
        -int reservationId
        -string fromStatus
        -string toStatus
        -int changedByUserId
        -string remarks
        -datetime changedAt
        +getLogEntry() string
    }

    %% Service: AvailabilityService
    class AvailabilityService {
        +searchFacilities(object filters) Promise~Resource[]~
        +getFacilityByCode(string code) Promise~Resource~
        +getFacilityById(int id) Promise~Resource~
        +checkAvailability(int resourceId, int qty) Promise~boolean~
    }

    %% Service: BookingService
    class BookingService {
        +validateQuantity(any quantity) int
        +calculateFare(decimal rate, int quantity) object
        +validateCustomerDetails(object details) object
        +generateBookingReference() string
        +createReservation(object data, User actor) Promise~Reservation~
        +getBookings(User actor, object filters) Promise~Reservation[]~
        +getBookingById(string ref, User actor) Promise~Reservation~
        +cancelBooking(string ref, User actor) Promise~object~
        +updateOperationalStatus(string ref, string target, User actor) Promise~object~
    }

    %% Relationships and Multiplicities
    User "1" --> "0..*" Reservation : creates
    User "1" --> "0..*" BookingStatusHistory : initiates
    Resource "1" *-- "1..*" Schedule : defines
    Reservation "1" *-- "1..*" ReservationItem : contains
    Reservation "1" *-- "1..*" BookingStatusHistory : records
    Resource "1" <-- "0..*" ReservationItem : snapshots

    %% Service Dependencies
    AvailabilityService ..> Resource : queries
    AvailabilityService ..> Schedule : joins
    BookingService ..> AvailabilityService : consults
    BookingService ..> Reservation : creates & mutates
    BookingService ..> ReservationItem : persists
    BookingService ..> BookingStatusHistory : writes audit
    BookingService ..> Resource : locks & updates stock
```

---

### 3. Structural Design Details & Traceability

#### Key Design Patterns & Architectural Decisions:
1. **Service Layer Pattern**: 
   - `AvailabilityService` handles read-heavy queries, catalog filtering, and schedule joining.
   - `BookingService` encapsulates complex business rules (BR1–BR10), transaction orchestration, validation, and lifecycle guards.
2. **Snapshot Immutability (BR3)**: 
   - Financial attributes (`rateSnapshot`, `baseAmountSnapshot`, `bookingChargeSnapshot`, `totalAmountSnapshot`) and resource names (`resourceNameSnapshot`, `resourceCodeSnapshot`) are stored directly on `Reservation` and `ReservationItem`. They remain completely decoupled from subsequent changes in `Resource.hourlyRate`.
3. **Pessimistic Concurrency & ACID Integrity (BR2, BR6, BR7)**:
   - In `createReservation` and `cancelBooking`, rows are locked via `SELECT ... FOR UPDATE` within MySQL transactions, preventing double-allocation and ensuring atomic updates across `reservations`, `reservation_items`, `resources`, and `booking_status_history`.
4. **Finite State Machine (FSM) Lifecycle (BR8, BR9)**:
   - Permitted states: `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`.
   - Valid operational transitions: `CONFIRMED` → `CHECKED_IN` → `COMPLETED`.
   - Valid cancellation transition: `CONFIRMED` → `CANCELLED` (with automatic one-time stock restore).
   - All invalid jumps (e.g. `CONFIRMED` → `COMPLETED`, or cancelling a `CANCELLED` booking) are rejected.
