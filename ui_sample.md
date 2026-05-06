# ตัวอย่างซอร์สโค้ดส่วนต่อประสานผู้ใช้ (User Interface Sample)

เอกสารนี้แสดงตัวอย่างซอร์สโค้ดในส่วนของการจัดการและแสดงผล User Interface (UI) ของระบบ Equipment Borrowing System ซึ่งประกอบไปด้วยการจัดสไตล์ด้วย CSS (Glassmorphism & Tailwind) และการเรนเดอร์ข้อมูลด้วย JavaScript

## 1. การจัดสไตล์ด้วย CSS (Premium Glassmorphism)
โค้ดด้านล่างนี้เป็นตัวอย่างจากไฟล์ `index.html` ที่ใช้ตกแต่ง UI ของระบบให้มีความทันสมัย

```css
/* ========================================
   GLASSMORPHISM & PREMIUM STYLES
   ======================================== */

.glass-effect {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.dark .glass-effect {
    background: rgba(31, 41, 55, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-card {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.dark .glass-card {
    background: rgba(31, 41, 55, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* Gradient Buttons */
.btn-gradient-primary {
    background: linear-gradient(135deg, #FFD100 0%, #FFA500 100%);
    color: #000;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.btn-gradient-primary:hover {
    background: linear-gradient(135deg, #FFE44D 0%, #FFB833 100%);
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(255, 209, 0, 0.4);
}

/* Enhanced Card Hover - Premium Style */
.card-premium {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-premium:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08);
}
```

## 2. การสร้างคอมโพเนนต์ด้วย HTML/JavaScript (Card Component)
ตัวอย่างฟังก์ชันใน `js/ui.js` สำหรับการแสดงผลรายการอุปกรณ์ออกมาในรูปแบบของ Card พร้อมการตรวจสอบสถานะ จำนวน และการรองรับหลายภาษา (i18n)

```javascript
window.renderEquipments = function () {
    const grid = document.getElementById('equipmentGrid');
    const t = window.translations[window.currentLang];

    // โค้ดส่วนนี้สมมติการกรองและจัดกลุ่มข้อมูลอุปกรณ์ที่ได้รับมา (filteredGroups)
    
    grid.innerHTML = filteredGroups.map(group => {
        const isOutOfStock = group.available === 0;
        const statusColor = isOutOfStock ? 'bg-brand-grey text-white' : 'bg-brand-yellow text-black';
        const statusText = isOutOfStock ? t.outOfStock : `${group.available}/${group.total} ${t.available}`;

        // จัดการสถานะปุ่ม
        let btnClass, btnText;
        if (isOutOfStock) {
            btnClass = 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600';
            btnText = t.outOfStock;
        } else {
            btnClass = 'bg-brand-yellow text-black hover:bg-yellow-400 shadow-md cursor-pointer';
            btnText = `${t.viewDetails}`;
        }

        return `
        <div class="bg-white rounded-xl overflow-hidden group border border-gray-100 card-premium dark:bg-gray-800 dark:border-gray-700 cursor-pointer fade-in-up">
            <div class="relative h-48 overflow-hidden bg-gray-50" onclick="openEquipmentDetail(${group.items[0].id})">
                <img src="${group.image_url}" alt="${group.name}" loading="lazy" class="w-full h-full object-cover img-zoom">
                <div class="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${statusColor}">
                    ${statusText}
                </div>
            </div>
            <div class="p-5">
                <p class="text-xs font-bold text-brand-pink uppercase tracking-wide mb-1">${group.type}</p>
                <h3 class="font-bold text-lg mb-2 text-brand-black dark:text-white">${group.name}</h3>
                
                <button class="w-full py-2.5 rounded-lg font-bold uppercase text-sm tracking-wider transition-all transform active:scale-95 btn-ripple ${btnClass}" ${isOutOfStock ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>
        </div>
        `;
    }).join('');
};
```

## 3. ตัวอย่างการแสดง Notification Toast
การแสดงป๊อปอัปแจ้งเตือนเมื่อผู้ใช้งานทำรายการสำเร็จหรือเกิดข้อผิดพลาด

```javascript
window.showToast = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let borderClass = type === 'success' ? 'border-l-4 border-green-500' : (type === 'error' ? 'border-l-4 border-brand-pink' : 'border-l-4 border-brand-yellow');

    toast.className = `bg-white dark:bg-gray-800 rounded-r-lg shadow-xl p-4 flex items-center gap-3 transform transition-all duration-300 translate-y-2 opacity-0 w-80 ${borderClass}`;

    toast.innerHTML = `
        <div class="flex-1">
            <p class="text-sm font-semibold text-brand-black dark:text-gray-100">${message}</p>
        </div>
    `;

    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => { toast.classList.remove('translate-y-2', 'opacity-0'); });
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};
```
