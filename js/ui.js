// js/ui.js

console.log('UI loaded');

// --- Render Logic ---

window.renderEquipments = function () {
    const grid = document.getElementById('equipmentGrid');
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const t = window.translations[window.currentLang];

    // 1. Group items
    const groups = {};
    window.equipments.forEach(item => {
        if (!groups[item.name]) {
            groups[item.name] = {
                name: item.name,
                type: item.type,
                image_url: item.image_url,
                items: [],
                total: 0,
                available: 0,
                availableItems: [],
                borrowedByUser: 0
            };
        }
        groups[item.name].items.push(item);
        groups[item.name].total++;
        if (item.status === 'available') {
            groups[item.name].available++;
            groups[item.name].availableItems.push(item);
        }
        if (item.status === 'borrowed' && item.transaction && item.transaction.borrower_name === (window.currentUser ? window.currentUser.username : '')) {
            groups[item.name].borrowedByUser++;
        }
    });

    // 2. Filter Groups
    const filteredGroups = Object.values(groups).filter(group => {
        const matchesSearch = group.name.toLowerCase().includes(searchVal) || group.type.toLowerCase().includes(searchVal);

        // Category filter
        const matchesCategory = window.currentCategory === 'all' || group.type === window.currentCategory;

        // Status filter
        if (window.currentFilter === 'available') return matchesSearch && matchesCategory && group.available > 0;
        if (window.currentFilter === 'borrowed') return matchesSearch && matchesCategory && group.available < group.total;
        if (window.currentFilter === 'my-items') return matchesSearch && matchesCategory && group.borrowedByUser > 0;
        return matchesSearch && matchesCategory;
    });

    grid.innerHTML = filteredGroups.map(group => {
        const isOutOfStock = group.available === 0;
        // REDESIGN: Status Text Colors
        const statusColor = isOutOfStock ? 'bg-brand-grey text-white' : 'bg-brand-yellow text-black';
        const statusText = isOutOfStock ? t.outOfStock : `${group.available}/${group.total} ${t.available}`;

        // Edit Button (Clean, small)
        const editBtn = window.currentUser && window.currentUser.role === 'admin'
            ? `<button onclick="openManageModal('${group.name}')" class="absolute top-2 left-2 p-1.5 bg-white/90 rounded-full hover:bg-white text-brand-black transition-colors z-10"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>`
            : '';

        // Badge
        const userBadge = group.borrowedByUser > 0
            ? `<div class="absolute top-2 right-2 px-2 py-1 bg-brand-pink text-white text-xs font-bold rounded-full shadow-md z-10">${t.youHave} ${group.borrowedByUser}</div>`
            : '';

        // Check if item group is already in cart (by name, not unit ID)
        const cartItem = window.cart?.getByName(group.name);
        const isInCart = !!cartItem;

        // REDESIGN: Button Styles
        let btnClass, btnText, btnAction;
        if (isOutOfStock) {
            btnClass = 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600';
            btnText = t.outOfStock;
            btnAction = '';
        } else if (isInCart) {
            btnClass = 'bg-green-500 text-white cursor-pointer hover:bg-green-600';
            btnText = `<svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> ${t.inCart} (${cartItem.quantity})`;
            btnAction = `onclick="openEquipmentDetail(${group.items[0].id})"`;
        } else {
            btnClass = 'bg-brand-yellow text-black hover:bg-yellow-400 shadow-md cursor-pointer';
            btnText = `<svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg> ${t.viewDetails}`;
            btnAction = `onclick="openEquipmentDetail(${group.items[0].id})"`;
        }

        return `
        <div class="bg-white rounded-xl overflow-hidden group border border-gray-100 card-premium dark:bg-gray-800 dark:border-gray-700 cursor-pointer opacity-0 fade-in-up" style="animation-delay: ${Math.random() * 0.2}s">
            <div class="relative h-48 overflow-hidden bg-gray-50" onclick="openEquipmentDetail(${group.items[0].id})">
                ${editBtn}
                ${userBadge}
                <img src="${group.image_url}" alt="${group.name} - ${group.type}" loading="lazy" class="w-full h-full object-cover img-zoom">
                <div class="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${statusColor}" style="${group.borrowedByUser > 0 ? 'top: 2.5rem;' : ''}">
                    ${statusText}
                </div>
            </div>
            <div class="p-5">
                <p class="text-xs font-bold text-brand-pink uppercase tracking-wide mb-1">${group.type}</p>
                <h3 class="font-bold text-lg mb-4 text-brand-black dark:text-white">${group.name}</h3>
                
                <button ${btnAction}
                    class="w-full py-2.5 rounded-lg font-bold uppercase text-sm tracking-wider transition-all transform active:scale-95 btn-ripple ${btnClass}"
                    ${isOutOfStock ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>
        </div>
    `}).join('');
};

