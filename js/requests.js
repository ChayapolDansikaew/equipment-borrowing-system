// Request Module - จัดการคำขอยืมอุปกรณ์
window.requests = {
    // โหลด requests จาก localStorage
    getAll() {
        const saved = localStorage.getItem('borrowRequests');
        return saved ? JSON.parse(saved) : [];
    },

    // บันทึก requests ลง localStorage
    save(requests) {
        localStorage.setItem('borrowRequests', JSON.stringify(requests));
    },

    // สร้างคำขอใหม่
    create(items, startDate, endDate, note = '') {
        const requests = this.getAll();
        const newRequest = {
            id: 'req_' + Date.now(),
            userId: window.currentUser?.id || 'unknown',
            userName: window.currentUser?.username || 'Unknown User',
            items: items.map(item => ({
                ...item,
                status: 'pending' // pending, approved, rejected
            })),
            startDate: startDate,
            endDate: endDate,
            note: note,
            createdAt: new Date().toISOString()
        };

        requests.push(newRequest);
        this.save(requests);

        // Clear cart after submission
        window.cart.clear();

        return newRequest;
    },

    // อัปเดตสถานะ item ใน request (สำหรับ admin)
    updateItemStatus(requestId, itemId, status, rejectionReason = '') {
        const requests = this.getAll();
        const request = requests.find(r => r.id === requestId);

        if (request) {
            const item = request.items.find(i => i.id === itemId);
            if (item) {
                item.status = status;
                item.approvedAt = new Date().toISOString();
                item.approvedBy = window.currentUser?.username;
                if (status === 'rejected') {
                    item.rejectionReason = rejectionReason;
                }
                this.save(requests);
                return true;
            }
        }
        return false;
    },

    // ดึง requests ของ user ปัจจุบัน
    getMyRequests() {
        const userId = window.currentUser?.id;
        return this.getAll().filter(r => r.userId === userId);
    },

    // ดึง requests ที่รออนุมัติ (สำหรับ admin)
    getPendingRequests() {
        return this.getAll().filter(r =>
            r.items.some(item => item.status === 'pending')
        );
    },

    // ลบ request
    delete(requestId) {
        const requests = this.getAll().filter(r => r.id !== requestId);
        this.save(requests);
    }
};

