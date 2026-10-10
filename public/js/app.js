/**
 * Apex Arena - Sports Facility Booking System
 * Client-Side Application Logic
 * Implements FR1-FR10, BR1-BR10 Flows, Role Switching, and Dynamic UI Updates
 */

// Application State
const state = {
    currentUser: 'user1',
    currentRole: 'USER',
    users: {
        user1: { id: 1, username: 'user1', full_name: 'John Doe', phone: '9876543210', role: 'USER' },
        user2: { id: 2, username: 'user2', full_name: 'Jane Smith', phone: '9123456780', role: 'USER' },
        admin: { id: 3, username: 'admin', full_name: 'Facility Administrator', phone: '9998887770', role: 'ADMINISTRATOR' }
    },
    facilities: [],
    selectedFacility: null,
    myBookings: [],
    adminBookings: [],
    activeCategory: 'ALL',
    searchQuery: ''
};

// Sport Category Icons & Badges
const sportIcons = {
    'Indoor Badminton Court': '🏸',
    'Championship Tennis Court': '🎾',
    'Squash & Table Tennis Arena': '🏓',
    'Olympic Swimming Complex': '🏊',
    'Indoor Box Cricket Turf': '🏏'
};

// DOM References
const userSelector = document.getElementById('userSelector');
const activeRoleBadge = document.getElementById('activeRoleBadge');
const adminTabBtn = document.getElementById('adminTabBtn');
const notificationBanner = document.getElementById('notificationBanner');
const facilitiesGrid = document.getElementById('facilitiesGrid');
const facilitySearchInput = document.getElementById('facilitySearchInput');
const categoryChips = document.getElementById('categoryChips');
const myBookingsTableBody = document.getElementById('myBookingsTableBody');
const adminBookingsTableBody = document.getElementById('adminBookingsTableBody');
const myBookingsBadge = document.getElementById('myBookingsBadge');
const allBookingsBadge = document.getElementById('allBookingsBadge');

// Modals
const bookingModal = document.getElementById('bookingModal');
const receiptModal = document.getElementById('receiptModal');
const historyModal = document.getElementById('historyModal');
const reservationForm = document.getElementById('reservationForm');
const bookingQuantityInput = document.getElementById('bookingQuantityInput');

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initActor();
    initTabs();
    initFilters();
    initQuantityStepper();
    loadFacilities();
    loadMyBookings();
    if (state.currentRole === 'ADMINISTRATOR') {
        loadAdminBookings();
    }
});

// Toast / Notification Banner
function showNotification(message, type = 'success') {
    notificationBanner.className = `notification-banner ${type}`;
    notificationBanner.innerHTML = `
        <span>${type === 'success' ? '✅' : '⚠️'} ${message}</span>
        <button onclick="this.parentElement.style.display='none'" style="background:transparent;border:none;color:inherit;cursor:pointer;font-weight:bold;font-size:16px;">✕</button>
    `;
    notificationBanner.style.display = 'flex';
    setTimeout(() => {
        notificationBanner.style.display = 'none';
    }, 6000);
}

// Actor & Role Switcher
function initActor() {
    userSelector.addEventListener('change', (e) => {
        state.currentUser = e.target.value;
        const user = state.users[state.currentUser];
        state.currentRole = user.role;

        // Update UI Badges & Navigation
        activeRoleBadge.textContent = `${user.role} ROLE`;
        activeRoleBadge.className = `role-pill ${user.role.toLowerCase() === 'administrator' ? 'admin' : 'user'}`;

        if (state.currentRole === 'ADMINISTRATOR') {
            adminTabBtn.style.display = 'flex';
        } else {
            adminTabBtn.style.display = 'none';
            // If admin tab was active, switch to facilities
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab && activeTab.dataset.tab === 'tab-admin') {
                switchTab('tab-facilities');
            }
        }

        showNotification(`Switched active actor to: ${user.full_name} (${user.role})`, 'success');
        loadMyBookings();
        if (state.currentRole === 'ADMINISTRATOR') {
            loadAdminBookings();
        }
    });
}

