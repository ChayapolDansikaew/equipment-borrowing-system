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