// เปิด Request Form Modal
window.openRequestForm = function () {
    if (window.cart.items.length === 0) {
        window.showToast?.('กรุณาเลือกอุปกรณ์ก่อน', 'warning');
        return;
    }

    // Close cart modal
    closeCartModal();

    // Open request form modal
    const modal = document.getElementById('requestFormModal');
    if (modal) {
        // Set default dates
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        document.getElementById('requestStartDate').value = today.toISOString().split('T')[0];
        document.getElementById('requestEndDate').value = tomorrow.toISOString().split('T')[0];
        document.getElementById('requestNote').value = '';

        // Render cart items preview
        renderRequestPreview();

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

// ปิด Request Form Modal
window.closeRequestForm = function () {
    const modal = document.getElementById('requestFormModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// Render preview ของ items ใน request form
function renderRequestPreview() {
    const container = document.getElementById('requestItemsPreview');
    if (!container) return;

    container.innerHTML = window.cart.items.map(item => `
        <div class="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded-lg">
            <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-900 dark:text-white truncate text-sm">${item.name}</h4>
                <p class="text-xs text-gray-500">${item.category}</p>
            </div>
        </div>
    `).join('');
}

// Submit request
window.submitBorrowRequest = function () {
    const startDate = document.getElementById('requestStartDate').value;
    const endDate = document.getElementById('requestEndDate').value;
    const note = document.getElementById('requestNote').value;

    if (!startDate || !endDate) {
        window.showToast?.('กรุณาเลือกวันยืม-คืน', 'warning');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        window.showToast?.('วันสิ้นสุดต้องหลังวันเริ่มต้น', 'warning');
        return;
    }

    // Create request
    const request = window.requests.create(window.cart.items, startDate, endDate, note);

    if (request) {
        closeRequestForm();
        window.showToast?.('ส่งคำขอยืมสำเร็จ! รอการอนุมัติ', 'success');

        // Refresh equipment list
        if (typeof window.renderEquipments === 'function') {
            window.renderEquipments();
        }
    }
};

// ============== ADMIN FUNCTIONS ==============

// เปิด Pending Requests Modal
window.openPendingRequestsModal = function () {
    const modal = document.getElementById('pendingRequestsModal');
    if (modal) {
        renderPendingRequests();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

// ปิด Pending Requests Modal
window.closePendingRequestsModal = function () {
    const modal = document.getElementById('pendingRequestsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// Render pending requests for admin
function renderPendingRequests() {
    const container = document.getElementById('pendingRequestsList');
    if (!container) return;

    const pendingRequests = window.requests.getPendingRequests();

    if (pendingRequests.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-lg font-medium">ไม่มีคำขอที่รออนุมัติ</p>
            </div>
        `;
        updatePendingBadge(0);
        return;
    }

    let totalPending = 0;
    container.innerHTML = pendingRequests.map(request => {
        const pendingItems = request.items.filter(item => item.status === 'pending');
        totalPending += pendingItems.length;

        const dateRange = `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`;

        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                <!-- Request Header -->
                <div class="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                    <div>
                        <p class="font-bold text-gray-900 dark:text-white">${request.userName}</p>
                        <p class="text-xs text-gray-500">📅 ${dateRange}</p>
                        ${request.note ? `<p class="text-xs text-gray-400 mt-1">📝 ${request.note}</p>` : ''}
                    </div>
                    <span class="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">${pendingItems.length} รอดำเนินการ</span>
                </div>
                
                <!-- Items -->
                <div class="space-y-2">
                    ${request.items.map(item => {
            if (item.status !== 'pending') {
                const statusBadge = item.status === 'approved'
                    ? '<span class="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">อนุมัติแล้ว</span>'
                    : '<span class="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">ปฏิเสธแล้ว</span>';
                return `
                                <div class="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg opacity-60">
                                    <img src="${item.image}" alt="${item.name}" class="w-10 h-10 object-cover rounded">
                                    <span class="flex-1 text-sm">${item.name}</span>
                                    ${statusBadge}
                                </div>
                            `;
            }
            return `
                            <div class="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg">
                                <img src="${item.image}" alt="${item.name}" class="w-10 h-10 object-cover rounded">
                                <span class="flex-1 text-sm font-medium">${item.name}</span>
                                <div class="flex gap-1">
                                    <button onclick="approveItem('${request.id}', '${item.id}')" 
                                        class="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors">
                                        ✓ อนุมัติ
                                    </button>
                                    <button onclick="rejectItem('${request.id}', '${item.id}')" 
                                        class="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors">
                                        ✗ ปฏิเสธ
                                    </button>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }).join('');

    updatePendingBadge(totalPending);
}

// Format date helper
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

// Update pending badge
function updatePendingBadge(count) {
    const badge = document.getElementById('pendingBadge');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

// Approve an item
window.approveItem = function (requestId, itemId) {
    const success = window.requests.updateItemStatus(requestId, itemId, 'approved');
    if (success) {
        window.showToast?.('อนุมัติสำเร็จ', 'success');
        renderPendingRequests();
    }
};

// Reject an item
window.rejectItem = function (requestId, itemId) {
    const reason = prompt('เหตุผลที่ปฏิเสธ (ไม่บังคับ):');
    const success = window.requests.updateItemStatus(requestId, itemId, 'rejected', reason || '');
    if (success) {
        window.showToast?.('ปฏิเสธคำขอแล้ว', 'info');
        renderPendingRequests();
    }
};

// Initialize pending badge on page load
window.initPendingBadge = function () {
    if (window.currentUser?.role === 'admin') {
        const pendingRequests = window.requests.getPendingRequests();
        const totalPending = pendingRequests.reduce((sum, req) =>
            sum + req.items.filter(item => item.status === 'pending').length, 0
        );
        updatePendingBadge(totalPending);
    }
};