// Navigation Tabs
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    document.getElementById('refreshFacilitiesBtn').addEventListener('click', loadFacilities);
    document.getElementById('refreshMyBookingsBtn').addEventListener('click', loadMyBookings);
    document.getElementById('refreshAdminBookingsBtn')?.addEventListener('click', loadAdminBookings);
    document.getElementById('reseedDbBtn')?.addEventListener('click', resetSyntheticData);
    document.getElementById('viewInMyBookingsBtn')?.addEventListener('click', () => {
        receiptModal.close();
        switchTab('tab-my-bookings');
    });

    // Native modal dialog close handlers
    document.getElementById('closeBookingModalBtn').addEventListener('click', () => bookingModal.close());
    document.getElementById('cancelModalBtn').addEventListener('click', () => bookingModal.close());
    document.getElementById('closeReceiptModalBtn').addEventListener('click', () => receiptModal.close());
    document.getElementById('closeHistoryModalBtn').addEventListener('click', () => historyModal.close());
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tabId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === tabId);
    });

    if (tabId === 'tab-facilities') loadFacilities();
    if (tabId === 'tab-my-bookings') loadMyBookings();
    if (tabId === 'tab-admin') loadAdminBookings();
}

// Filters & Search Bar
function initFilters() {
    facilitySearchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        renderFacilities();
    });

    categoryChips.querySelectorAll('.chip-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            categoryChips.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeCategory = btn.dataset.category;
            renderFacilities();
        });
    });
}

// Load Facilities (FR1)
async function loadFacilities() {
    try {
        const res = await fetch('/api/facilities', {
            headers: { 'X-User-Id': state.currentUser }
        });
        const data = await res.json();
        if (data.success) {
            state.facilities = data.data;
            renderFacilities();
        }
    } catch (err) {
        showNotification('Failed to fetch sports facilities: ' + err.message, 'error');
    }
}

