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

// ============== QUANTITY MODAL ==============

let currentQuantityData = {};

// เปิด Quantity Modal
window.openQuantityModal = function (name, image, category, maxQty) {
    const modal = document.getElementById('quantityModal');
    if (!modal) return;

    // Store data for confirm
    currentQuantityData = { name, image, category, maxQty };

    // Get current quantity in cart (if any)
    const existingItem = window.cart.getByName(name);
    const currentQty = existingItem ? existingItem.quantity : 1;

    // Update modal content
    document.getElementById('qtyModalName').textContent = name;
    document.getElementById('qtyModalImage').src = image;
    document.getElementById('qtyModalMax').textContent = maxQty;
    document.getElementById('qtyInput').value = currentQty;
    document.getElementById('qtyInput').max = maxQty;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

// ปิด Quantity Modal
window.closeQuantityModal = function () {
    const modal = document.getElementById('quantityModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// เพิ่ม/ลดจำนวน
window.adjustQuantity = function (delta) {
    const input = document.getElementById('qtyInput');
    const newVal = Math.max(0, Math.min(currentQuantityData.maxQty, parseInt(input.value) + delta));
    input.value = newVal;
};

// ยืนยันจำนวน
window.confirmQuantity = function () {
    const quantity = parseInt(document.getElementById('qtyInput').value);
    const { name, image, category } = currentQuantityData;

    window.cart.addOrUpdate(name, image, category, quantity);
    closeQuantityModal();
};

// โหลด cart เมื่อ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
    window.cart.load();
});