window.renderReturnTable = function (transactions) {
    const tbody = document.getElementById('returnTableBody');
    const t = window.translations[window.currentLang];

    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-gray-400">${t.noActiveTransactions}</td></tr>`;
        return;
    }

    tbody.innerHTML = transactions.map(tr => {
        const date = new Date(tr.borrow_date).toLocaleDateString(window.currentLang === 'th' ? 'th-TH' : 'en-US', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const endDate = tr.end_date ? new Date(tr.end_date) : null;
        let isOverdue = false;
        if (endDate) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            isOverdue = today > endDay;
        }

        const statusBadge = isOverdue
            ? `<span class="px-2 py-1 rounded-full text-xs font-bold bg-brand-pink text-white">${t.overdue}</span>`
            : `<span class="px-2 py-1 rounded-full text-xs font-bold bg-brand-yellow text-black">${t.active}</span>`;

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors">
                <td class="px-6 py-4 font-medium text-brand-black dark:text-white">${tr.equipments?.name || 'Unknown'}</td>
                <td class="px-6 py-4 dark:text-gray-300">${tr.borrower_name}</td>
                <td class="px-6 py-4 text-gray-500 dark:text-gray-400">${date}</td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4">
                    <div class="flex gap-2">
                        <button onclick="openReturnModal(${tr.equipment_id}, '${tr.equipments?.name || 'Unknown'}')" class="text-brand-pink hover:text-white hover:bg-brand-pink border border-brand-pink px-3 py-1.5 rounded-lg transition-all text-xs font-bold">
                            ${t.returnNotify}
                        </button>
                        <button onclick="window.triggerReminder(${tr.id})" class="text-blue-500 hover:text-white hover:bg-blue-500 border border-blue-500 px-3 py-1.5 rounded-lg transition-all text-xs font-bold" title="แจ้งเตือนให้คืนอุปกรณ์">
                            🔔
                        </button>
                        <button onclick="window.openPenaltyModal('${tr.borrower_name}', '${tr.borrower_name}', ${tr.equipment_id}, '${tr.equipments?.name || 'Unknown'}', ${tr.id})" class="text-red-500 hover:text-white hover:bg-red-500 border border-red-500 px-3 py-1.5 rounded-lg transition-all text-xs font-bold" title="รายงานปัญหา">
                            ⚠️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

window.triggerReminder = async function (transactionId) {
    const transaction = window._returnTransactions?.find(t => t.id === transactionId);
    if (!transaction) return;

    // Calculate days until due
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = transaction.end_date ? new Date(transaction.end_date) : new Date(new Date(transaction.borrow_date).getTime() + 86400000);
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    // Positive if future, negative if overdue
    const daysUntilDue = Math.ceil((endDay - today) / (1000 * 60 * 60 * 24));

    const formattedTransaction = {
        borrower: transaction.borrower_name,
        equipment_name: transaction.equipments?.name || 'Unknown',
        return_date: endDate.toISOString()
    };

    window.showToast?.('กำลังส่งการแจ้งเตือน...', 'info');
    const success = await window.sendReminderEmail(formattedTransaction, daysUntilDue);

    if (success) {
        window.showToast?.('ส่งการแจ้งเตือนสำเร็จ', 'success');
    } else {
        window.showToast?.('ไม่สามารถส่งการแจ้งเตือนได้ โปรดตรวจสอบการตั้งค่า EmailJS', 'error');
    }
};

// Render user's borrowed items
window.renderMyBorrowings = function (transactions) {
    const grid = document.getElementById('myBorrowingsGrid');
    const emptyState = document.getElementById('myBorrowingsEmpty');
    const t = window.translations[window.currentLang];

    if (!transactions || transactions.length === 0) {
        grid.innerHTML = '';
        grid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    grid.classList.remove('hidden');
    emptyState.classList.add('hidden');

    grid.innerHTML = transactions.map(tr => {
        const borrowDate = new Date(tr.borrow_date).toLocaleDateString(window.currentLang === 'th' ? 'th-TH' : 'en-US', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        const endDate = tr.end_date ? new Date(tr.end_date) : null;
        let dueDateText = '';
        let isOverdue = false;
        let statusBadge = '';

        if (endDate) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            isOverdue = today > endDay;

            dueDateText = endDate.toLocaleDateString(window.currentLang === 'th' ? 'th-TH' : 'en-US', {
                day: 'numeric', month: 'short'
            });

            if (isOverdue) {
                statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">${t.overdue}</span>`;
            } else {
                // Calculate days remaining
                const daysRemaining = Math.ceil((endDay - today) / (1000 * 60 * 60 * 24));
                if (daysRemaining <= 2) {
                    statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">${daysRemaining} ${t.daysRemaining}</span>`;
                } else {
                    statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-600">${daysRemaining} ${t.daysRemaining}</span>`;
                }
            }
        }

        return `
            <div class="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all dark:bg-gray-800 dark:border-gray-700 ${isOverdue ? 'border-l-4 border-l-red-500' : ''}">
                <div class="flex gap-4">
                    <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img src="${tr.equipments?.image_url || ''}" alt="${tr.equipments?.name || 'Equipment'}" 
                            loading="lazy" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-brand-pink uppercase mb-1">${tr.equipments?.type || ''}</p>
                        <h3 class="font-bold text-brand-black dark:text-white truncate">${tr.equipments?.name || 'Unknown'}</h3>
                        <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span>${t.borrowedOn}: ${borrowDate}</span>
                        </div>
                    </div>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div class="text-xs text-gray-500">
                        ${dueDateText ? `<span class="font-medium">${t.dueDate}: ${dueDateText}</span>` : ''}
                    </div>
                    ${statusBadge}
                </div>
            </div>
        `;
    }).join('');
};

window.showMainApp = function () {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');

    // Update user avatar + dropdown info
    const userAvatar = document.getElementById('userAvatar');
    const menuUserDisplay = document.getElementById('menuUserDisplay');
    const menuRoleBadge = document.getElementById('menuRoleBadge');

    if (userAvatar) {
        userAvatar.textContent = window.currentUser.username.charAt(0).toUpperCase();
    }
    if (menuUserDisplay) {
        menuUserDisplay.textContent = window.currentUser.username;
    }
    if (menuRoleBadge) {
        menuRoleBadge.textContent = window.currentUser.role;
    }

    // Dropdown menu items (mobile)
    const mobileAddBtn = document.getElementById('mobileAddBtn');
    const dropdownDashboardBtn = document.getElementById('dropdownDashboardBtn');
    const mobilePendingBtn = document.getElementById('mobilePendingBtn');
    const mobileUserMgmtBtn = document.getElementById('mobileUserMgmtBtn');
    const mobileHistoryBtn = document.getElementById('mobileHistoryBtn');

    if (window.currentUser.role === 'admin') {
        // Show admin items in dropdown (mobile)
        if (mobileAddBtn) mobileAddBtn.classList.remove('hidden');
        if (dropdownDashboardBtn) dropdownDashboardBtn.classList.remove('hidden');
        if (mobilePendingBtn) mobilePendingBtn.classList.remove('hidden');
        if (mobileUserMgmtBtn) mobileUserMgmtBtn.classList.remove('hidden');

        // Show notification bell (desktop md+)
        const pendingBtn = document.getElementById('pendingRequestsBtn');
        if (pendingBtn) {
            pendingBtn.classList.remove('hidden');
            pendingBtn.classList.add('hidden', 'md:flex');
        }

        // Show Add Equipment CTA (desktop md+)
        const addBtn = document.getElementById('addBtn');
        if (addBtn) {
            addBtn.classList.remove('hidden');
            addBtn.classList.add('hidden', 'md:block');
        }

        // Admin: rename "my items" to "returns"
        const myItemsBtn = document.getElementById('btn-my-items');
        if (myItemsBtn) {
            myItemsBtn.setAttribute('onclick', "filterStatus('returns')");
            myItemsBtn.setAttribute('data-i18n', 'returns');
            myItemsBtn.textContent = window.translations[window.currentLang].returns;
            myItemsBtn.id = 'btn-returns';
        }
    } else {
        // NOT admin — hide all admin items
        if (mobileAddBtn) mobileAddBtn.classList.add('hidden');
        if (dropdownDashboardBtn) dropdownDashboardBtn.classList.add('hidden');
        if (mobilePendingBtn) mobilePendingBtn.classList.add('hidden');
        if (mobileUserMgmtBtn) mobileUserMgmtBtn.classList.add('hidden');
        const pendingBtn = document.getElementById('pendingRequestsBtn');
        if (pendingBtn) {
            pendingBtn.classList.add('hidden');
            pendingBtn.classList.remove('md:flex');
        }
        const addBtn = document.getElementById('addBtn');
        if (addBtn) {
            addBtn.classList.add('hidden');
            addBtn.classList.remove('md:block');
        }

        const returnsBtn = document.getElementById('btn-returns');
        if (returnsBtn) {
            returnsBtn.setAttribute('onclick', "filterStatus('my-items')");
            returnsBtn.setAttribute('data-i18n', 'myItems');
            returnsBtn.textContent = window.translations[window.currentLang].myItems;
            returnsBtn.id = 'btn-my-items';
        }
    }

    // Show cart button (visible on ALL screen sizes)
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.classList.remove('hidden');
        window.cart?.load();
    }

    // Show history text nav link (all users)
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.classList.remove('hidden');
    }
    if (mobileHistoryBtn) mobileHistoryBtn.classList.remove('hidden');

    // Initialize pending badge for admin
    window.initPendingBadge?.();

    window.fetchEquipments();
};

window.toggleLanguage = function () {
    window.currentLang = window.currentLang === 'th' ? 'en' : 'th';
    document.getElementById('langDisplay').textContent = window.currentLang.toUpperCase();
    window.updateTranslations();
    window.renderEquipments();
    // Re-render return table if visible
    if (!document.getElementById('returnSection').classList.contains('hidden')) {
        window.fetchReturnData();
    }
    if (!document.getElementById('overviewSection').classList.contains('hidden')) {
        window.fetchOverviewData();
    }
    // Re-render My Borrowings if visible
    if (!document.getElementById('myBorrowingsSection').classList.contains('hidden')) {
        window.fetchMyBorrowings();
    }
};

window.updateTranslations = function () {
    const t = window.translations[window.currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    document.getElementById('searchInput').placeholder = t.searchPlaceholder;

    // Update textarea placeholder
    const noteArea = document.getElementById('requestNote');
    if (noteArea) noteArea.placeholder = t.notePlaceholder;

};

window.toggleTheme = function () {
    window.isDark = !window.isDark;
    const html = document.documentElement;
    const icon = document.getElementById('themeIcon');

    if (window.isDark) {
        html.classList.add('dark');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />';
    } else {
        html.classList.remove('dark');
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
    }
    localStorage.setItem('theme', window.isDark ? 'dark' : 'light');
};

window.initTheme = function () {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.getElementById('themeIcon');

    if (savedTheme === 'dark') {
        window.isDark = true;
        document.documentElement.classList.add('dark');
        if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />';
    } else {
        window.isDark = false;
        document.documentElement.classList.remove('dark');
        // Set moon icon for light mode
        if (icon) icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
    }
};

window.showToast = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    // REDESIGN: Toast
    let borderClass = type === 'success' ? 'border-l-4 border-green-500' : (type === 'error' ? 'border-l-4 border-brand-pink' : 'border-l-4 border-brand-yellow');

    toast.className = `bg-white dark:bg-gray-800 rounded-r-lg shadow-xl p-4 flex items-center gap-3 transform transition-all duration-300 translate-y-2 opacity-0 w-80 ${borderClass}`;

    let icon = '';
    if (type === 'success') icon = '<div class="w-6 h-6 rounded-full bg-green-100 text-green-500 flex items-center justify-center flex-shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>';
    else if (type === 'error') icon = '<div class="w-6 h-6 rounded-full bg-pink-100 text-brand-pink flex items-center justify-center flex-shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>';
    else icon = '<div class="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center flex-shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>';

    toast.innerHTML = `
        ${icon}
        <div class="flex-1">
            <p class="text-sm font-semibold text-brand-black dark:text-gray-100">${message}</p>
        </div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => { toast.classList.remove('translate-y-2', 'opacity-0'); });
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.filterStatus = function (status) {
    window.currentFilter = status;

    // Reset all buttons to inactive state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-gradient-to-r', 'from-brand-black', 'to-gray-800', 'text-brand-yellow', 'shadow-lg', 'shadow-gray-900/20');
        btn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300');
    });

    // Set active button
    const activeId = status === 'returns' ? 'btn-returns' : (status === 'my-items' ? 'btn-my-items' : `btn-${status}`);
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300');
        activeBtn.classList.add('bg-gradient-to-r', 'from-brand-black', 'to-gray-800', 'text-brand-yellow', 'shadow-lg', 'shadow-gray-900/20');
    }

    const browse = document.getElementById('browseSection');
    const returnSection = document.getElementById('returnSection');
    const overview = document.getElementById('overviewSection');
    const controls = document.getElementById('controlsSection');
    const myBorrowingsSection = document.getElementById('myBorrowingsSection');
    const historySection = document.getElementById('historySection');

    controls.classList.remove('hidden');
    overview.classList.add('hidden');
    if (historySection) historySection.classList.add('hidden');

    // Reset history button text
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) historyBtn.textContent = window.translations[window.currentLang]?.history || 'History';

    if (status === 'returns') {
        browse.classList.add('hidden');
        returnSection.classList.remove('hidden');
        myBorrowingsSection.classList.add('hidden');
        window.fetchReturnData();
    } else if (status === 'my-items') {
        browse.classList.add('hidden');
        returnSection.classList.add('hidden');
        myBorrowingsSection.classList.remove('hidden');
        window.fetchMyBorrowings();
    } else {
        returnSection.classList.add('hidden');
        myBorrowingsSection.classList.add('hidden');
        browse.classList.remove('hidden');
        window.fetchEquipments();
    }
};

// Category filter function
window.filterByCategory = function (category) {
    window.currentCategory = category;
    window.renderEquipments();
};

window.toggleOverview = function () {
    const browse = document.getElementById('browseSection');
    const overview = document.getElementById('overviewSection');
    const controls = document.getElementById('controlsSection');
    const returnSection = document.getElementById('returnSection');
    const myBorrowingsSection = document.getElementById('myBorrowingsSection');
    const historySection = document.getElementById('historySection');
    const t = window.translations[window.currentLang];

    // Reset history button text
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) historyBtn.textContent = t?.history || 'History';

    if (overview.classList.contains('hidden')) {
        browse.classList.add('hidden');
        controls.classList.add('hidden');
        returnSection.classList.add('hidden');
        myBorrowingsSection.classList.add('hidden');
        if (historySection) historySection.classList.add('hidden');
        overview.classList.remove('hidden');

        // Fetch dashboard data + start auto-refresh
        window.fetchDashboardData();
        window.setupDashboardRefresh?.();
    } else {
        overview.classList.add('hidden');
        controls.classList.remove('hidden');

        // Stop auto-refresh
        window.stopDashboardRefresh?.();

        if (window.currentFilter === 'returns') {
            returnSection.classList.remove('hidden');
            window.fetchReturnData();
        } else if (window.currentFilter === 'my-items') {
            myBorrowingsSection.classList.remove('hidden');
            window.fetchMyBorrowings();
        } else {
            browse.classList.remove('hidden');
            window.fetchEquipments();
        }
    }
};

// --- Borrowing History ---

window.toggleHistoryPage = function () {
    const browse = document.getElementById('browseSection');
    const overview = document.getElementById('overviewSection');
    const controls = document.getElementById('controlsSection');
    const returnSection = document.getElementById('returnSection');
    const myBorrowingsSection = document.getElementById('myBorrowingsSection');
    const historySection = document.getElementById('historySection');
    const historyBtn = document.getElementById('historyBtn');
    const t = window.translations[window.currentLang];

    if (historySection.classList.contains('hidden')) {
        // Show history
        browse.classList.add('hidden');
        controls.classList.add('hidden');
        returnSection.classList.add('hidden');
        myBorrowingsSection.classList.add('hidden');
        overview.classList.add('hidden');
        historySection.classList.remove('hidden');
        if (historyBtn) historyBtn.textContent = t?.backToBrowse || 'Back';
        window.fetchBorrowingHistory();
    } else {
        // Hide history, go back
        historySection.classList.add('hidden');
        controls.classList.remove('hidden');
        if (historyBtn) historyBtn.textContent = t?.history || 'History';
        if (window.currentFilter === 'returns') {
            returnSection.classList.remove('hidden');
            window.fetchReturnData();
        } else if (window.currentFilter === 'my-items') {
            myBorrowingsSection.classList.remove('hidden');
            window.fetchMyBorrowings();
        } else {
            browse.classList.remove('hidden');
            window.fetchEquipments();
        }
    }
};

window.renderHistoryTable = function () {
    const tbody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('historyEmpty');
    const pagination = document.getElementById('historyPagination');
    const data = window._historyData || [];
    const page = window._historyPage || 1;
    const perPage = window._historyPerPage || 30;
    const t = window.translations[window.currentLang];
    const locale = window.currentLang === 'th' ? 'th-TH' : 'en-US';
    const now = new Date();

    if (data.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        if (pagination) pagination.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    // Pagination
    const totalPages = Math.ceil(data.length / perPage);
    const start = (page - 1) * perPage;
    const end = Math.min(start + perPage, data.length);
    const pageData = data.slice(start, end);

    const dateOpts = { day: 'numeric', month: 'short', year: '2-digit' };

    tbody.innerHTML = pageData.map(tr => {
        const borrowDate = tr.borrow_date
            ? new Date(tr.borrow_date).toLocaleDateString(locale, dateOpts)
            : '-';
        const dueDate = tr.end_date
            ? new Date(tr.end_date).toLocaleDateString(locale, dateOpts)
            : '-';
        const returnDate = tr.return_date
            ? new Date(tr.return_date).toLocaleDateString(locale, dateOpts)
            : '-';

        // Determine status badge
        let statusBadge;
        if (tr.status === 'returned') {
            // Check if returned late
            const wasLate = tr.end_date && tr.return_date && new Date(tr.return_date) > new Date(tr.end_date);
            if (wasLate) {
                statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">${t?.overdueStatus || 'Late'} ✓</span>`;
            } else {
                statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">${t?.returnedStatus || 'Returned'}</span>`;
            }
        } else {
            const isOverdue = tr.end_date && new Date(tr.end_date) < now;
            if (isOverdue) {
                statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">${t?.overdueStatus || 'Overdue'}</span>`;
            } else {
                statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">${t?.activeStatus || 'Active'}</span>`;
            }
        }

        return `
            <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td class="px-4 md:px-6 py-3 font-medium text-brand-black dark:text-white">${window.escapeHtml?.(tr.equipments?.name) || tr.equipments?.name || 'Unknown'}</td>
                <td class="px-4 md:px-6 py-3">${window.escapeHtml?.(tr.borrower_name) || tr.borrower_name}</td>
                <td class="px-4 md:px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">${borrowDate}</td>
                <td class="px-4 md:px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">${dueDate}</td>
                <td class="px-4 md:px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">${returnDate}</td>
                <td class="px-4 md:px-6 py-3">${statusBadge}</td>
            </tr>
        `;
    }).join('');

    // Update pagination
    if (pagination) {
        pagination.classList.remove('hidden');
        const pageInfo = document.getElementById('historyPageInfo');
        if (pageInfo) pageInfo.textContent = `${t?.showing || 'Showing'} ${start + 1}-${end} ${t?.of || 'of'} ${data.length} ${t?.records || 'records'}`;
        const prevBtn = document.getElementById('historyPrevBtn');
        const nextBtn = document.getElementById('historyNextBtn');
        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) nextBtn.disabled = page >= totalPages;
    }
};