function renderFacilities() {
    let filtered = state.facilities;

    if (state.activeCategory !== 'ALL') {
        filtered = filtered.filter(f => f.category.toLowerCase().includes(state.activeCategory.toLowerCase()));
    }

    if (state.searchQuery) {
        filtered = filtered.filter(f => 
            f.name.toLowerCase().includes(state.searchQuery) ||
            f.resource_code.toLowerCase().includes(state.searchQuery) ||
            f.category.toLowerCase().includes(state.searchQuery)
        );
    }

    if (filtered.length === 0) {
        facilitiesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 38px; margin-bottom: 12px;">🔍</div>
                <div style="font-family: var(--font-heading); font-size: 18px; color: var(--text-secondary); font-weight: 700;">No facilities match your search criteria.</div>
                <div style="font-size: 13px; margin-top: 6px;">Try searching for a different sport or clearing filters.</div>
            </div>
        `;
        return;
    }

    facilitiesGrid.innerHTML = filtered.map(fac => {
        const isSoldOut = fac.available_quantity === 0;
        const icon = sportIcons[fac.category] || '⚡';
        const percent = Math.min(100, Math.round((fac.available_quantity / fac.total_capacity) * 100));
        const fillClass = isSoldOut ? 'zero' : (percent > 40 ? 'high' : 'low');

        return `
            <div class="facility-card">
                <div>
                    <div class="card-top">
                        <span class="facility-code-badge">${fac.resource_code}</span>
                        <span class="stock-badge ${isSoldOut ? 'sold-out' : 'available'}">
                            ${isSoldOut ? '● Sold Out (0 Slots)' : `● Available: ${fac.available_quantity} / ${fac.total_capacity} Slots`}
                        </span>
                    </div>

                    <h3 class="facility-title">${fac.name}</h3>
                    <div class="facility-category">
                        <span>${icon}</span>
                        <span>${fac.category}</span>
                    </div>

                    <!-- Slot Progress Bar -->
                    <div class="availability-bar-container">
                        <div class="availability-bar-labels">
                            <span>Availability Capacity</span>
                            <span>${fac.available_quantity} Remaining</span>
                        </div>
                        <div class="availability-bar-track">
                            <div class="availability-bar-fill ${fillClass}" style="width: ${percent}%;"></div>
                        </div>
                    </div>

                    <!-- Operating Schedule -->
                    <div class="schedule-row">
                        <div class="schedule-item">
                            <span>Operational Days:</span>
                            <span>${fac.schedule.days}</span>
                        </div>
                        <div class="schedule-item">
                            <span>Hours / Slot:</span>
                            <span>${fac.schedule.start_time} - ${fac.schedule.end_time} (${fac.schedule.slot_name})</span>
                        </div>
                    </div>
                </div>

                <div class="card-footer">
                    <div class="rate-display">
                        <span class="rate-label">Hourly Rate</span>
                        <span class="rate-amount">Rs. ${fac.hourly_rate.toLocaleString('en-IN')}<span class="rate-unit"> / slot</span></span>
                    </div>
                    <button class="btn btn-primary" onclick="openBookingModal('${fac.resource_code}')" ${isSoldOut ? 'disabled' : ''}>
                        ${isSoldOut ? 'Unavailable' : 'Book Facility ⚡'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Quantity Stepper & Dynamic Live Fare Calculation (FR2, FR3, BR1, BR4)
function initQuantityStepper() {
    document.getElementById('qtyDecrementBtn').addEventListener('click', () => {
        let val = parseInt(bookingQuantityInput.value, 10) || 1;
        if (val > 1) {
            bookingQuantityInput.value = val - 1;
            updateModalFare();
        }
    });

    document.getElementById('qtyIncrementBtn').addEventListener('click', () => {
        let val = parseInt(bookingQuantityInput.value, 10) || 1;
        if (val < 5) {
            bookingQuantityInput.value = val + 1;
            updateModalFare();
        }
    });

    bookingQuantityInput.addEventListener('input', () => {
        updateModalFare();
    });

    reservationForm.addEventListener('submit', handleReservationSubmit);
}

window.openBookingModal = function(resourceCode) {
    const facility = state.facilities.find(f => f.resource_code === resourceCode);
    if (!facility) return;

    state.selectedFacility = facility;
    document.getElementById('bookingFacilityId').value = facility.id;
    document.getElementById('bookingFacilityCode').value = facility.resource_code;
    document.getElementById('modalFacilityCode').textContent = facility.resource_code;
    document.getElementById('modalFacilityName').textContent = facility.name;
    document.getElementById('modalFacilityRate').textContent = `Rs. ${facility.hourly_rate.toLocaleString('en-IN')}`;
    document.getElementById('modalAvailabilityInfo').textContent = `Current Active Availability: ${facility.available_quantity} slots (Max bookable: 5)`;

    // Pre-fill user details from current simulated user
    const user = state.users[state.currentUser];
    document.getElementById('customerNameInput').value = user.full_name;
    document.getElementById('customerPhoneInput').value = user.phone;

    // Set default date to tomorrow in YYYY-MM-DD
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);
    document.getElementById('bookingDateInput').value = dateStr;
    document.getElementById('bookingDateInput').min = new Date().toISOString().slice(0, 10);

    document.getElementById('identityProofInput').value = `MEM-${user.username.toUpperCase()}-091`;

    bookingQuantityInput.value = 1;
    updateModalFare();

    bookingModal.showModal();
};

function updateModalFare() {
    if (!state.selectedFacility) return;

    const rate = state.selectedFacility.hourly_rate;
    const rawVal = bookingQuantityInput.value;
    const qty = parseInt(rawVal, 10);

    // Validate integer from 1 to 5 (BR1)
    const isValidQty = Number.isInteger(Number(rawVal)) && qty >= 1 && qty <= 5 && !rawVal.includes('.');

    document.getElementById('fareUnitRate').textContent = `Rs. ${rate.toFixed(2)}`;
    document.getElementById('fareQuantity').textContent = rawVal;

    if (!isValidQty) {
        document.getElementById('fareBaseAmount').textContent = 'Invalid Qty (1-5 only)';
        document.getElementById('fareBookingCharge').textContent = '--';
        document.getElementById('fareTotalAmount').textContent = '--';
        document.getElementById('fareThresholdBadge').textContent = '⚠️ BR1 Violation: Quantity must be an integer between 1 and 5';
        document.getElementById('fareThresholdBadge').className = 'charge-info-pill standard';
        return;
    }

    const baseAmount = rate * qty;
    // BR4: Add booking charge of Rs.50 when base < 1000, Rs.0 when base >= 1000
    const bookingCharge = baseAmount < 1000 ? 50.00 : 0.00;
    const totalAmount = baseAmount + bookingCharge;

    document.getElementById('fareBaseAmount').textContent = `Rs. ${baseAmount.toFixed(2)}`;
    document.getElementById('fareBookingCharge').textContent = `Rs. ${bookingCharge.toFixed(2)}`;
    document.getElementById('fareTotalAmount').textContent = `Rs. ${totalAmount.toFixed(2)}`;

    const badge = document.getElementById('fareThresholdBadge');
    if (baseAmount >= 1000) {
        badge.className = 'charge-info-pill discounted';
        badge.textContent = '🎉 Threshold Qualified: Free Booking Charge Applied (Base Amount ≥ Rs.1,000)';
    } else {
        badge.className = 'charge-info-pill standard';
        badge.textContent = 'ℹ️ Standard Booking Charge: Rs.50.00 Applied (Base Amount < Rs.1,000)';
    }
}

// Confirm Reservation Submission (FR5, BR1-BR7)
async function handleReservationSubmit(e) {
    e.preventDefault();

    const facilityCode = document.getElementById('bookingFacilityCode').value;
    const rawQty = bookingQuantityInput.value;
    const qty = Number(rawQty);

    // Enforce BR1
    if (!Number.isInteger(qty) || qty < 1 || qty > 5 || rawQty.includes('.')) {
        showNotification('BR1 Error: Quantity must be an integer between 1 and 5.', 'error');
        return;
    }

    const payload = {
        resource_code: facilityCode,
        quantity: qty,
        customer_name: document.getElementById('customerNameInput').value.trim(),
        customer_phone: document.getElementById('customerPhoneInput').value.trim(),
        booking_date: document.getElementById('bookingDateInput').value,
        identity_proof: document.getElementById('identityProofInput').value.trim()
    };

    const submitBtn = document.getElementById('confirmReservationBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Securing Atomic Reservation...';

    try {
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': state.currentUser
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error);
        }

        // Success: Close drawer, display receipt
        bookingModal.close();
        displayReceipt(data.data);
        showNotification(`Success! Reservation ${data.data.booking_reference} confirmed atomically.`, 'success');

        // Reload data
        loadFacilities();
        loadMyBookings();
        if (state.currentRole === 'ADMINISTRATOR') loadAdminBookings();

    } catch (err) {
        showNotification(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '⚡ Confirm Reservation';
    }
}

// Receipt Modal
function displayReceipt(booking) {
    document.getElementById('receiptReference').textContent = booking.booking_reference;
    document.getElementById('receiptFacilityName').textContent = `${booking.resource.resource_code} - ${booking.resource.name}`;
    document.getElementById('receiptBookingDate').textContent = booking.booking_date;
    document.getElementById('receiptQuantity').textContent = `${booking.fare_snapshot.quantity} slot(s)`;
    document.getElementById('receiptCustomerName').textContent = booking.customer.customer_name;
    document.getElementById('receiptCustomerPhone').textContent = booking.customer.customer_phone;
    document.getElementById('receiptIdentityProof').textContent = booking.customer.identity_proof;
    document.getElementById('receiptTotalAmount').textContent = `Rs. ${booking.fare_snapshot.total_amount.toFixed(2)}`;

    receiptModal.showModal();
}

// Load User Bookings (FR6, FR8)
async function loadMyBookings() {
    try {
        const res = await fetch('/api/bookings', {
            headers: { 'X-User-Id': state.currentUser }
        });
        const data = await res.json();
        if (data.success) {
            state.myBookings = data.data;
            myBookingsBadge.textContent = data.data.length;
            renderMyBookings();
        }
    } catch (err) {
        console.error('Failed to load user bookings:', err);
    }
}

function renderMyBookings() {
    if (state.myBookings.length === 0) {
        myBookingsTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 50px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
                    <div style="font-weight: 700; color: var(--text-secondary); font-size: 16px;">No reservations found for ${state.users[state.currentUser].full_name}.</div>
                    <div style="font-size: 13px; margin-top: 4px;">Explore available facilities to reserve a court or slot.</div>
                </td>
            </tr>
        `;
        return;
    }

    myBookingsTableBody.innerHTML = state.myBookings.map(b => {
        const canCancel = b.status === 'CONFIRMED';
        return `
            <tr>
                <td>
                    <span style="font-family: var(--font-mono); font-weight: 800; color: var(--accent-cyan);">${b.booking_reference}</span>
                </td>
                <td>
                    <strong>${b.resource.resource_code}</strong> - ${b.resource.name}
                </td>
                <td>${b.booking_date}</td>
                <td>
                    <div>${b.fare_snapshot.quantity} slot(s) @ Rs.${b.fare_snapshot.unit_rate}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Total: Rs.${b.fare_snapshot.total_amount} (Fee: Rs.${b.fare_snapshot.booking_charge})</div>
                </td>
                <td>
                    <span class="status-pill ${b.status.toLowerCase()}">${b.status}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" style="padding: 7px 14px; font-size: 12px;" onclick="viewBookingHistory('${b.booking_reference}')">
                            Audit 📜
                        </button>
                        ${canCancel ? `
                            <button class="btn btn-danger" style="padding: 7px 14px; font-size: 12px;" onclick="cancelBooking('${b.booking_reference}')">
                                Cancel ✕
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// User Booking Cancellation (FR8, BR8, BR9)
window.cancelBooking = async function(reference) {
    if (!confirm(`Are you sure you want to cancel booking ${reference}? Availability will be restored to inventory.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/bookings/${reference}/cancel`, {
            method: 'POST',
            headers: { 'X-User-Id': state.currentUser }
        });
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error);
        }

        showNotification(`Booking ${reference} cancelled. ${data.data.restored_quantity} slot(s) restored to availability.`, 'success');
        loadMyBookings();
        loadFacilities();
        if (state.currentRole === 'ADMINISTRATOR') loadAdminBookings();
    } catch (err) {
        showNotification(err.message, 'error');
    }
};

// Administrator Operations (FR7, FR9, BR8)
async function loadAdminBookings() {
    try {
        const res = await fetch('/api/bookings', {
            headers: { 'X-User-Id': 'admin' }
        });
        const data = await res.json();
        if (data.success) {
            state.adminBookings = data.data;
            allBookingsBadge.textContent = data.data.length;
            renderAdminBookings();
            updateMetrics();
        }
    } catch (err) {
        console.error('Failed to load admin bookings:', err);
    }
}

function updateMetrics() {
    const list = state.adminBookings;
    document.getElementById('metricTotalBookings').textContent = list.length;
    document.getElementById('metricConfirmed').textContent = list.filter(b => b.status === 'CONFIRMED').length;
    document.getElementById('metricCheckedIn').textContent = list.filter(b => b.status === 'CHECKED_IN').length;
    document.getElementById('metricCompleted').textContent = list.filter(b => b.status === 'COMPLETED').length;
}

function renderAdminBookings() {
    if (state.adminBookings.length === 0) {
        adminBookingsTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 50px;">
                    No bookings found in system.
                </td>
            </tr>
        `;
        return;
    }

    adminBookingsTableBody.innerHTML = state.adminBookings.map(b => {
        let actionControls = '';

        if (b.status === 'CONFIRMED') {
            actionControls = `
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="advanceStatus('${b.booking_reference}', 'CHECKED_IN')">
                        ➔ Check-In (Stage 2)
                    </button>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px; opacity: 0.7;" title="Test stage-skipping prevention (BR8)" onclick="advanceStatus('${b.booking_reference}', 'COMPLETED')">
                        ⚠️ Test Skip
                    </button>
                </div>
            `;
        } else if (b.status === 'CHECKED_IN') {
            actionControls = `
                <button class="btn btn-success" style="padding: 6px 12px; font-size: 12px;" onclick="advanceStatus('${b.booking_reference}', 'COMPLETED')">
                    ➔ Complete (Stage 3)
                </button>
            `;
        } else if (b.status === 'COMPLETED') {
            actionControls = `<span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">Completed</span>`;
        } else if (b.status === 'CANCELLED') {
            actionControls = `<span style="font-size: 12px; color: var(--danger); font-weight: 600;">Cancelled</span>`;
        }

        return `
            <tr>
                <td><span style="font-family: var(--font-mono); font-weight: 800; color: var(--accent-cyan);">${b.booking_reference}</span></td>
                <td><strong>${b.user.username}</strong> (${b.customer.name})</td>
                <td><strong>${b.resource.resource_code}</strong></td>
                <td>${b.booking_date}</td>
                <td>${b.fare_snapshot.quantity} slot(s) / Rs.${b.fare_snapshot.total_amount}</td>
                <td><span class="status-pill ${b.status.toLowerCase()}">${b.status}</span></td>
                <td>${actionControls}</td>
                <td>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="viewBookingHistory('${b.booking_reference}')">
                        History 📜
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Administrator Status Progression (FR7, BR8)
window.advanceStatus = async function(reference, targetStatus) {
    try {
        const res = await fetch(`/api/bookings/${reference}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': 'admin'
            },
            body: JSON.stringify({ status: targetStatus })
        });
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error);
        }

        showNotification(data.data.message, 'success');
        loadAdminBookings();
        loadMyBookings();
    } catch (err) {
        showNotification(err.message, 'error');
    }
};

