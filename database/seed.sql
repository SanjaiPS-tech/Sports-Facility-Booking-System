-- ============================================================================
-- Sports Facility Booking System - Synthetic Seed Data Script
-- Implements exact specified synthetic entities: R101-R105, 2 users, 1 admin
-- ============================================================================

USE test_sports_facility_db;

-- 1. Insert Sample Accounts (Two Users, One Administrator)
INSERT INTO users (username, full_name, email, phone, role) VALUES
('user1', 'John Doe', 'john.doe@example.com', '9876543210', 'USER'),
('user2', 'Jane Smith', 'jane.smith@example.com', '9123456780', 'USER'),
('admin', 'Facility Administrator', 'admin@sportsfacility.com', '9998887770', 'ADMINISTRATOR')
ON DUPLICATE KEY UPDATE 
    full_name = VALUES(full_name),
    email = VALUES(email),
    phone = VALUES(phone),
    role = VALUES(role);

-- 2. Insert Specified Synthetic Demonstration Resources
-- R101 — Sports Facility A — Rs.499 — availability 10
-- R102 — Sports Facility B — Rs.799 — availability 5
-- R103 — Sports Facility C — Rs.199 — availability 20
-- R104 — Sports Facility D — Rs.1,299 — availability 0
-- R105 — Sports Facility E — Rs.1,000 — availability 3
INSERT INTO resources (resource_code, name, category, hourly_rate, available_quantity, total_capacity, is_active) VALUES
('R101', 'Sports Facility A', 'Indoor Badminton Court', 499.00, 10, 10, TRUE),
('R102', 'Sports Facility B', 'Championship Tennis Court', 799.00, 5, 5, TRUE),
('R103', 'Sports Facility C', 'Squash & Table Tennis Arena', 199.00, 20, 20, TRUE),
('R104', 'Sports Facility D', 'Olympic Swimming Complex', 1299.00, 0, 8, TRUE),
('R105', 'Sports Facility E', 'Indoor Box Cricket Turf', 1000.00, 3, 3, TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    category = VALUES(category),
    hourly_rate = VALUES(hourly_rate),
    available_quantity = VALUES(available_quantity),
    total_capacity = VALUES(total_capacity),
    is_active = VALUES(is_active);

-- 3. Insert Schedules for Each Resource
INSERT INTO schedules (resource_id, day_of_week, start_time, end_time, slot_name, is_active)
SELECT id, 'Monday - Sunday', '06:00:00', '22:00:00', 'Standard 60-Minute Slot', TRUE
FROM resources
WHERE resource_code IN ('R101', 'R102', 'R103', 'R104', 'R105');