window.changeHistoryPage = function (delta) {
    const totalPages = Math.ceil((window._historyData || []).length / (window._historyPerPage || 30));
    const newPage = (window._historyPage || 1) + delta;
    if (newPage < 1 || newPage > totalPages) return;
    window._historyPage = newPage;
    window.renderHistoryTable();
};

window.applyHistoryFilters = function () {
    const filters = {
        equipment: document.getElementById('historySearchEquipment')?.value?.trim() || '',
        borrower: document.getElementById('historySearchBorrower')?.value?.trim() || '',
        status: document.getElementById('historyStatusFilter')?.value || 'all',
        dateFrom: document.getElementById('historyDateFrom')?.value || '',
        dateTo: document.getElementById('historyDateTo')?.value || ''
    };
    window.fetchBorrowingHistory(filters);
};

window.exportHistoryCSV = function () {
    const data = window._historyData || [];
    if (data.length === 0) return;

    const header = ['Equipment', 'Borrower', 'Borrow Date', 'Due Date', 'Return Date', 'Status'];
    const rows = data.map(tr => [
        (tr.equipments?.name || 'Unknown').replace(/,/g, ' '),
        (tr.borrower_name || '').replace(/,/g, ' '),
        tr.borrow_date ? new Date(tr.borrow_date).toISOString().split('T')[0] : '',
        tr.end_date ? new Date(tr.end_date).toISOString().split('T')[0] : '',
        tr.return_date ? new Date(tr.return_date).toISOString().split('T')[0] : '',
        tr.status || ''
    ]);

    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `borrowing_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// --- Analytics Charts ---

// Store chart instances for cleanup
window.chartInstances = {};

// Render weekly borrowings line chart
window.renderWeeklyChart = function (data) {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;

    // Destroy existing chart
    if (window.chartInstances.weekly) {
        window.chartInstances.weekly.destroy();
    }

    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');

    window.chartInstances.weekly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.day),
            datasets: [{
                label: 'จำนวนยืม',
                data: data.map(d => d.count),
                borderColor: '#FFD100',
                backgroundColor: 'rgba(255, 209, 0, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#FFD100',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: isDark ? '#9CA3AF' : '#6B7280'
                    },
                    grid: {
                        color: isDark ? '#374151' : '#E5E7EB'
                    }
                },
                x: {
                    ticks: {
                        color: isDark ? '#9CA3AF' : '#6B7280'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
};

// Render top equipment bar chart
window.renderTopEquipmentChart = function (data) {
    const canvas = document.getElementById('topEquipmentChart');
    if (!canvas) return;

    // Destroy existing chart
    if (window.chartInstances.topEquipment) {
        window.chartInstances.topEquipment.destroy();
    }

    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');

    // Truncate long names
    const labels = data.map(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);

    window.chartInstances.topEquipment = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวนครั้ง',
                data: data.map(d => d.count),
                backgroundColor: [
                    '#FF4191',
                    '#FFD100',
                    '#E90074',
                    '#58595B',
                    '#9CA3AF'
                ],
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: isDark ? '#9CA3AF' : '#6B7280'
                    },
                    grid: {
                        color: isDark ? '#374151' : '#E5E7EB'
                    }
                },
                y: {
                    ticks: {
                        color: isDark ? '#9CA3AF' : '#6B7280'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
};

// Render top borrowers list
window.renderTopBorrowersList = function (data) {
    const container = document.getElementById('topBorrowersList');
    if (!container) return;

    if (!data || data.length === 0) {
        const t = window.translations[window.currentLang];
        container.innerHTML = `<p class="text-gray-400 text-center py-4">${t.noBorrowingData}</p>`;
        return;
    }

    const maxCount = data[0]?.count || 1;
    const badgeColors = [
        'bg-yellow-500 text-white',  // 1st - gold
        'bg-gray-400 text-white',     // 2nd - silver
        'bg-amber-600 text-white',    // 3rd - bronze
        'bg-gray-300 text-gray-700',  // 4th
        'bg-gray-200 text-gray-600'   // 5th
    ];

    const t = window.translations[window.currentLang];

    container.innerHTML = data.map((item, index) => {
        const percentage = Math.round((item.count / maxCount) * 100);
        const badgeColor = badgeColors[index] || 'bg-gray-200 text-gray-600';

        return `
            <div class="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors duration-150 cursor-pointer">
                <span class="w-6 h-6 rounded-full ${badgeColor} flex items-center justify-center text-xs font-bold">${index + 1}</span>
                <div class="flex-1">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-medium text-gray-900 dark:text-white">${item.name}</span>
                        <span class="text-sm text-gray-500 dark:text-gray-400">${item.count} ${t.times}</span>
                    </div>
                    <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-brand-pink to-brand-magenta rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

// Utils & Modals

// Generate skeleton cards HTML
window.generateSkeletonCards = function (count = 8) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += `
        <div class="skeleton-card">
            <div class="skeleton h-48 w-full" style="border-radius: 0;"></div>
            <div class="p-5">
                <div class="skeleton h-3 w-16 mb-2"></div>
                <div class="skeleton h-5 w-3/4 mb-4"></div>
                <div class="skeleton h-10 w-full rounded-lg"></div>
            </div>
        </div>`;
    }
    return skeletons;
};

