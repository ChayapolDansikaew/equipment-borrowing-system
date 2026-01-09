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

        // Check if item is already in cart
        const firstAvailableItem = group.availableItems[0];
        const isInCart = firstAvailableItem && window.cart?.has(firstAvailableItem.id);

        // REDESIGN: Button Styles
        let btnClass, btnText, btnAction;
        if (isOutOfStock) {
            btnClass = 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600';
            btnText = t.outOfStock;
            btnAction = '';
        } else if (isInCart) {
            btnClass = 'bg-green-500 text-white cursor-default';
            btnText = '✓ อยู่ในตะกร้าแล้ว';
            btnAction = '';
        } else {
            btnClass = 'bg-brand-yellow text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/20';
            btnText = '🛒 ใส่ตะกร้า';
            btnAction = `onclick="addToCart('${firstAvailableItem?.id}')"`;
        }

        return `
        <div class="bg-white rounded-xl overflow-hidden group border border-gray-100 hover:shadow-xl transition-all duration-300 dark:bg-gray-800 dark:border-gray-700">
            <div class="relative h-48 overflow-hidden bg-gray-50">
                ${editBtn}
                ${userBadge}
                <img src="${group.image_url}" alt="${group.name}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">
                <div class="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${statusColor}" style="${group.borrowedByUser > 0 ? 'top: 2.5rem;' : ''}">
                    ${statusText}
                </div>
            </div>
            <div class="p-5">
                <p class="text-xs font-bold text-brand-pink uppercase tracking-wide mb-1">${group.type}</p>
                <h3 class="font-bold text-lg mb-4 text-brand-black dark:text-white">${group.name}</h3>
                
                <button ${btnAction}
                    class="w-full py-2.5 rounded-lg font-bold uppercase text-sm tracking-wider transition-all transform active:scale-95 ${btnClass}"
                    ${isOutOfStock || isInCart ? 'disabled' : ''}>
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
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-gray-400">No active transactions</td></tr>`;
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
            : `<span class="px-2 py-1 rounded-full text-xs font-bold bg-brand-yellow text-black">Active</span>`;

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors">
                <td class="px-6 py-4 font-medium text-brand-black dark:text-white">${tr.equipments?.name || 'Unknown'}</td>
                <td class="px-6 py-4 dark:text-gray-300">${tr.borrower_name}</td>
                <td class="px-6 py-4 text-gray-500 dark:text-gray-400">${date}</td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4">
                    <button onclick="openReturnModal(${tr.equipment_id}, '${tr.equipments?.name || 'Unknown'}')" class="text-brand-pink hover:text-white hover:bg-brand-pink border border-brand-pink px-4 py-1.5 rounded-lg transition-all text-xs font-bold uppercase">
                        ${t.returnNotify}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
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
                    statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">${daysRemaining} วัน</span>`;
                } else {
                    statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-600">${daysRemaining} วัน</span>`;
                }
            }
        }

        return `
            <div class="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-all dark:bg-gray-800 dark:border-gray-700 ${isOverdue ? 'border-l-4 border-l-red-500' : ''}">
                <div class="flex gap-4">
                    <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img src="${tr.equipments?.image_url || ''}" alt="${tr.equipments?.name || 'Equipment'}" 
                            class="w-full h-full object-cover">
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

    document.getElementById('userDisplay').textContent = window.currentUser.username;

    // Role Badge
    const badge = document.getElementById('roleBadge');
    badge.textContent = window.currentUser.role;
    if (window.currentUser.role === 'admin') {
        badge.className = "px-2 py-0.5 rounded-full text-xs font-bold bg-brand-black text-brand-yellow uppercase border border-brand-yellow";
    } else {
        badge.className = "px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 uppercase";
    }

    // Update Mobile Menu
    const mobileUserDisplay = document.getElementById('mobileUserDisplay');
    const mobileRoleBadge = document.getElementById('mobileRoleBadge');
    const mobileUserAvatar = document.getElementById('mobileUserAvatar');
    const mobileAddBtn = document.getElementById('mobileAddBtn');

    if (mobileUserDisplay) {
        mobileUserDisplay.textContent = window.currentUser.username;
    }
    if (mobileRoleBadge) {
        mobileRoleBadge.textContent = window.currentUser.role;
        if (window.currentUser.role === 'admin') {
            mobileRoleBadge.className = "inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-black text-brand-yellow uppercase";
        } else {
            mobileRoleBadge.className = "inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-600 uppercase";
        }
    }
    if (mobileUserAvatar) {
        mobileUserAvatar.textContent = window.currentUser.username.charAt(0).toUpperCase();
        if (window.currentUser.role === 'admin') {
            mobileUserAvatar.className = "w-8 h-8 rounded-full bg-brand-yellow flex items-center justify-center text-brand-black font-bold text-sm";
        } else {
            mobileUserAvatar.className = "w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-sm";
        }
    }

    const addBtn = document.getElementById('addBtn');
    const mobileOverviewBtn = document.getElementById('mobileOverviewBtn');

    if (window.currentUser.role === 'admin') {
        addBtn.classList.remove('hidden');
        if (mobileAddBtn) mobileAddBtn.classList.remove('hidden');
        // Show overview button for admin
        const overviewBtn = document.getElementById('overviewBtn');
        if (overviewBtn) {
            overviewBtn.classList.remove('hidden');
            overviewBtn.classList.add('md:block');
        }
        if (mobileOverviewBtn) mobileOverviewBtn.classList.remove('hidden');
        const myItemsBtn = document.getElementById('btn-my-items');
        if (myItemsBtn) {
            myItemsBtn.setAttribute('onclick', "filterStatus('returns')");
            myItemsBtn.setAttribute('data-i18n', 'returns');
            myItemsBtn.textContent = window.translations[window.currentLang].returns;
            myItemsBtn.id = 'btn-returns';
        }
        // Show pending requests button for admin
        const pendingBtn = document.getElementById('pendingRequestsBtn');
        if (pendingBtn) pendingBtn.classList.remove('hidden');
    } else {
        addBtn.classList.add('hidden');
        if (mobileAddBtn) mobileAddBtn.classList.add('hidden');
        // Hide overview button for regular users
        const overviewBtn = document.getElementById('overviewBtn');
        if (overviewBtn) {
            overviewBtn.classList.add('hidden');
            overviewBtn.classList.remove('md:block');
        }
        if (mobileOverviewBtn) mobileOverviewBtn.classList.add('hidden');
        const returnsBtn = document.getElementById('btn-returns');
        if (returnsBtn) {
            returnsBtn.setAttribute('onclick', "filterStatus('my-items')");
            returnsBtn.setAttribute('data-i18n', 'myItems');
            returnsBtn.textContent = window.translations[window.currentLang].myItems;
            returnsBtn.id = 'btn-my-items';
        }
        // Hide pending requests button for regular users
        const pendingBtn = document.getElementById('pendingRequestsBtn');
        if (pendingBtn) pendingBtn.classList.add('hidden');
    }

    // Show cart button for all logged in users
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.classList.remove('hidden');
        window.cart?.load();
    }

    // Initialize pending badge for admin
    window.initPendingBadge?.();

    window.fetchEquipments();
};

window.toggleLanguage = function () {
    window.currentLang = window.currentLang === 'th' ? 'en' : 'th';
    document.getElementById('langDisplay').textContent = window.currentLang.toUpperCase();
    window.updateTranslations();
    window.renderEquipments();
    if (!document.getElementById('overviewSection').classList.contains('hidden')) {
        window.fetchOverviewData();
    }
};

window.updateTranslations = function () {
    const t = window.translations[window.currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    document.getElementById('searchInput').placeholder = t.searchPlaceholder;

    const overviewBtn = document.getElementById('overviewBtn');
    if (document.getElementById('overviewSection').classList.contains('hidden')) {
        overviewBtn.textContent = t.overview;
    } else {
        overviewBtn.textContent = t.backToBrowse;
    }
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

    controls.classList.remove('hidden');
    overview.classList.add('hidden');

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
    const btn = document.getElementById('overviewBtn');
    const t = window.translations[window.currentLang];

    if (overview.classList.contains('hidden')) {
        browse.classList.add('hidden');
        controls.classList.add('hidden');
        returnSection.classList.add('hidden');
        myBorrowingsSection.classList.add('hidden');
        overview.classList.remove('hidden');
        btn.textContent = t.backToBrowse;
        window.fetchOverviewData();
    } else {
        overview.classList.add('hidden');
        controls.classList.remove('hidden');
        btn.textContent = t.overview;
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

    if (groupName) {
        const group = window.equipments.find(e => e.name === groupName);
        if (!group) return;
        document.getElementById('manageModalTitle').textContent = t.edit + ' ' + groupName;
        nameInput.value = group.name;
        typeInput.value = group.type;
        imageInput.value = group.image_url;
        document.getElementById('manageOriginalName').value = groupName;
        qtyGroup.classList.add('hidden');
    } else {
        document.getElementById('manageModalTitle').textContent = t.addEquipment;
        nameInput.value = '';
        typeInput.value = 'Camera';
        imageInput.value = '';
        document.getElementById('manageQuantity').value = 1;
        document.getElementById('manageOriginalName').value = '';
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

// Mobile Menu Functions
window.toggleMobileMenu = function () {
    const dropdown = document.getElementById('mobileMenuDropdown');
    const arrow = document.getElementById('mobileMenuArrow');

    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
    } else {
        dropdown.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }
};

window.closeMobileMenu = function () {
    const dropdown = document.getElementById('mobileMenuDropdown');
    const arrow = document.getElementById('mobileMenuArrow');

    if (dropdown) {
        dropdown.classList.add('hidden');
    }
    if (arrow) {
        arrow.style.transform = 'rotate(0deg)';
    }
};

// Close mobile menu when clicking outside
document.addEventListener('click', function (e) {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenuDropdown = document.getElementById('mobileMenuDropdown');

    if (mobileMenuBtn && mobileMenuDropdown) {
        if (!mobileMenuBtn.contains(e.target) && !mobileMenuDropdown.contains(e.target)) {
            window.closeMobileMenu();
        }
    }
});
