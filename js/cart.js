// Cart Module - จัดการตะกร้าอุปกรณ์ (Group-based with quantity)
window.cart = {
    items: [],

    // โหลด cart จาก localStorage
    load() {
        const saved = localStorage.getItem('equipmentCart');
        this.items = saved ? JSON.parse(saved) : [];
        this.updateBadge();
    },

    // บันทึก cart ลง localStorage
    save() {
        localStorage.setItem('equipmentCart', JSON.stringify(this.items));
        this.updateBadge();
    },

    // เพิ่ม/อัปเดตอุปกรณ์ในตะกร้า (ตามชื่อ group)
    addOrUpdate(name, image, category, quantity) {
        const existing = this.items.find(item => item.name === name);

        if (existing) {
            existing.quantity = quantity;
            if (quantity <= 0) {
                this.removeByName(name);
                // Refresh UI after removal
                if (typeof window.renderEquipments === 'function') {
                    window.renderEquipments();
                }
                return;
            }
        } else {
            if (quantity <= 0) return;
            this.items.push({
                name: name,
                image: image,
                category: category,
                quantity: quantity,
                addedAt: new Date().toISOString()
            });
        }

        this.save();
        window.showToast?.(`${name} (${quantity} ชิ้น) ในตะกร้า`, 'success');

        // Refresh UI
        if (typeof window.renderEquipments === 'function') {
            window.renderEquipments();
        }
    },

    // ลบอุปกรณ์ออกจากตะกร้า (ตามชื่อ)
    removeByName(name) {
        const index = this.items.findIndex(item => item.name === name);
        if (index > -1) {
            const removed = this.items.splice(index, 1)[0];
            this.save();
            window.showToast?.(`ลบ ${removed.name} ออกจากตะกร้าแล้ว`, 'info');
        }
    },

    // ล้างตะกร้า
    clear() {
        this.items = [];
        this.save();
    },

    // อัปเดต badge จำนวน (รวมจำนวน quantity)
    updateBadge() {
        const badge = document.getElementById('cartBadge');
        const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);

        if (badge) {
            badge.textContent = totalItems;
            badge.classList.toggle('hidden', totalItems === 0);
        }
    },

    // หาอุปกรณ์ตามชื่อ
    getByName(name) {
        return this.items.find(item => item.name === name);
    },

    // จำนวนรายการในตะกร้า (ไม่รวม quantity)
    get count() {
        return this.items.length;
    },

    // จำนวนรวมทั้งหมด (รวม quantity)
    get totalQuantity() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }
};