// Show skeleton loading state
window.showSkeletonLoading = function () {
    const grid = document.getElementById('equipmentGrid');
    if (grid) {
        grid.innerHTML = window.generateSkeletonCards(8);
    }
};

// Show skeleton for return table
window.showTableSkeletonLoading = function () {
    const tbody = document.getElementById('returnTableBody');
    if (tbody) {
        let rows = '';
        for (let i = 0; i < 5; i++) {
            rows += `
            <tr class="border-b border-gray-100 dark:border-gray-700">
                <td class="px-6 py-4"><div class="skeleton h-4 w-32"></div></td>
                <td class="px-6 py-4"><div class="skeleton h-4 w-24"></div></td>
                <td class="px-6 py-4"><div class="skeleton h-4 w-28"></div></td>
                <td class="px-6 py-4"><div class="skeleton h-6 w-16 rounded-full"></div></td>
                <td class="px-6 py-4"><div class="skeleton h-8 w-20 rounded-lg"></div></td>
            </tr>`;
        }
        tbody.innerHTML = rows;
    }
};

// Global loading overlay (for modals/actions)
window.setLoading = function (isLoading) {
    // Could add a global overlay spinner if needed
    if (isLoading) {
        console.log('Loading started...');
    } else {
        console.log('Loading finished.');
    }
};

