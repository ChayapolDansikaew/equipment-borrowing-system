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

    // อัปเดตสถานะ item ใน request (สำหรับ admin) - ใช้ name แทน id
    updateItemStatus(requestId, itemName, status, rejectionReason = '') {
        const requests = this.getAll();
        const request = requests.find(r => r.id === requestId);

        if (request) {
            const item = request.items.find(i => i.name === itemName);
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
                                    <button onclick="approveItem('${request.id}', '${item.name}')" 
                                        class="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors cursor-pointer">
                                        อนุมัติ
                                    </button>
                                    <button onclick="rejectItem('${request.id}', '${item.name}')" 
                                        class="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors cursor-pointer">
                                        ปฏิเสธ
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

// Approve an item - สร้าง transactions จริงใน Supabase
window.approveItem = async function (requestId, itemName) {
    // Get the request to find details
    const requests = window.requests.getAll();
    const request = requests.find(r => r.id === requestId);
    if (!request) {
        window.showToast?.('ไม่พบคำขอ', 'error');
        return;
    }

    const item = request.items.find(i => i.name === itemName);
    if (!item) {
        window.showToast?.('ไม่พบอุปกรณ์', 'error');
        return;
    }

    const quantity = item.quantity || 1;

    // Find available equipment units with this name
    const availableUnits = window.equipments.filter(e =>
        e.name === itemName && e.status === 'available'
    );

    if (availableUnits.length < quantity) {
        window.showToast?.(`มีอุปกรณ์ว่างไม่พอ (ว่าง ${availableUnits.length}/${quantity})`, 'error');
        return;
    }

    // Get units to borrow
    const unitsToBorrow = availableUnits.slice(0, quantity);

    try {
        // Create transactions for each unit
        for (const unit of unitsToBorrow) {
            // Update equipment status
            const { error: updateError } = await window.supabaseClient
                .from('equipments')
                .update({ status: 'borrowed' })
                .eq('id', unit.id);

            if (updateError) {
                console.error('Update error:', updateError);
                continue;
            }

            // Insert transaction
            const { error: insertError } = await window.supabaseClient
                .from('transactions')
                .insert([{
                    equipment_id: unit.id,
                    borrower_name: request.userName,
                    status: 'active',
                    start_date: new Date(request.startDate + 'T00:00:00').toISOString(),
                    end_date: new Date(request.endDate + 'T23:59:59').toISOString()
                }]);

            if (insertError) {
                console.error('Insert error:', insertError);
            }
        }

        // Update request status in localStorage
        const success = window.requests.updateItemStatus(requestId, itemName, 'approved');

        if (success) {
            window.showToast?.(`อนุมัติ ${itemName} (${quantity} ชิ้น) สำเร็จ`, 'success');
            renderPendingRequests();
            // Refresh equipment list
            window.fetchEquipments?.();
        }
    } catch (err) {
        console.error('Approve error:', err);
        window.showToast?.('เกิดข้อผิดพลาดในการอนุมัติ', 'error');
    }
};

// Reject an item
window.rejectItem = function (requestId, itemName) {
    const reason = prompt('เหตุผลที่ปฏิเสธ (ไม่บังคับ):');
    if (reason === null) return; // User cancelled
    const success = window.requests.updateItemStatus(requestId, itemName, 'rejected', reason || '');
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

// ============== USER FUNCTIONS ==============

// เปิด My Requests Modal
window.openMyRequestsModal = function () {
    const modal = document.getElementById('myRequestsModal');
    if (modal) {
        renderMyRequests();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

// ปิด My Requests Modal
window.closeMyRequestsModal = function () {
    const modal = document.getElementById('myRequestsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// Render user's own requests
function renderMyRequests() {
    const container = document.getElementById('myRequestsList');
    if (!container) return;

    const myRequests = window.requests.getMyRequests();

    if (myRequests.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p class="text-lg font-medium">ยังไม่มีคำขอยืม</p>
                <p class="text-sm">เลือกอุปกรณ์และส่งคำขอเพื่อเริ่มต้น</p>
            </div>
        `;
        return;
    }

    container.innerHTML = myRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(request => {
        const dateRange = `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`;
        const createdDate = new Date(request.createdAt).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                <!-- Request Header -->
                <div class="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                    <div>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">📅 ${dateRange}</p>
                        <p class="text-xs text-gray-400">ส่งเมื่อ: ${createdDate}</p>
                        ${request.note ? `<p class="text-xs text-gray-500 mt-1">📝 ${request.note}</p>` : ''}
                    </div>
                    <button onclick="deleteMyRequest('${request.id}')" 
                        class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="ลบคำขอนี้">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Items -->
                <div class="space-y-2">
                    ${request.items.map(item => {
            let statusBadge, statusBg;
            if (item.status === 'approved') {
                statusBadge = '<span class="px-2 py-0.5 bg-green-100 text-green-600 text-xs font-bold rounded-full">อนุมัติแล้ว</span>';
                statusBg = '';
            } else if (item.status === 'rejected') {
                statusBadge = '<span class="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">ถูกปฏิเสธ</span>';
                statusBg = 'opacity-60';
            } else {
                statusBadge = '<span class="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-full animate-pulse">รออนุมัติ</span>';
                statusBg = '';
            }
            return `
                            <div class="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg ${statusBg}">
                                <img src="${item.image}" alt="${item.name}" class="w-10 h-10 object-cover rounded">
                                <span class="flex-1 text-sm font-medium">${item.name}</span>
                                ${statusBadge}
                            </div>
                            ${item.status === 'rejected' && item.rejectionReason ? `<p class="text-xs text-red-400 ml-13 pl-12">เหตุผล: ${item.rejectionReason}</p>` : ''}
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ลบคำขอของ user
window.deleteMyRequest = function (requestId) {
    if (!confirm('ต้องการลบคำขอนี้หรือไม่?')) return;

    window.requests.delete(requestId);
    window.showToast?.('ลบคำขอแล้ว', 'info');
    renderMyRequests();
};
