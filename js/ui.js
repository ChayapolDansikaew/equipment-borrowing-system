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

    grid.innerHTML = filteredGroups.map((group, index) => {
        const isOutOfStock = group.available === 0;
        // REDESIGN: Status Text Colors
        const statusColor = isOutOfStock ? 'bg-brand-grey text-white' : 'bg-brand-yellow text-black';
        const statusText = isOutOfStock ? t.outOfStock : `${group.available}/${group.total} ${t.available}`;

        // Edit Button (Clean, small)
        const editBtn = window.currentUser && window.currentUser.role === 'admin'
            ? `<button onclick="event.stopPropagation(); openManageModal('${group.name}')" class="absolute top-2 left-2 p-1.5 bg-white/90 rounded-full hover:bg-white text-brand-black transition-colors z-10"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>`
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
        <div class="bg-white rounded-xl overflow-hidden group border border-gray-100 card-premium dark:bg-gray-800 dark:border-gray-700 cursor-pointer opacity-0 fade-in-up" style="animation-delay: ${Math.min(index * 0.04, 0.4)}s">
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
                <h3 class="font-bold text-lg mb-2 text-brand-black dark:text-white">${group.name}</h3>
                ${(() => {
                    const purchaseYear = group.items[0]?.purchase_year;
                    if (!purchaseYear) return '';
                    const age = window.calculateEquipmentAge(purchaseYear);
                    if (age === null) return '';
                    const t = window.translations[window.currentLang];
                    let ageColor = 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
                    let ageIcon = '📅';
                    if (age >= 10) {
                        ageColor = 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
                        ageIcon = '⚠️';
                    } else if (age === 0) {
                        ageColor = 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400';
                        ageIcon = '✨';
                    }
                    const ageText = age === 0 
                        ? (t?.newEquipment || 'New') 
                        : `${t?.ageCalculation || 'Age'}: ${age} ${t?.yearUnit || 'yrs'}`;
                    return `<p class="mb-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${ageColor}">${ageIcon} ${ageText}</p>`;
                })()}
                
                <button ${btnAction}
                    class="w-full py-2.5 rounded-lg font-bold uppercase text-sm tracking-wider transition-all transform active:scale-95 btn-ripple ${btnClass}"
                    ${isOutOfStock ? 'disabled' : ''}>
                    ${btnText}
                </button>
            </div>
        </div>
    `}).join('');
};

window.showSkeletonLoading = function (count = 8) {
    const grid = document.getElementById('equipmentGrid');
    if (!grid) return;
    const skeleton = `
        <div class="bg-white rounded-xl overflow-hidden border border-gray-100 dark:bg-gray-800 dark:border-gray-700 animate-pulse">
            <div class="h-48 bg-gray-200 dark:bg-gray-700"></div>
            <div class="p-5 space-y-3">
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                <div class="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-full mt-2"></div>
            </div>
        </div>
    `;
    grid.innerHTML = Array.from({ length: count }, () => skeleton).join('');
};

function getReturnModalTransaction(transactionId) {
    const numericId = Number(transactionId);
    return (window._returnTransactions || []).find(tr => Number(tr.id) === numericId) || null;
}

function formatReturnModalDate(dateStr, includeTime = false) {
    if (!dateStr) return '-';
    const locale = window.currentLang === 'th' ? 'th-TH' : 'en-US';
    const options = includeTime
        ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        : { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString(locale, options);
}

function getReturnDurationDays(startDate) {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(1, Math.round((today - startDay) / 86400000) + 1);
}

function buildReturnSupportItem(label, tone = 'info') {
    const toneClass = tone === 'success'
        ? 'rounded-xl px-3 py-2 text-sm font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'
        : tone === 'warning'
            ? 'rounded-xl px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
            : 'rounded-xl px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300';
    return `<div class="${toneClass}">${label}</div>`;
}

function populateReturnModal(transaction) {
    const t = window.translations[window.currentLang];
    const modal = document.getElementById('returnModal');
    const borrowerEl = document.getElementById('returnBorrowerName');
    const itemEl = document.getElementById('returnItemName');
    const itemInlineEls = document.querySelectorAll('.return-item-name-inline');
    const borrowedOnEl = document.getElementById('returnBorrowedOnValue');
    const dueOnEl = document.getElementById('returnDueOnValue');
    const durationEl = document.getElementById('returnDurationValue');
    const statusEl = document.getElementById('returnStatusValue');
    const timingEl = document.getElementById('returnTimingValue');
    const messageEl = document.getElementById('returnDecisionMessage');
    const checklistEl = document.getElementById('returnDecisionChecklist');

    const dueDate = transaction?.end_date ? new Date(transaction.end_date) : null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = dueDate ? new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) : null;
    const diffDays = dueDay ? Math.round((today - dueDay) / 86400000) : 0;
    const isOverdue = Boolean(dueDay && diffDays > 0);
    const isDueToday = Boolean(dueDay && diffDays === 0);
    const daysUntilDue = dueDay ? Math.max(0, Math.round((dueDay - today) / 86400000)) : 0;
    const durationDays = getReturnDurationDays(transaction?.borrow_date);

    let timingText = '-';
    if (dueDay) {
        if (isOverdue) {
            timingText = `${t.overdueBy} ${diffDays} ${t.dayUnit}`;
        } else if (isDueToday) {
            timingText = t.dueToday;
        } else {
            timingText = `${t.returnDueIn} ${daysUntilDue} ${t.dayUnit}`;
        }
    }

    if (borrowerEl) borrowerEl.textContent = transaction?.borrower_name || '-';
    if (itemEl) itemEl.textContent = transaction?.equipments?.name || '-';
    if (itemInlineEls?.length) {
        itemInlineEls.forEach(el => {
            el.textContent = transaction?.equipments?.name || '-';
        });
    }
    if (borrowedOnEl) borrowedOnEl.textContent = formatReturnModalDate(transaction?.borrow_date, true);
    if (dueOnEl) dueOnEl.textContent = formatReturnModalDate(transaction?.end_date);
    if (durationEl) durationEl.textContent = durationDays > 0 ? `${durationDays} ${t.dayUnit}` : '-';
    if (statusEl) statusEl.textContent = isOverdue ? t.overdue : t.active;
    if (timingEl) timingEl.textContent = timingText;

    if (messageEl) {
        messageEl.className = isOverdue
            ? 'rounded-xl px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
            : 'rounded-xl px-3 py-2 text-sm font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300';
        messageEl.textContent = isOverdue ? t.returnReviewMessage : t.returnReadyMessage;
    }

    if (checklistEl) {
        checklistEl.innerHTML = [
            buildReturnSupportItem(isOverdue ? t.returnChecklistOverdue : t.returnChecklistOnTime, isOverdue ? 'warning' : 'success'),
            buildReturnSupportItem(t.returnChecklistInspect, 'info'),
            buildReturnSupportItem(t.returnChecklistPenalty, 'warning')
        ].join('');
    }

    if (modal) {
        modal.dataset.transactionId = transaction?.id ? String(transaction.id) : '';
        modal.dataset.equipmentId = transaction?.equipment_id ? String(transaction.equipment_id) : '';
        modal.dataset.equipmentName = transaction?.equipments?.name || '';
        modal.dataset.borrowerName = transaction?.borrower_name || '';
    }
}

window.renderReturnTable = function (transactions) {
    const tbody = document.getElementById('returnTableBody');
    const t = window.translations[window.currentLang];

    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400">${t.noActiveTransactions}</td></tr>`;
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

        const dueDateFormatted = endDate
            ? endDate.toLocaleDateString(window.currentLang === 'th' ? 'th-TH' : 'en-US', {
                day: 'numeric', month: 'short', year: 'numeric'
            })
            : '-';

        const statusBadge = isOverdue
            ? `<span class="px-2 py-1 rounded-full text-xs font-bold bg-brand-pink text-white">${t.overdue}</span>`
            : `<span class="px-2 py-1 rounded-full text-xs font-bold bg-brand-yellow text-black">${t.active}</span>`;

        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors">
                <td class="px-6 py-4 font-medium text-brand-black dark:text-white">${tr.equipments?.name || 'Unknown'}</td>
                <td class="px-6 py-4 dark:text-gray-300">${tr.borrower_name}</td>
                <td class="px-6 py-4 text-gray-500 dark:text-gray-400">${date}</td>
                <td class="px-6 py-4 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}">${dueDateFormatted}</td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4">
                    <div class="flex gap-2">
                        <button onclick="openReturnModal(${tr.id})" class="text-brand-pink hover:text-white hover:bg-brand-pink border border-brand-pink px-3 py-1.5 rounded-lg transition-all text-xs font-bold">
                            ${t.returnNotify}
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

        // Hide user-only items for admin
        const userNotifBtn = document.getElementById('userNotifBtn');
        if (userNotifBtn) userNotifBtn.classList.add('hidden');
        const dropdownProfileBtn = document.getElementById('dropdownProfileBtn');
        if (dropdownProfileBtn) dropdownProfileBtn.classList.add('hidden');
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

        // Show user-only items
        const userNotifBtn = document.getElementById('userNotifBtn');
        if (userNotifBtn) userNotifBtn.classList.remove('hidden');
        const dropdownProfileBtn = document.getElementById('dropdownProfileBtn');
        if (dropdownProfileBtn) dropdownProfileBtn.classList.remove('hidden');
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

    // Initialize user notification badge for regular users
    window.initUserNotifBadge?.();

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
    const profileSection = document.getElementById('userProfileSection');
    if (profileSection) profileSection.classList.add('hidden');

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
        const profileSection = document.getElementById('userProfileSection');
        if (profileSection) profileSection.classList.add('hidden');
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

function _buildHistoryStatusBadge(tr, t, now) {
    if (tr.status === 'returned') {
        const wasLate = tr.end_date && tr.return_date && new Date(tr.return_date) > new Date(tr.end_date);
        return wasLate
            ? `<span class="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">${t?.historyStatusLate || 'Late'} ✓</span>`
            : `<span class="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">${t?.historyStatusReturned || 'Returned'}</span>`;
    }
    const isOverdue = tr.end_date && new Date(tr.end_date) < now;
    return isOverdue
        ? `<span class="px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">${t?.historyStatusOverdue || 'Overdue'}</span>`
        : `<span class="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">${t?.historyStatusActive || 'Active'}</span>`;
}

window.setHistoryFilters = function (filters = {}) {
    const normalized = {
        equipment: '',
        borrower: '',
        status: 'all',
        dateFrom: '',
        dateTo: '',
        ...filters
    };

    const equipmentInput = document.getElementById('historySearchEquipment');
    const borrowerInput = document.getElementById('historySearchBorrower');
    const statusInput = document.getElementById('historyStatusFilter');
    const dateFromInput = document.getElementById('historyDateFrom');
    const dateToInput = document.getElementById('historyDateTo');

    if (equipmentInput) equipmentInput.value = normalized.equipment;
    if (borrowerInput) borrowerInput.value = normalized.borrower;
    if (statusInput) statusInput.value = normalized.status;
    if (dateFromInput) dateFromInput.value = normalized.dateFrom;
    if (dateToInput) dateToInput.value = normalized.dateTo;

    return normalized;
};

window.openHistoryPage = function (filters = {}) {
    const browse = document.getElementById('browseSection');
    const overview = document.getElementById('overviewSection');
    const controls = document.getElementById('controlsSection');
    const returnSection = document.getElementById('returnSection');
    const myBorrowingsSection = document.getElementById('myBorrowingsSection');
    const historySection = document.getElementById('historySection');
    const historyBtn = document.getElementById('historyBtn');
    const profileSection = document.getElementById('userProfileSection');
    const t = window.translations[window.currentLang];

    // Track where we came from so historyGoBack can return correctly
    if (overview && !overview.classList.contains('hidden')) {
        window._historyReferrer = 'dashboard';
    } else {
        window._historyReferrer = 'browse';
    }

    window.stopDashboardRefresh?.();

    browse.classList.add('hidden');
    controls.classList.add('hidden');
    returnSection.classList.add('hidden');
    myBorrowingsSection.classList.add('hidden');
    overview.classList.add('hidden');
    if (profileSection) profileSection.classList.add('hidden');
    if (historySection) historySection.classList.remove('hidden');
    if (historyBtn) historyBtn.textContent = t?.backToBrowse || 'Back';

    const normalized = window.setHistoryFilters(filters);
    window.fetchBorrowingHistory(normalized);
};

window.historyGoBack = function () {
    const historySection = document.getElementById('historySection');
    const browse = document.getElementById('browseSection');
    const overview = document.getElementById('overviewSection');
    const controls = document.getElementById('controlsSection');
    const returnSection = document.getElementById('returnSection');
    const myBorrowingsSection = document.getElementById('myBorrowingsSection');
    const historyBtn = document.getElementById('historyBtn');
    const t = window.translations[window.currentLang];

    historySection?.classList.add('hidden');
    if (historyBtn) historyBtn.textContent = t?.history || 'History';

    if (window._historyReferrer === 'dashboard') {
        controls?.classList.add('hidden');
        overview?.classList.remove('hidden');
        window._historyReferrer = null;
        window.fetchDashboardData?.();
        window.setupDashboardRefresh?.();
    } else if (window.currentFilter === 'returns') {
        controls?.classList.remove('hidden');
        returnSection?.classList.remove('hidden');
        window.fetchReturnData?.();
    } else if (window.currentFilter === 'my-items') {
        controls?.classList.remove('hidden');
        myBorrowingsSection?.classList.remove('hidden');
        window.fetchMyBorrowings?.();
    } else {
        controls?.classList.remove('hidden');
        browse?.classList.remove('hidden');
        window.fetchEquipments?.();
    }
    window._historyReferrer = null;
};

window.historyGoHome = function () {
    const historySection = document.getElementById('historySection');
    const browse = document.getElementById('browseSection');
    const controls = document.getElementById('controlsSection');
    const returnSection = document.getElementById('returnSection');
    const myBorrowingsSection = document.getElementById('myBorrowingsSection');
    const overview = document.getElementById('overviewSection');
    const historyBtn = document.getElementById('historyBtn');
    const t = window.translations[window.currentLang];

    historySection?.classList.add('hidden');
    returnSection?.classList.add('hidden');
    myBorrowingsSection?.classList.add('hidden');
    overview?.classList.add('hidden');
    controls?.classList.remove('hidden');
    browse?.classList.remove('hidden');
    if (historyBtn) historyBtn.textContent = t?.history || 'History';
    window.currentFilter = 'all';
    window.currentCategory = 'all';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    window.fetchEquipments?.();
};

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
        window.openHistoryPage();
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
        const statusBadge = _buildHistoryStatusBadge(tr, t, now);
        const equipType = window.escapeHtml?.(tr.equipments?.type) || tr.equipments?.type || '';

        return `
            <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td class="px-4 md:px-6 py-3 font-medium text-brand-black dark:text-white">${window.escapeHtml?.(tr.equipments?.name) || tr.equipments?.name || 'Unknown'}</td>
                <td class="px-4 md:px-6 py-3 text-xs text-brand-pink font-semibold">${equipType}</td>
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
        pagination.style.display = '';
        pagination.classList.remove('hidden');
        const pageInfo = document.getElementById('historyPageInfo');
        if (pageInfo) pageInfo.textContent = `${t?.historyShowing || 'Showing'} ${start + 1}–${end} ${t?.historyOf || 'of'} ${data.length} ${t?.historyRecords || 'records'}`;
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
    const base = window._historyAllData || window._historyData || [];
    const equipment = document.getElementById('historySearchEquipment')?.value?.trim().toLowerCase() || '';
    const borrower = document.getElementById('historySearchBorrower')?.value?.trim().toLowerCase() || '';
    const status = document.getElementById('historyStatusFilter')?.value || 'all';
    const dateFrom = document.getElementById('historyDateFrom')?.value || '';
    const dateTo = document.getElementById('historyDateTo')?.value || '';
    const now = new Date();

    let filtered = base;
    if (equipment) filtered = filtered.filter(tr => (tr.equipments?.name || '').toLowerCase().includes(equipment));
    if (borrower) filtered = filtered.filter(tr => (tr.borrower_name || '').toLowerCase().includes(borrower));
    if (status && status !== 'all') {
        if (status === 'overdue') {
            filtered = filtered.filter(tr => tr.status !== 'returned' && tr.end_date && new Date(tr.end_date) < now);
        } else {
            filtered = filtered.filter(tr => tr.status === status);
        }
    }
    if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00');
        filtered = filtered.filter(tr => new Date(tr.borrow_date) >= from);
    }
    if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59');
        filtered = filtered.filter(tr => new Date(tr.borrow_date) <= to);
    }

    window._historyData = filtered;
    window._historyPage = 1;
    window.renderHistoryTable();
};

window.clearHistoryFilters = function () {
    const equipmentInput = document.getElementById('historySearchEquipment');
    const borrowerInput = document.getElementById('historySearchBorrower');
    const statusInput = document.getElementById('historyStatusFilter');
    const dateFromInput = document.getElementById('historyDateFrom');
    const dateToInput = document.getElementById('historyDateTo');
    if (equipmentInput) equipmentInput.value = '';
    if (borrowerInput) borrowerInput.value = '';
    if (statusInput) statusInput.value = 'all';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    window._historyData = window._historyAllData || [];
    window._historyPage = 1;
    window.renderHistoryTable();
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

// --- User Notifications ---

window.toggleUserNotifications = async function () {
    const dropdown = document.getElementById('userNotifDropdown');
    if (!dropdown) return;

    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        // Fetch and render notifications
        const list = document.getElementById('userNotifList');
        if (list) list.innerHTML = '<div class="text-center py-6 text-gray-400 text-sm">กำลังโหลด...</div>';
        const notifications = await window.fetchUserNotifications();
        renderUserNotifications(notifications);
    } else {
        dropdown.classList.add('hidden');
    }
};

window.closeUserNotifications = function () {
    const dropdown = document.getElementById('userNotifDropdown');
    if (dropdown) dropdown.classList.add('hidden');
};

// Close notification dropdown when clicking outside
document.addEventListener('click', function (e) {
    const wrapper = document.getElementById('userNotifWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        window.closeUserNotifications();
    }
});

function renderUserNotifications(notifications) {
    const list = document.getElementById('userNotifList');
    const badge = document.getElementById('userNotifBadge');
    const bellBtn = document.getElementById('userNotifBtn');
    const t = window.translations[window.currentLang];

    if (!list) return;

    // Update badge
    const urgentCount = notifications.filter(n => n.priority).length;
    if (badge) {
        badge.textContent = urgentCount || notifications.length;
        badge.classList.toggle('hidden', notifications.length === 0);
    }
    if (bellBtn) {
        bellBtn.classList.toggle('bell-has-notifications', urgentCount > 0);
    }

    if (notifications.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8 px-4">
                <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                    <svg class="w-7 h-7 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                    </svg>
                </div>
                <p class="text-sm font-medium text-gray-400 dark:text-gray-500">${t.noNotifications}</p>
                <p class="text-xs text-gray-300 dark:text-gray-600 mt-1">${t.noNotificationsDesc}</p>
            </div>
        `;
        return;
    }

    const locale = window.currentLang === 'th' ? 'th-TH' : 'en-US';

    list.innerHTML = notifications.slice(0, 15).map(n => {
        const timeStr = n.time ? new Date(n.time).toLocaleDateString(locale, {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        }) : '';

        return `
            <div class="flex items-start gap-3 px-4 py-3 border-b border-gray-100/80 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <div class="w-9 h-9 rounded-lg ${n.bgColor} flex items-center justify-center flex-shrink-0 text-sm">
                    ${n.icon}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold ${n.color}">${n.title}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">${window.escapeHtml?.(n.message) || n.message}</p>
                    <p class="text-[10px] text-gray-400 dark:text-gray-500 mt-1">${timeStr}</p>
                </div>
            </div>
        `;
    }).join('');
}