// เปิด Cart Modal
window.openCartModal = function () {
    const modal = document.getElementById('cartModal');
    if (modal) {
        renderCartItems();
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

// ปิด Cart Modal
window.closeCartModal = function () {
    const modal = document.getElementById('cartModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// Render รายการในตะกร้า (ใหม่ - รองรับ quantity)
function renderCartItems() {
    const container = document.getElementById('cartItemsList');
    if (!container) return;

    if (window.cart.items.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <p class="text-lg font-medium">ตะกร้าว่างเปล่า</p>
                <p class="text-sm">เลือกอุปกรณ์ที่ต้องการยืม</p>
            </div>
        `;
        return;
    }

    container.innerHTML = window.cart.items.map(item => `
        <div class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg">
            <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-gray-900 dark:text-white truncate">${item.name}</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400">${item.category}</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="px-3 py-1 bg-brand-yellow text-black font-bold rounded-lg text-sm">${item.quantity} ชิ้น</span>
                <button onclick="window.cart.removeByName('${item.name}'); renderCartItems(); window.renderEquipments?.();" 
                    class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// ============== UNIFIED EQUIPMENT MODAL ==============

let unifiedModalData = {
    name: '',
    image: '',
    category: '',
    maxQty: 0,
    equipmentId: null,
    startDate: null,
    endDate: null,
    bookedDates: []
};

// เปิด Unified Modal (เรียกจากกดรูปหรือกดปุ่ม)
window.openUnifiedModal = function (name, image, category, maxQty, equipmentId = null) {
    const modal = document.getElementById('unifiedEquipmentModal');
    if (!modal) return;

    // Store data
    unifiedModalData = {
        name, image, category, maxQty,
        equipmentId,
        startDate: null,
        endDate: null,
        bookedDates: []
    };

    // Update modal content
    document.getElementById('unifiedModalName').textContent = name;
    document.getElementById('unifiedModalImage').src = image;
    document.getElementById('unifiedModalCategory').textContent = category;
    document.getElementById('unifiedModalAvailable').textContent = maxQty;
    document.getElementById('unifiedQtyInput').value = 1;
    document.getElementById('unifiedQtyInput').max = maxQty;

    // Reset date display
    document.getElementById('unifiedStartDate').textContent = '-';
    document.getElementById('unifiedEndDate').textContent = '-';
    document.getElementById('unifiedDuration').textContent = '-';

    // Load booked dates and render calendar
    loadBookedDatesAndRenderCalendar(name);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

// ปิด Unified Modal
window.closeUnifiedModal = function () {
    const modal = document.getElementById('unifiedEquipmentModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    // Reset dates
    unifiedModalData.startDate = null;
    unifiedModalData.endDate = null;
};

// เพิ่ม/ลดจำนวน
window.adjustUnifiedQuantity = function (delta) {
    const input = document.getElementById('unifiedQtyInput');
    const newVal = Math.max(1, Math.min(unifiedModalData.maxQty, parseInt(input.value) + delta));
    input.value = newVal;
};

// โหลดวันที่ถูกจองและ render calendar
async function loadBookedDatesAndRenderCalendar(equipmentName) {
    try {
        // Get all equipment IDs with this name
        const equipmentIds = window.equipments
            .filter(e => e.name === equipmentName)
            .map(e => e.id);

        if (equipmentIds.length === 0) {
            renderUnifiedCalendar([]);
            return;
        }

        // Fetch booked dates from transactions
        const { data: transactions, error } = await supabaseClient
            .from('transactions')
            .select('borrow_date, return_date')
            .in('equipment_id', equipmentIds)
            .in('status', ['approved', 'borrowed']);

        if (error) {
            console.error('Error fetching booked dates:', error);
            renderUnifiedCalendar([]);
            return;
        }

        // Process booked dates
        const bookedDates = [];
        transactions.forEach(t => {
            const start = new Date(t.borrow_date);
            const end = new Date(t.return_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                bookedDates.push(d.toISOString().split('T')[0]);
            }
        });

        unifiedModalData.bookedDates = [...new Set(bookedDates)];
        renderUnifiedCalendar(unifiedModalData.bookedDates);

    } catch (err) {
        console.error('Error loading booked dates:', err);
        renderUnifiedCalendar([]);
    }
}

// Render Calendar
function renderUnifiedCalendar(bookedDates) {
    const container = document.getElementById('unifiedCalendarContainer');
    if (!container) return;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get Thai month name
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const thaiYear = currentYear + 543;

    // First day of month and days in month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Build calendar HTML
    let html = `
        <div class="flex items-center justify-between mb-3">
            <button onclick="changeUnifiedMonth(-1)" class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <span class="font-bold text-gray-900 dark:text-white">${thaiMonths[currentMonth]} ${thaiYear}</span>
            <button onclick="changeUnifiedMonth(1)" class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center text-xs">
            <div class="text-gray-500 font-medium py-1">อา</div>
            <div class="text-gray-500 font-medium py-1">จ</div>
            <div class="text-gray-500 font-medium py-1">อ</div>
            <div class="text-gray-500 font-medium py-1">พ</div>
            <div class="text-gray-500 font-medium py-1">พฤ</div>
            <div class="text-gray-500 font-medium py-1">ศ</div>
            <div class="text-gray-500 font-medium py-1">ส</div>
    `;

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += `<div></div>`;
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isBooked = bookedDates.includes(dateStr);
        const isPast = new Date(dateStr) < new Date(today.toDateString());
        const isSelected = isDateInRange(dateStr);
        const isStart = unifiedModalData.startDate === dateStr;
        const isEnd = unifiedModalData.endDate === dateStr;

        let dayClass = 'w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all text-sm ';
        let indicator = '';

        if (isPast) {
            dayClass += 'text-gray-300 cursor-not-allowed';
        } else if (isBooked) {
            dayClass += 'text-gray-400 cursor-not-allowed';
            indicator = '<span class="absolute top-0 right-0 w-2 h-2 bg-orange-400 rounded-full"></span>';
        } else if (isStart || isEnd) {
            dayClass += 'bg-gradient-to-r from-brand-yellow to-brand-pink text-black font-bold';
        } else if (isSelected) {
            dayClass += 'bg-yellow-200 text-black';
        } else {
            dayClass += 'hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white';
            indicator = '<svg class="absolute bottom-0 right-0 w-2 h-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
        }

        const clickHandler = (!isPast && !isBooked) ? `onclick="selectUnifiedDate('${dateStr}')"` : '';

        html += `
            <div class="relative flex items-center justify-center">
                <div ${clickHandler} class="${dayClass}">${day}</div>
                ${indicator}
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Check if date is in selected range
function isDateInRange(dateStr) {
    if (!unifiedModalData.startDate || !unifiedModalData.endDate) return false;
    return dateStr >= unifiedModalData.startDate && dateStr <= unifiedModalData.endDate;
}

// Select date
window.selectUnifiedDate = function (dateStr) {
    if (!unifiedModalData.startDate || (unifiedModalData.startDate && unifiedModalData.endDate)) {
        // First click or reset: set start date
        unifiedModalData.startDate = dateStr;
        unifiedModalData.endDate = null;
    } else {
        // Second click: set end date
        if (dateStr < unifiedModalData.startDate) {
            unifiedModalData.endDate = unifiedModalData.startDate;
            unifiedModalData.startDate = dateStr;
        } else {
            unifiedModalData.endDate = dateStr;
        }
    }

    updateDateDisplay();
    renderUnifiedCalendar(unifiedModalData.bookedDates);
};

// Update date summary display
function updateDateDisplay() {
    const formatThaiDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = (d.getFullYear() + 543) % 100;
        return `${day} ${['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][month]} ${year}`;
    };

    document.getElementById('unifiedStartDate').textContent = formatThaiDate(unifiedModalData.startDate);
    document.getElementById('unifiedEndDate').textContent = formatThaiDate(unifiedModalData.endDate);

    if (unifiedModalData.startDate && unifiedModalData.endDate) {
        const start = new Date(unifiedModalData.startDate);
        const end = new Date(unifiedModalData.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        document.getElementById('unifiedDuration').textContent = `${days} วัน`;
    } else if (unifiedModalData.startDate) {
        document.getElementById('unifiedDuration').textContent = '1 วัน';
        document.getElementById('unifiedEndDate').textContent = formatThaiDate(unifiedModalData.startDate);
    } else {
        document.getElementById('unifiedDuration').textContent = '-';
    }
}

// Submit borrow request
window.submitUnifiedBorrow = async function () {
    const quantity = parseInt(document.getElementById('unifiedQtyInput').value);
    const { name, image, category, startDate, endDate } = unifiedModalData;

    // Validation
    if (!startDate) {
        window.showToast?.('กรุณาเลือกวันที่ต้องการยืม', 'error');
        return;
    }

    if (quantity < 1) {
        window.showToast?.('กรุณาเลือกจำนวนอย่างน้อย 1 ชิ้น', 'error');
        return;
    }

    // Find available equipment IDs with this name
    const availableEquipment = window.equipments.filter(e =>
        e.name === name && e.status === 'available'
    ).slice(0, quantity);

    if (availableEquipment.length < quantity) {
        window.showToast?.(`มีอุปกรณ์ว่างเพียง ${availableEquipment.length} ชิ้น`, 'error');
        return;
    }

    const borrowDate = startDate;
    const returnDate = endDate || startDate;

    try {
        // Create transaction for each equipment
        for (const equip of availableEquipment) {
            const { error } = await supabaseClient.from('transactions').insert({
                equipment_id: equip.id,
                borrower_name: window.currentUser?.username || 'Unknown',
                borrow_date: borrowDate,
                return_date: returnDate,
                status: 'pending'
            });

            if (error) throw error;
        }

        window.showToast?.(`ส่งคำขอยืม ${name} (${quantity} ชิ้น) สำเร็จ!`, 'success');
        closeUnifiedModal();

        // Refresh data
        if (typeof window.loadEquipments === 'function') {
            await window.loadEquipments();
        }

    } catch (err) {
        console.error('Borrow error:', err);
        window.showToast?.('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
    }
};

// Alias for backward compatibility (for existing buttons)
window.openQuantityModal = window.openUnifiedModal;
window.closeQuantityModal = window.closeUnifiedModal;
window.adjustQuantity = window.adjustUnifiedQuantity;

// โหลด cart เมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
    window.cart.load();
});