window.openModal = function (id) {
    const el = document.getElementById(id);
    el.classList.remove('hidden');
    const content = el.querySelector('div');
    content.classList.remove('scale-95', 'opacity-0');
    content.classList.add('scale-100', 'opacity-100');
};

window.closeModal = function (id) {
    document.getElementById(id).classList.add('hidden');
};

window.openBorrowModal = function (id, name) {
    document.getElementById('borrowItemId').value = id;
    document.getElementById('borrowItemName').textContent = name;
    document.getElementById('borrowerDisplay').textContent = window.currentUser ? window.currentUser.username : 'Guest';
    window.openModal('borrowModal');
};

// --- Booking Calendar Functions ---

// Store flatpickr instance for cleanup
window.detailCalendarInstance = null;

// Open Equipment Detail Modal with Calendar
window.openEquipmentDetail = async function (equipmentId) {
    const equipment = window.equipments.find(e => e.id == equipmentId);
    if (!equipment) {
        window.showToast('ไม่พบข้อมูลอุปกรณ์', 'error');
        return;
    }

    // Populate modal
    document.getElementById('detailEquipmentImage').src = equipment.image_url;
    document.getElementById('detailEquipmentName').textContent = equipment.name;
    document.getElementById('detailEquipmentType').textContent = equipment.type;
    document.getElementById('detailEquipmentId').value = equipmentId;

    // Get dates from top filter
    const filterStartDate = document.getElementById('startDate')?.value;
    const filterEndDate = document.getElementById('endDate')?.value;

    // Set dates from filter to detail inputs
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    const lang = window.currentLang === 'th' ? 'th-TH' : 'en-US';

    if (filterStartDate) {
        const startD = new Date(filterStartDate);
        document.getElementById('detailStartDate').textContent = startD.toLocaleDateString(lang, options);
    } else {
        document.getElementById('detailStartDate').textContent = '-';
    }

    if (filterEndDate) {
        const endD = new Date(filterEndDate);
        document.getElementById('detailEndDate').textContent = endD.toLocaleDateString(lang, options);
    } else {
        document.getElementById('detailEndDate').textContent = '-';
    }

    // Calculate and display duration
    if (filterStartDate && filterEndDate) {
        const start = new Date(filterStartDate);
        const end = new Date(filterEndDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both days
        const dayText = window.translations[window.currentLang]?.days || 'days';
        document.getElementById('detailDuration').textContent = `${diffDays} ${dayText}`;
    } else {
        document.getElementById('detailDuration').textContent = '-';
    }

    // Show modal first
    window.openModal('equipmentDetailModal');

    // Then init calendar with booked dates and pre-selected dates from filter
    const bookedDates = await window.getBookedDatesForEquipment(equipmentId);
    window.initDetailCalendar(bookedDates, filterStartDate, filterEndDate);
};

// Initialize flatpickr calendar for Equipment Detail
window.initDetailCalendar = function (bookedDates = [], filterStartDate = null, filterEndDate = null) {
    // Destroy existing instance
    if (window.detailCalendarInstance) {
        window.detailCalendarInstance.destroy();
    }

    const container = document.getElementById('detailCalendar');
    if (!container) return;

    // Create inline calendar input
    container.innerHTML = '<input type="text" id="detailCalendarInput" class="hidden">';
    const input = document.getElementById('detailCalendarInput');

    const isDark = document.documentElement.classList.contains('dark');
    const locale = window.currentLang === 'th' ? 'th' : 'default';

    // Build default dates array from filter
    let defaultDates = [];
    if (filterStartDate && filterEndDate) {
        defaultDates = [filterStartDate, filterEndDate];
    } else if (filterStartDate) {
        defaultDates = [filterStartDate];
    }

    window.detailCalendarInstance = flatpickr(input, {
        mode: 'range',
        inline: true,
        minDate: 'today',
        dateFormat: 'Y-m-d',
        locale: locale,
        disable: bookedDates.map(d => d),
        disableMobile: true,
        defaultDate: defaultDates.length > 0 ? defaultDates : null,
        onChange: function (selectedDates, dateStr) {
            if (selectedDates.length === 2) {
                const startDate = selectedDates[0];
                const endDate = selectedDates[1];

                const options = { day: 'numeric', month: 'short', year: 'numeric' };
                const lang = window.currentLang === 'th' ? 'th-TH' : 'en-US';

                document.getElementById('detailStartDate').textContent = startDate.toLocaleDateString(lang, options);
                document.getElementById('detailEndDate').textContent = endDate.toLocaleDateString(lang, options);

                // Calculate and display duration
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                const dayText = window.translations[window.currentLang]?.days || 'days';
                document.getElementById('detailDuration').textContent = `${diffDays} ${dayText}`;

                // Also update main date inputs for confirmBorrow
                const startInput = document.getElementById('startDate');
                const endInput = document.getElementById('endDate');
                if (startInput && endInput) {
                    startInput.value = startDate.toISOString().split('T')[0];
                    endInput.value = endDate.toISOString().split('T')[0];
                }
            } else if (selectedDates.length === 1) {
                const options = { day: 'numeric', month: 'short', year: 'numeric' };
                const lang = window.currentLang === 'th' ? 'th-TH' : 'en-US';
                document.getElementById('detailStartDate').textContent = selectedDates[0].toLocaleDateString(lang, options);
                document.getElementById('detailEndDate').textContent = '-';
                document.getElementById('detailDuration').textContent = '-';
            }
        },
        onDayCreate: function (dObj, dStr, fp, dayElem) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dayDate = dayElem.dateObj;
            const isDisabled = dayElem.classList.contains('flatpickr-disabled');
            const isPrevMonth = dayElem.classList.contains('prevMonthDay');
            const isNextMonth = dayElem.classList.contains('nextMonthDay');
            const isPast = dayDate && dayDate < today;

            // Reset default styles
            dayElem.style.borderRadius = '8px';
            dayElem.style.margin = '2px';
            dayElem.style.position = 'relative';

            // Style: Booked dates (disabled) - Yellow with X icon
            if (isDisabled && !isPrevMonth && !isNextMonth) {
                dayElem.style.backgroundColor = '#f59e0b'; // amber-500
                dayElem.style.color = 'white';
                dayElem.innerHTML = `<span class="day-content">${dayElem.textContent}</span>
                    <span class="day-icon" style="position:absolute;top:2px;right:2px;font-size:8px;">⊘</span>`;
                dayElem.title = window.translations[window.currentLang].booked || 'ถูกจองแล้ว';
            }
            // Style: Past dates - Gray
            else if (isPast && !isPrevMonth && !isNextMonth) {
                dayElem.style.backgroundColor = '#d1d5db'; // gray-300
                dayElem.style.color = '#6b7280'; // gray-500
            }
            // Style: Available future dates - Green with checkmark
            else if (!isDisabled && !isPrevMonth && !isNextMonth && dayDate && dayDate >= today) {
                dayElem.style.backgroundColor = '#22c55e'; // green-500
                dayElem.style.color = 'white';
                dayElem.innerHTML = `<span class="day-content">${dayElem.textContent}</span>
                    <span class="day-icon" style="position:absolute;top:2px;right:2px;font-size:8px;">✓</span>`;
            }
            // Style: Other month days - Light gray
            else if (isPrevMonth || isNextMonth) {
                dayElem.style.backgroundColor = 'transparent';
                dayElem.style.color = '#9ca3af'; // gray-400
            }
        }
    });
};