window.clearUserNotifications = function () {
    const list = document.getElementById('userNotifList');
    const badge = document.getElementById('userNotifBadge');
    const bellBtn = document.getElementById('userNotifBtn');
    const t = window.translations[window.currentLang];

    if (badge) {
        badge.classList.add('hidden');
        badge.textContent = '0';
    }
    if (bellBtn) bellBtn.classList.remove('bell-has-notifications');

    if (list) {
        list.innerHTML = `
            <div class="text-center py-8 px-4">
                <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                    <svg class="w-7 h-7 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                    </svg>
                </div>
                <p class="text-sm font-medium text-gray-400 dark:text-gray-500">${t.noNotifications}</p>
                <p class="text-xs text-gray-300 dark:text-gray-600 mt-1">${t.noNotificationsDesc}</p>
            </div>
        `;
    }
};

// Initialize user notification badge on page load
window.initUserNotifBadge = async function () {
    if (!window.currentUser || window.currentUser.role === 'admin') return;
    const notifications = await window.fetchUserNotifications();
    const badge = document.getElementById('userNotifBadge');
    const bellBtn = document.getElementById('userNotifBtn');
    const urgentCount = notifications.filter(n => n.priority).length;

    if (badge) {
        const count = urgentCount || notifications.length;
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
    if (bellBtn) {
        bellBtn.classList.toggle('bell-has-notifications', urgentCount > 0);
    }
};

// --- User Profile ---

window.toggleUserProfile = async function () {
    const browse = document.getElementById('browseSection');
    const overview = document.getElementById('overviewSection');
    const controls = document.getElementById('controlsSection');
    const returnSection = document.getElementById('returnSection');
    const myBorrowingsSection = document.getElementById('myBorrowingsSection');
    const historySection = document.getElementById('historySection');
    const profileSection = document.getElementById('userProfileSection');

    if (!profileSection) return;

    if (profileSection.classList.contains('hidden')) {
        // Show profile
        browse.classList.add('hidden');
        controls.classList.add('hidden');
        returnSection.classList.add('hidden');
        myBorrowingsSection.classList.add('hidden');
        if (overview) overview.classList.add('hidden');
        if (historySection) historySection.classList.add('hidden');
        profileSection.classList.remove('hidden');

        // Load profile data
        await loadUserProfileData();
    } else {
        // Hide profile, go back
        profileSection.classList.add('hidden');
        controls.classList.remove('hidden');
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

async function loadUserProfileData() {
    // Set basic info
    const profileAvatar = document.getElementById('profileAvatar');
    const profileUsername = document.getElementById('profileUsername');
    const profileRole = document.getElementById('profileRole');

    if (profileAvatar && window.currentUser) {
        profileAvatar.textContent = window.currentUser.username.charAt(0).toUpperCase();
    }
    if (profileUsername && window.currentUser) {
        profileUsername.textContent = window.currentUser.username;
    }
    if (profileRole && window.currentUser) {
        profileRole.textContent = window.currentUser.role;
    }

    // Fetch profile from DB (for strikes)
    const profile = await window.fetchUserProfile();
    const strikesEl = document.getElementById('profileStrikes');
    if (strikesEl && profile) {
        strikesEl.textContent = profile.total_strikes || 0;
    }

    // Fetch and render history
    const tbody = document.getElementById('profileHistoryTableBody');
    const emptyState = document.getElementById('profileHistoryEmpty');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="py-12 text-center text-gray-400">กำลังโหลด...</td></tr>';

    const history = await window.fetchUserHistory();

    // Update stats
    const totalEl = document.getElementById('profileTotalBorrows');
    const returnedEl = document.getElementById('profileReturned');
    if (totalEl) totalEl.textContent = history.length;
    if (returnedEl) returnedEl.textContent = history.filter(tr => tr.status === 'returned').length;

    renderUserProfileHistory(history, profile?.total_strikes || 0);
}

function renderUserProfileHistory(transactions, totalStrikes) {
    const tbody = document.getElementById('profileHistoryTableBody');
    const emptyState = document.getElementById('profileHistoryEmpty');
    const t = window.translations[window.currentLang];
    const locale = window.currentLang === 'th' ? 'th-TH' : 'en-US';
    const now = new Date();
    const dateOpts = { day: 'numeric', month: 'short', year: '2-digit' };

    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = transactions.map((tr, index) => {
        const borrowDate = tr.borrow_date
            ? new Date(tr.borrow_date).toLocaleDateString(locale, dateOpts)
            : '-';
        const dueDate = tr.end_date
            ? new Date(tr.end_date).toLocaleDateString(locale, dateOpts)
            : '-';
        const returnDate = tr.return_date
            ? new Date(tr.return_date).toLocaleDateString(locale, dateOpts)
            : '-';
        const statusBadge = _buildHistoryStatusBadge(tr, t, now);

        // Show total strikes only in the first row
        const strikesCell = index === 0
            ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${totalStrikes > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    ${totalStrikes} ${t?.strikeUnit || 'strikes'}
               </span>`
            : '';

        return `
            <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td class="px-4 md:px-6 py-3 font-medium text-brand-black dark:text-white">${window.escapeHtml?.(tr.equipments?.name) || tr.equipments?.name || 'Unknown'}</td>
                <td class="px-4 md:px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">${borrowDate}</td>
                <td class="px-4 md:px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">${dueDate}</td>
                <td class="px-4 md:px-6 py-3 text-gray-500 dark:text-gray-400 text-xs">${returnDate}</td>
                <td class="px-4 md:px-6 py-3">${statusBadge}</td>
                <td class="px-4 md:px-6 py-3">${strikesCell}</td>
            </tr>
        `;
    }).join('');
}

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
                <td class="px-6 py-4"><div class="skeleton h-4 w-24"></div></td>
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

    // Show equipment age if purchase year exists
    const ageContainer = document.getElementById('detailEquipmentAge');
    const ageText = document.getElementById('detailEquipmentAgeText');
    if (ageContainer && ageText) {
        if (equipment.purchase_year) {
            const age = window.calculateEquipmentAge(equipment.purchase_year);
            const t = window.translations[window.currentLang];
            if (age === 0) {
                ageText.textContent = `${t?.purchaseYear || 'Purchased'}: ${equipment.purchase_year} — ${t?.newEquipment || 'New'}`;
            } else if (age !== null) {
                ageText.textContent = `${t?.purchaseYear || 'Purchased'}: ${equipment.purchase_year} (${t?.ageCalculation || 'Age'}: ${age} ${t?.yearUnit || 'yrs'})`;
            }
            ageContainer.classList.remove('hidden');
        } else {
            ageContainer.classList.add('hidden');
        }
    }

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
                dayElem.title = window.translations[window.currentLang].booked || 'ไม่สามารถทำรายการ';
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
window.addToCartFromDetail = async function () {
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

    // === RULE 1: Only 1 item per category (type) ===
    const existingCategoryItem = window.cart.items.find(
        item => item.category === equipment.type && item.name !== equipment.name
    );
    if (existingCategoryItem) {
        window.showToast(
            `${t.alreadyHaveCategory} (${equipment.type}: ${existingCategoryItem.name})`,
            'warning'
        );
        return;
    }

    // If this exact item is already in cart, it's already 1 per category — don't allow more
    const cartItem = window.cart?.getByName(equipment.name);
    if (cartItem) {
        window.showToast(
            `${t.onlyOnePerCategory} (${equipment.type})`,
            'warning'
        );
        return;
    }

    // === Cross-transaction category duplicate check ===
    // ตรวจสอบว่า user มีการยืมอุปกรณ์หมวดหมู่เดียวกันข้ามรายการในวันที่ทับซ้อนหรือไม่
    const filterStart = document.getElementById('startDate')?.value;
    const filterEnd = document.getElementById('endDate')?.value;

    if (filterStart && filterEnd && typeof window.checkCrossCategoryConflict === 'function') {
        try {
            const conflict = await window.checkCrossCategoryConflict(
                equipment.type, filterStart, filterEnd
            );
            if (conflict.hasConflict) {
                window.showToast(
                    `${t.categoryAlreadyBorrowedForDate} (${conflict.conflictCategory}: ${conflict.conflictItem})`,
                    'warning'
                );
                return;
            }
        } catch (err) {
            console.error('Cross-category check error in addToCart:', err);
            // Continue anyway — don't block on check failure
        }
    }

    // Always add quantity = 1 (one per category)
    window.cart.addOrUpdate(equipment.name, equipment.image_url, equipment.type, 1);

    // Close detail modal
    window.closeModal('equipmentDetailModal');
};

window.closeReturnModal = function () {
    const modal = document.getElementById('returnModal');
    const checklistEl = document.getElementById('returnDecisionChecklist');

    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.dataset.transactionId = '';
        modal.dataset.equipmentId = '';
        modal.dataset.equipmentName = '';
        modal.dataset.borrowerName = '';
    }

    ['returnBorrowerName', 'returnItemName', 'returnBorrowedOnValue', 'returnDueOnValue', 'returnDurationValue', 'returnStatusValue', 'returnTimingValue'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '-';
    });

    const messageEl = document.getElementById('returnDecisionMessage');
    if (messageEl) {
        messageEl.className = 'rounded-xl px-3 py-2 text-sm font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300';
        messageEl.textContent = '-';
    }

    if (checklistEl) checklistEl.innerHTML = '';
    const equipmentIdEl = document.getElementById('returnItemId');
    const transactionIdEl = document.getElementById('returnTransactionId');
    if (equipmentIdEl) equipmentIdEl.value = '';
    if (transactionIdEl) transactionIdEl.value = '';
};

window.openReturnPenaltyModal = function () {
    const modal = document.getElementById('returnModal');
    const borrowerName = modal?.dataset.borrowerName || '';
    const equipmentName = modal?.dataset.equipmentName || '';
    const equipmentId = modal?.dataset.equipmentId || '';
    const transactionId = modal?.dataset.transactionId || '';

    if (!borrowerName || !equipmentId) {
        return;
    }

    window.closeReturnModal();
    window.openPenaltyModal?.(borrowerName, borrowerName, Number(equipmentId), equipmentName, transactionId ? Number(transactionId) : null);
};

window.openReturnModal = function (transactionId) {
    const transaction = getReturnModalTransaction(transactionId);
    const t = window.translations[window.currentLang];

    if (!transaction) {
        window.showToast?.(t.errorGeneral, 'error');
        return;
    }

    const equipmentIdEl = document.getElementById('returnItemId');
    const transactionIdEl = document.getElementById('returnTransactionId');
    const modal = document.getElementById('returnModal');

    if (equipmentIdEl) equipmentIdEl.value = transaction.equipment_id || '';
    if (transactionIdEl) transactionIdEl.value = transaction.id || '';

    populateReturnModal(transaction);

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

function getManageGroupSnapshot(groupName) {
    const items = groupName
        ? (window.equipments || []).filter(equipment => equipment.name === groupName)
        : [];
    const availableQuantity = items.filter(item => item.status === 'available').length;

    return {
        items,
        totalQuantity: items.length,
        availableQuantity,
        borrowedQuantity: Math.max(0, items.length - availableQuantity)
    };
}

window.updateManageImagePreview = function () {
    const imageInput = document.getElementById('manageImage');
    const preview = document.getElementById('manageImagePreview');
    const emptyState = document.getElementById('manageImagePreviewEmpty');
    const imageUrl = imageInput?.value?.trim() || '';

    if (!preview || !emptyState) return;

    if (!imageUrl) {
        preview.removeAttribute('src');
        preview.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    preview.src = imageUrl;
};

window.getManageModalState = function () {
    const t = window.translations[window.currentLang];
    const originalName = document.getElementById('manageOriginalName')?.value || '';
    const name = document.getElementById('manageName')?.value?.trim() || '';
    const type = document.getElementById('manageType')?.value || '';
    const image = document.getElementById('manageImage')?.value?.trim() || '';
    const purchaseYearRaw = document.getElementById('managePurchaseYear')?.value || '';
    const purchaseYear = purchaseYearRaw ? parseInt(purchaseYearRaw, 10) : null;
    const quantityValue = document.getElementById('manageQuantity')?.value || '1';
    const plannedQuantity = parseInt(quantityValue, 10);
    const yearMax = new Date().getFullYear() + 1;
    const isEdit = Boolean(originalName);
    const snapshot = getManageGroupSnapshot(originalName);

    let validationMessage = '';
    if (!name) {
        validationMessage = t.manageValidationName;
    } else if (!image) {
        validationMessage = t.manageValidationImage;
    } else if (!type) {
        validationMessage = t.manageValidationType;
    } else if (purchaseYearRaw && (Number.isNaN(purchaseYear) || purchaseYear < 1990 || purchaseYear > yearMax)) {
        validationMessage = `${t.manageValidationYear} (1990-${yearMax})`;
    } else if (Number.isNaN(plannedQuantity) || plannedQuantity < 1 || plannedQuantity > 100) {
        validationMessage = t.manageValidationQuantity;
    } else if (isEdit && plannedQuantity < snapshot.borrowedQuantity) {
        validationMessage = t.manageValidationBorrowedFloor;
    }

    return {
        originalName,
        name,
        type,
        image,
        purchaseYearRaw,
        purchaseYear,
        plannedQuantity: Number.isNaN(plannedQuantity) ? 0 : plannedQuantity,
        isEdit,
        validationMessage,
        isValid: !validationMessage,
        ...snapshot
    };
};

window.resetManageDeleteState = function () {
    const t = window.translations[window.currentLang];
    const deleteBtn = document.getElementById('manageDeleteBtn');
    const cancelBtn = document.getElementById('manageDeleteCancelBtn');

    if (deleteBtn) {
        deleteBtn.dataset.confirmed = 'false';
        deleteBtn.textContent = t.manageDeleteAction;
        deleteBtn.classList.remove('bg-red-500', 'text-white', 'border-red-500');
        deleteBtn.classList.add('border-red-300', 'text-red-600');
    }

    if (cancelBtn) {
        cancelBtn.classList.add('hidden');
    }
};

window.refreshManageModalState = function () {
    const t = window.translations[window.currentLang];
    const state = window.getManageModalState();
    const validationEl = document.getElementById('manageValidationMessage');
    const summaryEl = document.getElementById('manageSummaryMessage');
    const currentQuantityEl = document.getElementById('manageCurrentQuantityValue');
    const plannedQuantityEl = document.getElementById('managePlannedQuantityValue');
    const availabilityEl = document.getElementById('manageAvailabilityValue');
    const impactEl = document.getElementById('manageImpactValue');
    const quantityHint = document.getElementById('manageQuantityHint');
    const modeBadge = document.getElementById('manageModeBadge');
    const deleteSection = document.getElementById('manageDeleteSection');
    const deleteState = document.getElementById('manageDeleteState');
    const deleteBtn = document.getElementById('manageDeleteBtn');
    const saveBtn = document.getElementById('manageSaveBtn');

    let impactText = t.manageImpactNoChange;
    if (state.isEdit) {
        const diff = state.plannedQuantity - state.totalQuantity;
        if (state.plannedQuantity < state.borrowedQuantity) {
            impactText = t.manageImpactBlocked;
        } else if (diff > 0) {
            impactText = `${t.manageImpactIncrease} +${diff} ${t.pieces}`;
        } else if (diff < 0) {
            impactText = `${t.manageImpactDecrease} ${Math.abs(diff)} ${t.pieces}`;
        }
    } else {
        impactText = `${t.manageImpactIncrease} ${state.plannedQuantity || 0} ${t.pieces}`;
    }

    if (validationEl) {
        if (state.validationMessage) {
            validationEl.textContent = state.validationMessage;
            validationEl.className = 'rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200';
            validationEl.classList.remove('hidden');
        } else {
            validationEl.textContent = '';
            validationEl.className = 'hidden rounded-xl px-4 py-3 text-sm font-medium';
        }
    }

    if (summaryEl) {
        summaryEl.textContent = state.isValid
            ? (state.isEdit ? t.manageReadyUpdate : t.manageReadyCreate)
            : t.manageNeedsAttention;
        summaryEl.className = state.isValid
            ? 'mt-2 rounded-xl px-3 py-2 text-sm font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'
            : 'mt-2 rounded-xl px-3 py-2 text-sm font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
    }

    if (currentQuantityEl) currentQuantityEl.textContent = String(state.totalQuantity);
    if (plannedQuantityEl) plannedQuantityEl.textContent = String(state.plannedQuantity || 0);
    if (availabilityEl) availabilityEl.textContent = `${state.availableQuantity} / ${state.borrowedQuantity}`;
    if (impactEl) impactEl.textContent = impactText;

    if (quantityHint) {
        quantityHint.textContent = state.isEdit
            ? `${t.manageQuantityEditHint} (${state.availableQuantity}/${state.totalQuantity} ${t.available})`
            : t.manageQuantityCreateHint;
    }

    if (modeBadge) {
        modeBadge.textContent = state.isEdit ? t.manageModeEdit : t.manageModeCreate;
    }

    if (deleteSection) {
        if (state.isEdit) {
            deleteSection.classList.remove('hidden');
        } else {
            deleteSection.classList.add('hidden');
        }
    }

    if (deleteState) {
        deleteState.textContent = state.isEdit
            ? (state.borrowedQuantity === 0 ? t.manageDeleteReady : t.manageDeleteBlocked)
            : '-';
    }

    if (deleteBtn) {
        const canDelete = state.isEdit && state.totalQuantity > 0 && state.borrowedQuantity === 0;
        deleteBtn.disabled = !canDelete;
        deleteBtn.classList.toggle('opacity-50', !canDelete);
        deleteBtn.classList.toggle('cursor-not-allowed', !canDelete);
    }

    if (saveBtn) {
        saveBtn.disabled = !state.isValid;
        saveBtn.classList.toggle('opacity-60', !state.isValid);
        saveBtn.classList.toggle('cursor-not-allowed', !state.isValid);
    }

    window.updateManageImagePreview();
    return state;
};

window.bindManageModalEvents = function () {
    if (window._manageModalBound) return;

    ['manageName', 'manageType', 'manageImage', 'managePurchaseYear', 'manageQuantity'].forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        const eventName = element.tagName === 'SELECT' ? 'change' : 'input';
        element.addEventListener(eventName, () => {
            if (id === 'managePurchaseYear') {
                window.updatePurchaseYearHint();
            }
            window.refreshManageModalState();
        });
    });

    window._manageModalBound = true;
};

window.handleManageDeleteAction = async function () {
    const t = window.translations[window.currentLang];
    const state = window.refreshManageModalState();
    const deleteBtn = document.getElementById('manageDeleteBtn');
    const cancelBtn = document.getElementById('manageDeleteCancelBtn');

    if (!state.isEdit || state.borrowedQuantity > 0 || state.totalQuantity === 0) {
        window.showToast?.(t.manageDeleteBlocked, 'warning');
        return;
    }

    if (deleteBtn?.dataset.confirmed !== 'true') {
        if (deleteBtn) {
            deleteBtn.dataset.confirmed = 'true';
            deleteBtn.textContent = t.manageDeleteConfirm;
            deleteBtn.classList.add('bg-red-500', 'text-white', 'border-red-500');
            deleteBtn.classList.remove('border-red-300', 'text-red-600');
        }
        if (cancelBtn) {
            cancelBtn.classList.remove('hidden');
        }
        return;
    }

    await window.deleteEquipmentGroup?.();
};

window.openManageModal = function (groupName = null) {
    const t = window.translations[window.currentLang];
    const nameInput = document.getElementById('manageName');
    const typeInput = document.getElementById('manageType');
    const imageInput = document.getElementById('manageImage');
    const purchaseYearInput = document.getElementById('managePurchaseYear');
    const purchaseYearHint = document.getElementById('managePurchaseYearHint');
    const qtyGroup = document.getElementById('manageQuantityGroup');
    const qtyHint = document.getElementById('manageQuantityHint');
    const modalTitle = document.getElementById('manageModalTitle');

    window.bindManageModalEvents();
    if (groupName) {
        const snapshot = getManageGroupSnapshot(groupName);
        const firstItem = snapshot.items[0];
        if (!firstItem) return;

        modalTitle.textContent = `${t.edit} ${groupName}`;
        nameInput.value = firstItem.name;
        typeInput.value = firstItem.type;
        imageInput.value = firstItem.image_url;
        document.getElementById('manageOriginalName').value = groupName;

        if (purchaseYearInput) {
            purchaseYearInput.value = firstItem.purchase_year || '';
        }
        window.updatePurchaseYearHint();

        document.getElementById('manageQuantity').value = snapshot.totalQuantity;
        if (qtyHint) qtyHint.textContent = t.manageQuantityEditHint;
        qtyGroup.classList.remove('hidden');
    } else {
        modalTitle.textContent = t.addEquipment;
        nameInput.value = '';
        typeInput.value = 'Camera';
        imageInput.value = '';
        document.getElementById('manageQuantity').value = 1;
        document.getElementById('manageOriginalName').value = '';
        if (purchaseYearInput) purchaseYearInput.value = '';
        if (purchaseYearHint) purchaseYearHint.textContent = '';
        if (qtyHint) qtyHint.textContent = t.manageQuantityCreateHint;
        qtyGroup.classList.remove('hidden');
    }

    window.resetManageDeleteState();
    window.refreshManageModalState();
    window.openModal('manageModal');
};

window.closeManageModal = function () {
    const modal = document.getElementById('manageModal');
    const nameInput = document.getElementById('manageName');
    const typeInput = document.getElementById('manageType');
    const imageInput = document.getElementById('manageImage');
    const purchaseYearInput = document.getElementById('managePurchaseYear');
    const quantityInput = document.getElementById('manageQuantity');
    const originalName = document.getElementById('manageOriginalName');
    const validationEl = document.getElementById('manageValidationMessage');
    const preview = document.getElementById('manageImagePreview');
    const emptyState = document.getElementById('manageImagePreviewEmpty');
    const title = document.getElementById('manageModalTitle');
    const t = window.translations[window.currentLang];

    if (modal) {
        modal.classList.add('hidden');
    }

    if (nameInput) nameInput.value = '';
    if (typeInput) typeInput.value = 'Camera';
    if (imageInput) imageInput.value = '';
    if (purchaseYearInput) purchaseYearInput.value = '';
    if (quantityInput) quantityInput.value = 1;
    if (originalName) originalName.value = '';
    if (title) title.textContent = t.addEquipment;
    if (validationEl) {
        validationEl.textContent = '';
        validationEl.className = 'hidden rounded-xl px-4 py-3 text-sm font-medium';
    }
    if (preview) {
        preview.removeAttribute('src');
        preview.classList.add('hidden');
    }
    if (emptyState) {
        emptyState.classList.remove('hidden');
    }

    window.updatePurchaseYearHint();
    window.resetManageDeleteState();
    window.refreshManageModalState();
};

// Calculate equipment age from purchase year
window.calculateEquipmentAge = function (purchaseYear) {
    if (!purchaseYear) return null;
    const currentYear = new Date().getFullYear();
    return currentYear - purchaseYear;
};

// Update the purchase year hint to show calculated age
window.updatePurchaseYearHint = function () {
    const input = document.getElementById('managePurchaseYear');
    const hint = document.getElementById('managePurchaseYearHint');
    const t = window.translations[window.currentLang];
    if (!input || !hint) return;

    const year = parseInt(input.value);
    if (!year || isNaN(year)) {
        hint.textContent = t?.purchaseYearHint || '';
        hint.className = 'text-xs text-gray-400 mt-1';
        return;
    }

    const age = window.calculateEquipmentAge(year);
    if (age === null || age < 0) {
        hint.textContent = t?.purchaseYearHint || '';
        hint.className = 'text-xs text-gray-400 mt-1';
        return;
    }

    if (age === 0) {
        hint.textContent = `✨ ${t?.newEquipment || 'New (this year)'}`;
        hint.className = 'text-xs text-green-500 mt-1 font-medium';
    } else if (age >= 10) {
        hint.textContent = `⚠️ ${t?.ageCalculation || 'Age'}: ${age} ${t?.yearUnit || 'years'} (ควรพิจารณาเปลี่ยนทดแทน)`;
        hint.className = 'text-xs text-amber-500 mt-1 font-medium';
    } else {
        hint.textContent = `${t?.ageCalculation || 'Age'}: ${age} ${t?.yearUnit || 'years'}`;
        hint.className = 'text-xs text-gray-400 mt-1';
    }
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

function getPenaltySeverityLabel(severity) {
    if (!severity) return '-';

    const isThai = window.currentLang === 'th';
    const labels = {
        low: isThai ? 'ต่ำ' : 'Low',
        medium: isThai ? 'ปานกลาง' : 'Medium',
        high: isThai ? 'สูง' : 'High',
        critical: isThai ? 'ร้ายแรงมาก' : 'Critical'
    };

    return labels[severity] || severity;
}

function getPenaltyBanEffectText(totalStrikes) {
    const t = window.translations[window.currentLang];
    const banInfo = window.calculateBanDuration?.(totalStrikes) || { days: 0, permanent: false };

    if (banInfo.permanent) {
        return t.penaltyPermanentBan;
    }
    if (banInfo.days > 0) {
        return `${t.penaltyTemporaryBan} (${banInfo.days} ${t.dayUnit})`;
    }
    return t.penaltyNoBan;
}

function setPenaltyImpactPreview(values = {}) {
    const currentStrikesEl = document.getElementById('penaltyCurrentStrikesValue');
    const projectedStrikesEl = document.getElementById('penaltyProjectedStrikesValue');
    const severityEl = document.getElementById('penaltySeverityValue');
    const compensationStatusEl = document.getElementById('penaltyCompensationStatusValue');
    const banEffectEl = document.getElementById('penaltyBanEffectValue');

    if (currentStrikesEl) currentStrikesEl.textContent = values.currentStrikes ?? '-';
    if (projectedStrikesEl) projectedStrikesEl.textContent = values.projectedStrikes ?? '-';
    if (severityEl) severityEl.textContent = values.severity ?? '-';
    if (compensationStatusEl) compensationStatusEl.textContent = values.compensationStatus ?? '-';
    if (banEffectEl) banEffectEl.textContent = values.banEffect ?? '-';
}

async function loadPenaltyUserProfile(userId) {
    const t = window.translations[window.currentLang];
    const modal = document.getElementById('penaltyModal');

    setPenaltyImpactPreview({
        currentStrikes: t.penaltyProfileLoading,
        projectedStrikes: '-',
        severity: '-',
        compensationStatus: t.penaltyCompensationNone,
        banEffect: '-'
    });

    if (!window.supabaseClient || !userId || !modal) {
        modal?.setAttribute('data-current-strikes', '0');
        updatePenaltyImpactPreview();
        return;
    }

    try {
        const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('total_strikes')
            .eq('username', userId)
            .single();

        if (error) {
            console.error('Error loading penalty profile:', error);
        }

        modal.setAttribute('data-current-strikes', String(user?.total_strikes || 0));
    } catch (err) {
        console.error('loadPenaltyUserProfile exception:', err);
        modal.setAttribute('data-current-strikes', '0');
    }

    updatePenaltyImpactPreview();
}

function updatePenaltyImpactPreview() {
    const t = window.translations[window.currentLang];
    const modal = document.getElementById('penaltyModal');
    const penaltyType = document.getElementById('penaltyType')?.value || '';
    const daysLate = parseInt(document.getElementById('penaltyDaysLate')?.value, 10) || 1;
    const compensationAmount = parseFloat(document.getElementById('penaltyCompensation')?.value) || 0;
    const strikePreview = document.getElementById('strikePreview');
    const strikeCount = document.getElementById('strikeCount');
    const currentStrikes = parseInt(modal?.getAttribute('data-current-strikes') || '0', 10) || 0;

    if (!penaltyType) {
        if (strikePreview) strikePreview.classList.add('hidden');
        setPenaltyImpactPreview({
            currentStrikes,
            projectedStrikes: currentStrikes,
            severity: '-',
            compensationStatus: t.penaltyCompensationNone,
            banEffect: getPenaltyBanEffectText(currentStrikes)
        });
        return;
    }

    const { strikes, severity } = window.calculateStrikes?.(penaltyType, daysLate) || { strikes: 0, severity: '' };
    const projectedStrikes = currentStrikes + strikes;
    const needsCompensation = ['major_damage', 'severe_damage', 'lost'].includes(penaltyType) && compensationAmount > 0;

    if (strikeCount) strikeCount.textContent = strikes;
    if (strikePreview) strikePreview.classList.remove('hidden');

    setPenaltyImpactPreview({
        currentStrikes,
        projectedStrikes,
        severity: getPenaltySeverityLabel(severity),
        compensationStatus: needsCompensation ? t.penaltyCompensationPending : t.penaltyCompensationNone,
        banEffect: getPenaltyBanEffectText(projectedStrikes)
    });
}

function bindPenaltyModalEvents() {
    const penaltyType = document.getElementById('penaltyType');
    const penaltyDaysLate = document.getElementById('penaltyDaysLate');
    const penaltyCompensation = document.getElementById('penaltyCompensation');

    if (!penaltyType || penaltyType.dataset.bound === 'true') {
        return;
    }

    penaltyType.addEventListener('change', window.onPenaltyTypeChange);
    penaltyDaysLate?.addEventListener('input', window.onDaysLateChange);
    penaltyCompensation?.addEventListener('input', updatePenaltyImpactPreview);
    penaltyType.dataset.bound = 'true';
}

// Open penalty modal
window.openPenaltyModal = async function (userId, userName, equipmentId, equipmentName, transactionId) {
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

    const modal = document.getElementById('penaltyModal');
    modal?.setAttribute('data-current-strikes', '0');
    bindPenaltyModalEvents();
    updatePenaltyImpactPreview();

    document.getElementById('penaltyModal').classList.remove('hidden');
    await loadPenaltyUserProfile(userId);
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

    // Reset days late when switching away from late_return
    if (penaltyType !== 'late_return') {
        document.getElementById('penaltyDaysLate').value = '1';
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

    updatePenaltyImpactPreview();
};

// Days late change handler - update strike preview
window.onDaysLateChange = function () {
    const penaltyType = document.getElementById('penaltyType').value;
    if (penaltyType === 'late_return') {
        window.onPenaltyTypeChange();
        return;
    }

    updatePenaltyImpactPreview();
};

function _renderPenaltyHistoryItems(penalties) {
    const t = window.translations?.[window.currentLang] || {};
    const locale = window.currentLang === 'th' ? 'th-TH' : 'en-US';
    const list = document.getElementById('penaltyHistoryList');
    if (!list) return;

    if (!penalties || penalties.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm font-medium">${t.penaltyHistoryEmpty || 'No penalty records'}</p>
            </div>
        `;
        return;
    }

    const typeLabels = {
        late_return: t.penaltyHistoryLateReturn || 'Late return',
        no_show: t.penaltyHistoryNoShow || 'No-show',
        minor_damage: t.penaltyHistoryMinorDamage || 'Minor damage',
        major_damage: t.penaltyHistoryMajorDamage || 'Major damage',
        severe_damage: t.penaltyHistorySevereDamage || 'Severe damage',
        lost: t.penaltyHistoryLost || 'Lost'
    };

    const severityIcon = { low: '⚠️', medium: '🔶', high: '🔴', critical: '🚨' };
    const severityBorder = { low: 'border-yellow-400', medium: 'border-orange-500', high: 'border-red-500', critical: 'border-red-700' };
    const severityBadge = {
        low: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        medium: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
        high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        critical: 'bg-red-600 text-white'
    };

    list.innerHTML = penalties.map(penalty => {
        const dateStr = penalty.created_at
            ? new Date(penalty.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
            : '-';
        const icon = severityIcon[penalty.severity] || '⚠️';
        const borderCls = severityBorder[penalty.severity] || 'border-gray-300';
        const badgeCls = severityBadge[penalty.severity] || 'bg-gray-100 text-gray-700';
        const typeLabel = typeLabels[penalty.penalty_type] || penalty.penalty_type;
        const compText = penalty.compensation_status === 'paid'
            ? `<span class="text-emerald-600 dark:text-emerald-400 font-semibold">${t.penaltyHistoryCompPaid || 'Paid'}</span>`
            : `<span class="text-orange-500 font-semibold">${t.penaltyHistoryCompPending || 'Pending'}</span>`;

        return `
        <div class="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-4 mb-3 border-l-4 ${borderCls} transition-all hover:shadow-sm">
            <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-base leading-none">${icon}</span>
                    <span class="font-bold text-gray-900 dark:text-white text-sm">${window.escapeHtml?.(penalty.user_id) || penalty.user_id}</span>
                    <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${badgeCls}">${typeLabel}</span>
                </div>
                <span class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">${dateStr}</span>
            </div>
            <div class="text-xs text-gray-600 dark:text-gray-300 space-y-0.5 pl-6">
                <p>${penalty.equipments?.name ? `📦 ${window.escapeHtml?.(penalty.equipments.name) || penalty.equipments.name}` : ''}</p>
                ${penalty.days_late > 0 ? `<p>🕐 ${t.dayUnit ? `${penalty.days_late} ${t.dayUnit}` : `${penalty.days_late} days`}</p>` : ''}
                ${penalty.description ? `<p class="text-gray-500 italic">${window.escapeHtml?.(penalty.description) || penalty.description}</p>` : ''}
                <p class="text-red-500 dark:text-red-400 font-bold pt-1">+${penalty.strikes_given} Strike</p>
                ${penalty.compensation_amount > 0 ? `<p>💰 ${penalty.compensation_amount.toLocaleString()} ${window.currentLang === 'th' ? 'บาท' : 'THB'} · ${compText}</p>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Open penalty history modal
window.openPenaltyHistoryModal = async function (userId = null) {
    const t = window.translations?.[window.currentLang] || {};
    const modal = document.getElementById('penaltyHistoryModal');
    const searchInput = document.getElementById('penaltyHistorySearchInput');
    modal.classList.remove('hidden');
    if (searchInput) searchInput.value = '';
    document.getElementById('penaltyHistoryList').innerHTML = `<div class="text-center py-8 text-gray-400">${t.loading || 'Loading...'}</div>`;

    const penalties = userId
        ? await window.getUserPenalties(userId)
        : await window.fetchAllPenalties();

    window._penaltyHistoryData = penalties || [];
    _renderPenaltyHistoryItems(window._penaltyHistoryData);
};

// Client-side search filter for penalty history
window.filterPenaltyHistoryList = function () {
    const q = (document.getElementById('penaltyHistorySearchInput')?.value || '').trim().toLowerCase();
    const data = window._penaltyHistoryData || [];
    const filtered = q ? data.filter(p => (p.user_id || '').toLowerCase().includes(q) || (p.equipments?.name || '').toLowerCase().includes(q)) : data;
    _renderPenaltyHistoryItems(filtered);
};

// Close penalty history modal
window.closePenaltyHistoryModal = function () {
    document.getElementById('penaltyHistoryModal').classList.add('hidden');
    window._penaltyHistoryData = [];
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