// View Audit History Modal
window.viewBookingHistory = async function(reference) {
    try {
        const res = await fetch(`/api/bookings/${reference}`, {
            headers: { 'X-User-Id': state.currentUser }
        });
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.error);
        }

        const b = data.data;
        document.getElementById('historyModalHeader').innerHTML = `
            <div><strong>Reference:</strong> <span style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 700;">${b.booking_reference}</span></div>
            <div style="margin-top: 4px;"><strong>Facility:</strong> ${b.resource.resource_code} - ${b.resource.name} | <strong>Current Status:</strong> <span class="status-pill ${b.status.toLowerCase()}">${b.status}</span></div>
        `;

        const timeline = document.getElementById('historyTimeline');
        timeline.innerHTML = b.history.map(item => `
            <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-time">${item.changed_at} (by ${item.changed_by_username})</div>
                <div class="timeline-content">
                    <strong>Transition:</strong> [${item.from_status || 'INITIAL'}] ➔ [${item.to_status}]<br>
                    <span>${item.remarks || 'No remarks recorded.'}</span>
                </div>
            </div>
        `).join('');

        historyModal.showModal();
    } catch (err) {
        showNotification(err.message, 'error');
    }
};

// Reset Synthetic Data
async function resetSyntheticData() {
    if (!confirm('Reset database to clean synthetic demonstration state (R101-R105, 2 users, 1 admin)?')) {
        return;
    }

    try {
        const res = await fetch('/api/system/reset', {
            method: 'POST',
            headers: { 'X-User-Id': 'admin' }
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Database reset and seeded with synthetic demonstration data.', 'success');
            loadFacilities();
            loadMyBookings();
            loadAdminBookings();
        }
    } catch (err) {
        showNotification('Reset failed: ' + err.message, 'error');
    }
}