// Add to cart from Equipment Detail Modal
window.addToCartFromDetail = function () {
    const equipmentId = document.getElementById('detailEquipmentId').value;
    const t = window.translations[window.currentLang];

    // Find the equipment
    const equipment = window.equipments.find(e => e.id == equipmentId);
    if (!equipment) {
        window.showToast(t.equipmentNotFound || 'ไม่พบอุปกรณ์', 'error');
        return;
    }

    // Count available units for this equipment name
    const availableCount = window.equipments.filter(
        e => e.name === equipment.name && e.status === 'available'
    ).length;

    if (availableCount === 0) {
        window.showToast(t.outOfStock || 'ของหมด', 'error');
        return;
    }

    // Check current cart quantity for this item
    const cartItem = window.cart?.getByName(equipment.name);
    const currentQty = cartItem ? cartItem.quantity : 0;
    const newQty = currentQty + 1;

    if (newQty > availableCount) {
        window.showToast(`${equipment.name}: ${t.outOfStock} (${availableCount} ${t.available})`, 'warning');
        return;
    }

    // Add/update cart
    window.cart.addOrUpdate(equipment.name, equipment.image_url, equipment.type, newQty);

    // Close detail modal
    window.closeModal('equipmentDetailModal');
};

window.openReturnModal = function (id, name) {
    document.getElementById('returnItemId').value = id;
    document.getElementById('returnItemName').textContent = name;
    window.openModal('returnModal');
};

window.openManageModal = function (groupName = null) {
    const t = window.translations[window.currentLang];
    const nameInput = document.getElementById('manageName');
    const typeInput = document.getElementById('manageType');
    const imageInput = document.getElementById('manageImage');
    const qtyGroup = document.getElementById('manageQuantityGroup');
    const qtyLabel = document.getElementById('manageQuantityLabel');
    const qtyHint = document.getElementById('manageQuantityHint');

    if (groupName) {
        // Find all items with this name to get total count
        const itemsWithName = window.equipments.filter(e => e.name === groupName);
        const totalCount = itemsWithName.length;
        const firstItem = itemsWithName[0];
        if (!firstItem) return;

        document.getElementById('manageModalTitle').textContent = t.edit + ' ' + groupName;
        nameInput.value = firstItem.name;
        typeInput.value = firstItem.type;
        imageInput.value = firstItem.image_url;
        document.getElementById('manageOriginalName').value = groupName;

        // Show quantity for editing
        document.getElementById('manageQuantity').value = totalCount;
        if (qtyLabel) qtyLabel.textContent = 'จำนวนทั้งหมด (Total Quantity)';
        if (qtyHint) qtyHint.textContent = `ปัจจุบันมี ${totalCount} ชิ้น - ปรับเพิ่ม/ลดได้`;
        qtyGroup.classList.remove('hidden');
    } else {
        document.getElementById('manageModalTitle').textContent = t.addEquipment;
        nameInput.value = '';
        typeInput.value = 'Camera';
        imageInput.value = '';
        document.getElementById('manageQuantity').value = 1;
        document.getElementById('manageOriginalName').value = '';
        if (qtyLabel) qtyLabel.textContent = 'Quantity';
        if (qtyHint) qtyHint.textContent = 'Creates multiple items with the same name';
        qtyGroup.classList.remove('hidden');
    }
    window.openModal('manageModal');
};

// Date Init
window.initDates = function () {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const format = (d) => d.toISOString().slice(0, 10);
    document.getElementById('startDate').value = format(now);
    document.getElementById('endDate').value = format(tomorrow);
    document.getElementById('startDate').addEventListener('change', window.fetchEquipments);
    document.getElementById('endDate').addEventListener('change', window.fetchEquipments);

    // Search input with debounce
    let searchTimeout;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                window.renderEquipments();
            }, 300); // 300ms debounce
        });
    }
};

// User Menu Functions (unified for desktop + mobile)
window.toggleUserMenu = function () {
    const dropdown = document.getElementById('userMenuDropdown');
    const arrow = document.getElementById('userMenuArrow');

    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        dropdown.classList.add('hidden');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
};

window.closeUserMenu = function () {
    const dropdown = document.getElementById('userMenuDropdown');
    const arrow = document.getElementById('userMenuArrow');

    if (dropdown) dropdown.classList.add('hidden');
    if (arrow) arrow.style.transform = 'rotate(0deg)';
};

// Backward compatibility aliases
window.toggleMobileMenu = window.toggleUserMenu;
window.closeMobileMenu = window.closeUserMenu;

// Close user menu when clicking outside
document.addEventListener('click', function (e) {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenuDropdown = document.getElementById('userMenuDropdown');

    if (userMenuBtn && userMenuDropdown) {
        if (!userMenuBtn.contains(e.target) && !userMenuDropdown.contains(e.target)) {
            window.closeUserMenu();
        }
    }
});

// --- User Management Functions ---

window.allUsers = [];

window.openUserManagementModal = async function () {
    const modal = document.getElementById('userManagementModal');
    const usersList = document.getElementById('usersList');

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    // Show loading
    usersList.innerHTML = '<div class="text-center py-8 text-gray-400">กำลังโหลด...</div>';

    // Fetch users
    window.allUsers = await window.fetchAllUsers();
    window.renderUsersList(window.allUsers);
};

window.closeUserManagementModal = function () {
    const modal = document.getElementById('userManagementModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.renderUsersList = function (users) {
    const usersList = document.getElementById('usersList');

    if (!users || users.length === 0) {
        usersList.innerHTML = `
            <div class="col-span-full text-center py-10">
                <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 text-2xl">🔍</div>
                <p class="text-gray-500 dark:text-gray-400 font-medium pb-2">ไม่พบผู้ใช้ที่ค้นหา</p>
            </div>
        `;
        return;
    }

    usersList.innerHTML = users.map(user => {
        const isAdmin = user.role === 'admin';
        return `
            <div onclick="window.openUserDetailsModal(${user.id})"
                class="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center group">
                <div class="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xl font-bold font-heading shadow-md mb-3 group-hover:scale-110 transition-transform">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <p class="font-bold text-gray-900 dark:text-white mb-1 truncate w-full px-2">${user.username}</p>
                <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full ${isAdmin ? 'bg-purple-500' : 'bg-gray-400'}"></div>
                    <p class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">${user.role}</p>
                </div>
            </div>
        `;
    }).join('');
};

window.filterUsers = function (query) {
    const filtered = window.allUsers.filter(user =>
        user.username.toLowerCase().includes(query.toLowerCase())
    );
    window.renderUsersList(filtered);
};

window.currentSelectedUser = null;

window.openUserDetailsModal = async function (userId) {
    const user = window.allUsers.find(u => u.id === userId);
    if (!user) return;

    window.currentSelectedUser = user;

    // Elements
    const modal = document.getElementById('userDetailsModal');
    const avatar = document.getElementById('detailUserAvatar');
    const roleBadge = document.getElementById('detailUserRole');
    const nameText = document.getElementById('detailUserName');
    const strikesText = document.getElementById('detailUserStrikes');
    const lastActiveText = document.getElementById('detailUserLastActive');
    const lastItemText = document.getElementById('detailUserLastItem');
    const toggleBtn = document.getElementById('toggleRoleBtn');

    // Populate static
    avatar.textContent = user.username.charAt(0).toUpperCase();
    nameText.textContent = user.username;
    strikesText.textContent = user.total_strikes || 0;

    const isAdmin = user.role === 'admin';
    roleBadge.textContent = isAdmin ? 'Admin Admin' : 'User';
    roleBadge.className = `px-3 py-1 text-xs font-bold rounded-full ${isAdmin ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`;

    toggleBtn.textContent = isAdmin ? 'ปรับลดสิทธิ์เป็น User' : 'เลื่อนขั้นเป็น Admin';
    toggleBtn.className = `w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm ${isAdmin ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'}`;
    toggleBtn.onclick = () => window.toggleUserRole(user.id, user.role);

    // Initial loading state for dynamic data
    lastActiveText.textContent = 'กำลังตรวจสอบ...';
    lastItemText.textContent = 'กำลังตรวจสอบ...';
    lastActiveText.classList.add('animate-pulse');
    lastItemText.classList.add('animate-pulse');

    // Show modal
    modal.classList.remove('hidden');

    // Fetch latest transaction
    try {
        const { data: trans, error } = await window.supabaseClient
            .from('transactions')
            .select(`
                borrow_date,
                equipments ( name )
            `)
            .eq('borrower_name', user.username)
            .order('borrow_date', { ascending: false })
            .limit(1);

        lastActiveText.classList.remove('animate-pulse');
        lastItemText.classList.remove('animate-pulse');

        if (!error && trans && trans.length > 0) {
            const dateObj = new Date(trans[0].borrow_date);
            lastActiveText.textContent = dateObj.toLocaleDateString('th-TH', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            lastItemText.textContent = trans[0].equipments?.name || 'อุปกรณ์ที่ไม่ระบุ';
            lastItemText.className = 'text-sm font-bold text-brand-pink truncate';
        } else {
            lastActiveText.textContent = 'ไม่เคยเข้าใช้งาน/ยืม';
            lastItemText.textContent = '-';
            lastActiveText.className = 'text-sm text-gray-400 dark:text-gray-500';
            lastItemText.className = 'text-sm text-gray-400 dark:text-gray-500';
        }
    } catch (err) {
        console.error('Failed to fetch user history', err);
        lastActiveText.textContent = 'ไม่สามารถดึงข้อมูลได้';
        lastItemText.textContent = '-';
        lastActiveText.classList.remove('animate-pulse');
        lastItemText.classList.remove('animate-pulse');
    }
};

window.closeUserDetailsModal = function () {
    document.getElementById('userDetailsModal').classList.add('hidden');
    window.currentSelectedUser = null;
};

window.toggleUserRole = async function (userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    const toggleBtn = document.getElementById('toggleRoleBtn');
    if (toggleBtn) {
        toggleBtn.textContent = 'กำลังอัปเดต...';
        toggleBtn.classList.add('opacity-50', 'cursor-wait');
    }

    const success = await window.updateUserRole(userId, newRole);

    if (success) {
        // Refresh the list
        window.allUsers = await window.fetchAllUsers();
        window.renderUsersList(window.filterUsersValue ? window.allUsers.filter(u => u.username.toLowerCase().includes(window.filterUsersValue)) : window.allUsers);

        // Update modal immediately if open
        if (window.currentSelectedUser && window.currentSelectedUser.id === userId) {
            window.openUserDetailsModal(userId); // Re-render modal details
        }
    } else {
        if (toggleBtn) {
            toggleBtn.textContent = 'ล้มเหลว ลองใหม่';
            toggleBtn.classList.remove('opacity-50', 'cursor-wait');
        }
    }
};

window.filterUsersValue = '';
window.filterUsers = function (query) {
    window.filterUsersValue = query.toLowerCase();
    const filtered = window.allUsers.filter(user =>
        user.username.toLowerCase().includes(window.filterUsersValue)
    );
    window.renderUsersList(filtered);
};

// --- Penalty System Functions ---

// Open penalty modal
window.openPenaltyModal = function (userId, userName, equipmentId, equipmentName, transactionId) {
    document.getElementById('penaltyUserId').value = userId;
    document.getElementById('penaltyTransactionId').value = transactionId || '';
    document.getElementById('penaltyEquipmentId').value = equipmentId || '';
    document.getElementById('penaltyUserName').textContent = userName || userId;
    document.getElementById('penaltyEquipmentName').textContent = equipmentName || '-';

    // Reset form
    document.getElementById('penaltyType').value = '';
    document.getElementById('penaltyDaysLate').value = '1';
    document.getElementById('penaltyCompensation').value = '';
    document.getElementById('penaltyDescription').value = '';
    document.getElementById('daysLateContainer').classList.add('hidden');
    document.getElementById('compensationContainer').classList.add('hidden');
    document.getElementById('strikePreview').classList.add('hidden');

    document.getElementById('penaltyModal').classList.remove('hidden');
};

// Close penalty modal
window.closePenaltyModal = function () {
    document.getElementById('penaltyModal').classList.add('hidden');
};

// Submit penalty
window.submitPenalty = async function () {
    const userId = document.getElementById('penaltyUserId').value;
    const penaltyType = document.getElementById('penaltyType').value;

    if (!userId || !penaltyType) {
        window.showToast?.('กรุณาเลือกประเภทความผิด', 'error');
        return;
    }

    const daysLate = parseInt(document.getElementById('penaltyDaysLate').value) || 0;
    const compensationAmount = parseFloat(document.getElementById('penaltyCompensation').value) || 0;
    const description = document.getElementById('penaltyDescription').value.trim();

    const penaltyData = {
        userId: userId,
        transactionId: document.getElementById('penaltyTransactionId').value || null,
        equipmentId: document.getElementById('penaltyEquipmentId').value || null,
        penaltyType: penaltyType,
        daysLate: penaltyType === 'late_return' ? daysLate : 0,
        compensationAmount: compensationAmount,
        description: description
    };

    window.showToast?.('กำลังบันทึก...', 'info');

    const result = await window.addPenalty(penaltyData);

    if (result.success) {
        const strikes = result.strikesGiven;
        window.showToast?.(`บันทึกบทลงโทษสำเร็จ (+${strikes} Strike)`, 'success');
        window.closePenaltyModal();

        // Refresh data if needed
        window.fetchReturnData?.();
    } else {
        window.showToast?.('เกิดข้อผิดพลาด: ' + result.error, 'error');
    }
};

// Penalty type change handler - show/hide relevant fields
window.onPenaltyTypeChange = function () {
    const penaltyType = document.getElementById('penaltyType').value;
    const daysLateContainer = document.getElementById('daysLateContainer');
    const compensationContainer = document.getElementById('compensationContainer');
    const strikePreview = document.getElementById('strikePreview');
    const strikeCount = document.getElementById('strikeCount');

    // Show days late input only for late_return
    if (penaltyType === 'late_return') {
        daysLateContainer.classList.remove('hidden');
    } else {
        daysLateContainer.classList.add('hidden');
    }

    // Show compensation for damage/lost
    if (['major_damage', 'severe_damage', 'lost'].includes(penaltyType)) {
        compensationContainer.classList.remove('hidden');
    } else {
        compensationContainer.classList.add('hidden');
    }

    // Show strike preview
    if (penaltyType) {
        const daysLate = parseInt(document.getElementById('penaltyDaysLate').value) || 1;
        const { strikes } = window.calculateStrikes?.(penaltyType, daysLate) || { strikes: 0 };
        strikeCount.textContent = strikes;
        strikePreview.classList.remove('hidden');
    } else {
        strikePreview.classList.add('hidden');
    }
};

// Days late change handler - update strike preview
window.onDaysLateChange = function () {
    const penaltyType = document.getElementById('penaltyType').value;
    if (penaltyType === 'late_return') {
        window.onPenaltyTypeChange();
    }
};

// Open penalty history modal
window.openPenaltyHistoryModal = async function (userId = null) {
    document.getElementById('penaltyHistoryModal').classList.remove('hidden');
    document.getElementById('penaltyHistoryList').innerHTML = '<div class="text-center py-8 text-gray-400">กำลังโหลด...</div>';

    let penalties;
    if (userId) {
        penalties = await window.getUserPenalties(userId);
    } else {
        penalties = await window.fetchAllPenalties();
    }

    if (!penalties || penalties.length === 0) {
        document.getElementById('penaltyHistoryList').innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <p class="text-4xl mb-2">✓</p>
                <p>ไม่มีประวัติบทลงโทษ</p>
            </div>
        `;
        return;
    }

    const penaltyTypeLabels = {
        'late_return': 'คืนล่าช้า',
        'minor_damage': 'เสียหายเล็กน้อย',
        'major_damage': 'เสียหายปานกลาง',
        'severe_damage': 'เสียหายรุนแรง',
        'lost': 'สูญหาย'
    };

    const severityColors = {
        'low': 'bg-yellow-100 text-yellow-700',
        'medium': 'bg-orange-100 text-orange-700',
        'high': 'bg-red-100 text-red-700',
        'critical': 'bg-red-600 text-white'
    };

    document.getElementById('penaltyHistoryList').innerHTML = penalties.map(penalty => `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3 border-l-4 ${penalty.severity === 'critical' ? 'border-red-600' : penalty.severity === 'high' ? 'border-red-500' : penalty.severity === 'medium' ? 'border-orange-500' : 'border-yellow-500'}">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="font-bold text-gray-900 dark:text-white">${penalty.user_id}</span>
                    <span class="px-2 py-0.5 text-xs rounded-full ${severityColors[penalty.severity] || 'bg-gray-100 text-gray-700'}">
                        ${penaltyTypeLabels[penalty.penalty_type] || penalty.penalty_type}
                    </span>
                </div>
                <span class="text-xs text-gray-500">${new Date(penalty.created_at).toLocaleDateString('th-TH')}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-300">
                <p>อุปกรณ์: ${penalty.equipments?.name || '-'}</p>
                ${penalty.days_late > 0 ? `<p>ล่าช้า: ${penalty.days_late} วัน</p>` : ''}
                ${penalty.description ? `<p>หมายเหตุ: ${penalty.description}</p>` : ''}
                <p class="text-red-500 font-bold mt-1">+${penalty.strikes_given} Strike</p>
                ${penalty.compensation_amount > 0 ? `<p class="text-orange-500">ค่าชดใช้: ${penalty.compensation_amount.toLocaleString()} บาท (${penalty.compensation_status === 'paid' ? '✓ ชำระแล้ว' : '⏳ รอชำระ'})</p>` : ''}
            </div>
        </div>
    `).join('');
};

// Close penalty history modal
window.closePenaltyHistoryModal = function () {
    document.getElementById('penaltyHistoryModal').classList.add('hidden');
};

// Add event listeners when DOM ready
document.addEventListener('DOMContentLoaded', function () {
    const penaltyTypeSelect = document.getElementById('penaltyType');
    if (penaltyTypeSelect) {
        penaltyTypeSelect.addEventListener('change', window.onPenaltyTypeChange);
    }

    const daysLateInput = document.getElementById('penaltyDaysLate');
    if (daysLateInput) {
        daysLateInput.addEventListener('change', window.onDaysLateChange);
    }
});
