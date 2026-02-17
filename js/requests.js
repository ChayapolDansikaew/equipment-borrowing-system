// Request Module - จัดการคำขอยืมอุปกรณ์ (Supabase)
window.requests = {
    // ดึง requests ทั้งหมดจาก Supabase (พร้อม items)
    async getAll() {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('borrow_requests')
                .select('*, borrow_request_items(*)')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching requests:', error);
                return [];
            }

            // Map to legacy format for compatibility
            return (data || []).map(r => ({
                id: r.id,
                userId: r.user_id,
                userName: r.user_name,
                startDate: r.start_date,
                endDate: r.end_date,
                note: r.note || '',
                createdAt: r.created_at,
                items: (r.borrow_request_items || []).map(item => ({
                    name: item.name,
                    image: item.image,
                    category: item.category,
                    quantity: item.quantity,
                    status: item.status,
                    approvedAt: item.approved_at,
                    approvedBy: item.approved_by,
                    rejectionReason: item.rejection_reason || ''
                }))
            }));
        } catch (err) {
            console.error('getAll exception:', err);
            return [];
        }
    },

    // สร้างคำขอใหม่
    async create(items, startDate, endDate, note = '') {
        if (!window.supabaseClient) return null;
        try {
            // 1. Insert request header
            const { data: reqData, error: reqError } = await window.supabaseClient
                .from('borrow_requests')
                .insert([{
                    user_id: window.currentUser?.id || null,
                    user_name: window.currentUser?.username || 'Unknown User',
                    start_date: startDate,
                    end_date: endDate,
                    note: note || ''
                }])
                .select()
                .single();

            if (reqError) {
                console.error('Error creating request:', reqError);
                return null;
            }

            // 2. Insert request items
            const itemRows = items.map(item => ({
                request_id: reqData.id,
                name: item.name,
                image: item.image || '',
                category: item.category || '',
                quantity: item.quantity || 1,
                status: 'pending'
            }));

            const { error: itemError } = await window.supabaseClient
                .from('borrow_request_items')
                .insert(itemRows);

            if (itemError) {
                console.error('Error creating request items:', itemError);
                // Rollback: delete the request header
                await window.supabaseClient
                    .from('borrow_requests')
                    .delete()
                    .eq('id', reqData.id);
                return null;
            }

            // Clear cart after submission
            window.cart.clear();

            return {
                id: reqData.id,
                userId: reqData.user_id,
                userName: reqData.user_name,
                startDate: reqData.start_date,
                endDate: reqData.end_date,
                note: reqData.note,
                createdAt: reqData.created_at,
                items: itemRows
            };
        } catch (err) {
            console.error('create exception:', err);
            return null;
        }
    },

    // อัปเดตสถานะ item ใน request (สำหรับ admin)
    async updateItemStatus(requestId, itemName, status, rejectionReason = '') {
        if (!window.supabaseClient) return false;
        try {
            const updateData = {
                status: status,
                approved_at: new Date().toISOString(),
                approved_by: window.currentUser?.username || 'admin'
            };
            if (status === 'rejected') {
                updateData.rejection_reason = rejectionReason;
            }

            const { error } = await window.supabaseClient
                .from('borrow_request_items')
                .update(updateData)
                .eq('request_id', requestId)
                .eq('name', itemName);

            if (error) {
                console.error('Error updating item status:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('updateItemStatus exception:', err);
            return false;
        }
    },

    // ดึง requests ของ user ปัจจุบัน
    async getMyRequests() {
        if (!window.supabaseClient) return [];
        const userId = window.currentUser?.id;
        if (!userId) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('borrow_requests')
                .select('*, borrow_request_items(*)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching my requests:', error);
                return [];
            }

            return (data || []).map(r => ({
                id: r.id,
                userId: r.user_id,
                userName: r.user_name,
                startDate: r.start_date,
                endDate: r.end_date,
                note: r.note || '',
                createdAt: r.created_at,
                items: (r.borrow_request_items || []).map(item => ({
                    name: item.name,
                    image: item.image,
                    category: item.category,
                    quantity: item.quantity,
                    status: item.status,
                    approvedAt: item.approved_at,
                    approvedBy: item.approved_by,
                    rejectionReason: item.rejection_reason || ''
                }))
            }));
        } catch (err) {
            console.error('getMyRequests exception:', err);
            return [];
        }
    },

    // ดึง requests ที่รออนุมัติ (สำหรับ admin)
    async getPendingRequests() {
        if (!window.supabaseClient) return [];
        try {
            // Get request IDs that have pending items
            const { data: pendingItems, error: itemError } = await window.supabaseClient
                .from('borrow_request_items')
                .select('request_id')
                .eq('status', 'pending');

            if (itemError || !pendingItems || pendingItems.length === 0) return [];

            const requestIds = [...new Set(pendingItems.map(i => i.request_id))];

            const { data, error } = await window.supabaseClient
                .from('borrow_requests')
                .select('*, borrow_request_items(*)')
                .in('id', requestIds)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching pending requests:', error);
                return [];
            }

            return (data || []).map(r => ({
                id: r.id,
                userId: r.user_id,
                userName: r.user_name,
                startDate: r.start_date,
                endDate: r.end_date,
                note: r.note || '',
                createdAt: r.created_at,
                items: (r.borrow_request_items || []).map(item => ({
                    name: item.name,
                    image: item.image,
                    category: item.category,
                    quantity: item.quantity,
                    status: item.status,
                    approvedAt: item.approved_at,
                    approvedBy: item.approved_by,
                    rejectionReason: item.rejection_reason || ''
                }))
            }));
        } catch (err) {
            console.error('getPendingRequests exception:', err);
            return [];
        }
    },

    // ลบ request
    async delete(requestId) {
        if (!window.supabaseClient) return false;
        try {
            const { error } = await window.supabaseClient
                .from('borrow_requests')
                .delete()
                .eq('id', requestId);

            if (error) {
                console.error('Error deleting request:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('delete exception:', err);
            return false;
        }
    }
};

// เปิด Request Form Modal
window.openRequestForm = function () {
    if (window.cart.items.length === 0) {
        const t = window.translations[window.currentLang];
        window.showToast?.(t.selectEquipmentFirst, 'warning');
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
window.submitBorrowRequest = async function () {
    const startDate = document.getElementById('requestStartDate').value;
    const endDate = document.getElementById('requestEndDate').value;
    const note = document.getElementById('requestNote').value;

    const t = window.translations[window.currentLang];

    if (!startDate || !endDate) {
        window.showToast?.(t.selectBorrowDates, 'warning');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        window.showToast?.(t.endDateAfterStart, 'warning');
        return;
    }

    // Create request (async)
    const request = await window.requests.create(window.cart.items, startDate, endDate, note);

    if (request) {
        closeRequestForm();
        window.showToast?.(t.requestSentSuccess, 'success');

        // Refresh equipment list
        if (typeof window.renderEquipments === 'function') {
            window.renderEquipments();
        }

        // Update pending badge
        await window.initPendingBadge?.();
    }
};

// ============== ADMIN FUNCTIONS ==============

// เปิด Pending Requests Modal
window.openPendingRequestsModal = async function () {
    const modal = document.getElementById('pendingRequestsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        await renderPendingRequests();
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
async function renderPendingRequests() {
    const container = document.getElementById('pendingRequestsList');
    if (!container) return;

    const pendingRequests = await window.requests.getPendingRequests();

    if (pendingRequests.length === 0) {
        const t = window.translations[window.currentLang];
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-lg font-medium">${t.noPendingRequests}</p>
            </div>
        `;
        updatePendingBadge(0);
        return;
    }

    let totalPending = 0;
    const t = window.translations[window.currentLang];
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
                    <div class="flex items-center gap-2">
                        ${pendingItems.length > 1 ? `
                            <button onclick="approveAllItems('${request.id}')" 
                                class="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors cursor-pointer">
                                ${t.approveAll}
                            </button>
                        ` : ''}
                        <span class="px-2 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">${pendingItems.length} ${t.pendingCount}</span>
                    </div>
                </div>
                
                <!-- Items -->
                <div class="space-y-2">
                    ${request.items.map(item => {
            if (item.status !== 'pending') {
                const statusBadge = item.status === 'approved'
                    ? `<span class="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">${t.approved}</span>`
                    : `<span class="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">${t.rejected}</span>`;
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
                                        ${t.approve}
                                    </button>
                                    <button onclick="rejectItem('${request.id}', '${item.name}')" 
                                        class="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors cursor-pointer">
                                        ${t.reject}
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
    const locale = window.currentLang === 'th' ? 'th-TH' : 'en-US';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

// Update pending badge (desktop + mobile)
function updatePendingBadge(count) {
    const badge = document.getElementById('pendingBadge');
    const mobileBadge = document.getElementById('mobilePendingBadge');
    const bellBtn = document.getElementById('pendingRequestsBtn');

    [badge, mobileBadge].forEach(el => {
        if (el) {
            el.textContent = count;
            el.classList.toggle('hidden', count === 0);
        }
    });

    // Pulse animation on bell when there are pending items
    if (bellBtn) {
        if (count > 0) {
            bellBtn.classList.add('bell-has-notifications');
        } else {
            bellBtn.classList.remove('bell-has-notifications');
        }
    }
}

// Approve an item - สร้าง transactions จริงใน Supabase
window.approveItem = async function (requestId, itemName) {
    // Get the request to find details
    const requests = await window.requests.getAll();
    const request = requests.find(r => r.id === requestId);
    const t = window.translations[window.currentLang];
    if (!request) {
        window.showToast?.(t.requestNotFound, 'error');
        return;
    }

    const item = request.items.find(i => i.name === itemName);
    if (!item) {
        window.showToast?.(t.equipmentNotFound, 'error');
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

        // Update request status in Supabase
        const success = await window.requests.updateItemStatus(requestId, itemName, 'approved');

        if (success) {
            window.showToast?.(`${t.approve} ${itemName} (${quantity} ${t.pieces}) ✓`, 'success');
            await renderPendingRequests();
            // Refresh equipment list
            window.fetchEquipments?.();

            // Send approval email notification
            const approvedItem = { name: itemName, quantity: quantity };
            window.sendApprovalEmail?.(request, [approvedItem]);
        }
    } catch (err) {
        console.error('Approve error:', err);
        window.showToast?.(t.approveError, 'error');
    }
};

// Reject an item
window.rejectItem = async function (requestId, itemName) {
    const t = window.translations[window.currentLang];
    const reason = prompt(t.rejectionReasonPrompt);
    if (reason === null) return; // User cancelled
    const success = await window.requests.updateItemStatus(requestId, itemName, 'rejected', reason || '');
    if (success) {
        window.showToast?.(t.rejectedSuccess, 'info');
        await renderPendingRequests();
    }
};

// Approve ALL pending items in a request - sends only ONE email
window.approveAllItems = async function (requestId) {
    const requests = await window.requests.getAll();
    const request = requests.find(r => r.id === requestId);
    const t = window.translations[window.currentLang];
    if (!request) {
        window.showToast?.(t.requestNotFound, 'error');
        return;
    }

    const pendingItems = request.items.filter(i => i.status === 'pending');
    if (pendingItems.length === 0) {
        window.showToast?.(t.noPendingItems, 'info');
        return;
    }

    // Confirm action
    if (!confirm(`${t.approveAll} ${pendingItems.length}?`)) {
        return;
    }

    const approvedItems = [];
    let successCount = 0;

    try {
        for (const item of pendingItems) {
            const itemName = item.name;
            const quantity = item.quantity || 1;

            // Find available equipment units
            const availableUnits = window.equipments.filter(e =>
                e.name === itemName && e.status === 'available'
            );

            if (availableUnits.length < quantity) {
                window.showToast?.(`${itemName}: มีไม่พอ (ว่าง ${availableUnits.length}/${quantity})`, 'error');
                continue;
            }

            const unitsToBorrow = availableUnits.slice(0, quantity);

            // Create transactions
            for (const unit of unitsToBorrow) {
                const { error: updateError } = await window.supabaseClient
                    .from('equipments')
                    .update({ status: 'borrowed' })
                    .eq('id', unit.id);

                if (updateError) continue;

                await window.supabaseClient
                    .from('transactions')
                    .insert([{
                        equipment_id: unit.id,
                        borrower_name: request.userName,
                        status: 'active',
                        start_date: new Date(request.startDate + 'T00:00:00').toISOString(),
                        end_date: new Date(request.endDate + 'T23:59:59').toISOString()
                    }]);
            }

            // Update Supabase
            await window.requests.updateItemStatus(requestId, itemName, 'approved');
            approvedItems.push({ name: itemName, quantity: quantity });
            successCount++;
        }

        if (successCount > 0) {
            window.showToast?.(`${t.approve} ${successCount} ✓`, 'success');
            await renderPendingRequests();
            window.fetchEquipments?.();

            // Send ONE email for all approved items
            if (approvedItems.length > 0) {
                window.sendApprovalEmail?.(request, approvedItems);
            }
        }
    } catch (err) {
        console.error('Approve all error:', err);
        window.showToast?.(t.approveError, 'error');
    }
};

// Initialize pending badge on page load
window.initPendingBadge = async function () {
    if (window.currentUser?.role === 'admin') {
        const pendingRequests = await window.requests.getPendingRequests();
        const totalPending = pendingRequests.reduce((sum, req) =>
            sum + req.items.filter(item => item.status === 'pending').length, 0
        );
        updatePendingBadge(totalPending);
    }
};

// ============== USER FUNCTIONS ==============

// เปิด My Requests Modal
window.openMyRequestsModal = async function () {
    const modal = document.getElementById('myRequestsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        await renderMyRequests();
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
async function renderMyRequests() {
    const container = document.getElementById('myRequestsList');
    if (!container) return;

    // Show loading
    container.innerHTML = '<div class="text-center py-8 text-gray-400">กำลังโหลด...</div>';

    const myRequests = await window.requests.getMyRequests();

    if (myRequests.length === 0) {
        const t = window.translations[window.currentLang];
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p class="text-lg font-medium">${t.noRequests}</p>
                <p class="text-sm">${t.noRequestsDesc}</p>
            </div>
        `;
        return;
    }

    const t = window.translations[window.currentLang];
    container.innerHTML = myRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(request => {
        const dateRange = `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`;
        const locale = window.currentLang === 'th' ? 'th-TH' : 'en-US';
        const createdDate = new Date(request.createdAt).toLocaleDateString(locale, {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                <!-- Request Header -->
                <div class="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
                    <div>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">📅 ${dateRange}</p>
                        <p class="text-xs text-gray-400">${t.sentOn}: ${createdDate}</p>
                        ${request.note ? `<p class="text-xs text-gray-500 mt-1">📝 ${request.note}</p>` : ''}
                    </div>
                    <button onclick="deleteMyRequest('${request.id}')" 
                        class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="${t.deleteRequest}">
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
                statusBadge = `<span class="px-2 py-0.5 bg-green-100 text-green-600 text-xs font-bold rounded-full">${t.approved}</span>`;
                statusBg = '';
            } else if (item.status === 'rejected') {
                statusBadge = `<span class="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">${t.rejected}</span>`;
                statusBg = 'opacity-60';
            } else {
                statusBadge = `<span class="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-bold rounded-full animate-pulse">${t.pendingApproval}</span>`;
                statusBg = '';
            }
            return `
                            <div class="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg ${statusBg}">
                                <img src="${item.image}" alt="${item.name}" class="w-10 h-10 object-cover rounded">
                                <span class="flex-1 text-sm font-medium">${item.name}</span>
                                ${statusBadge}
                            </div>
                            ${item.status === 'rejected' && item.rejectionReason ? `<p class="text-xs text-red-400 ml-13 pl-12">${t.reason}: ${item.rejectionReason}</p>` : ''}
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ลบคำขอของ user
window.deleteMyRequest = async function (requestId) {
    const t = window.translations[window.currentLang];
    if (!confirm(t.confirmDeleteRequest)) return;

    await window.requests.delete(requestId);
    window.showToast?.(t.rejectedSuccess, 'info');
    await renderMyRequests();
};

// --- Email Notification Functions ---

// Initialize EmailJS
window.initEmailJS = function () {
    if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY && !EMAILJS_PUBLIC_KEY.startsWith('YOUR_')) {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        console.log('EmailJS initialized');
        return true;
    }
    console.log('EmailJS not configured - email notifications disabled');
    return false;
};

// ส่ง email แจ้งเมื่ออนุมัติคำขอ
window.sendApprovalEmail = async function (request, approvedItems) {
    // ตรวจสอบว่า EmailJS configured หรือยัง
    if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY.startsWith('YOUR_')) {
        console.log('EmailJS not configured - skipping email');
        return false;
    }

    if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID.startsWith('YOUR_')) {
        console.log('EmailJS Service ID not configured');
        return false;
    }

    if (!EMAILJS_APPROVAL_TEMPLATE || EMAILJS_APPROVAL_TEMPLATE.startsWith('YOUR_')) {
        console.log('EmailJS Approval Template not configured');
        return false;
    }

    try {
        // สร้าง email ของผู้ใช้จาก username (สำหรับ Chula SSO)
        let toEmail = request.userName;
        if (!toEmail.includes('@')) {
            toEmail = request.userName + '@student.chula.ac.th';
        }

        // Format items list
        const itemsList = approvedItems.map(item => `• ${item.name} (x${item.quantity})`).join('\n');

        // Template parameters (ต้องตรงกับ template ใน EmailJS)
        const templateParams = {
            to_name: request.userName,
            to_email: toEmail,
            items: itemsList,
            items_html: approvedItems.map(item => `<li>${item.name} (x${item.quantity})</li>`).join(''),
            start_date: new Date(request.startDate).toLocaleDateString('th-TH'),
            return_date: new Date(request.endDate).toLocaleDateString('th-TH'),
            approved_by: window.currentUser?.username || 'Admin',
            request_id: request.id
        };

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_APPROVAL_TEMPLATE,
            templateParams
        );

        console.log('Approval email sent:', response);
        window.showToast?.('ส่ง email แจ้งเตือนแล้ว', 'success');
        return true;
    } catch (error) {
        console.error('Failed to send approval email:', error);
        // Don't show error to user - email is optional
        return false;
    }
};

// ส่ง email เตือนก่อนครบกำหนดคืน
window.sendReminderEmail = async function (transaction, daysUntilDue) {
    if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY.startsWith('YOUR_')) {
        return false;
    }

    if (!EMAILJS_REMINDER_TEMPLATE || EMAILJS_REMINDER_TEMPLATE.startsWith('YOUR_')) {
        return false;
    }

    try {
        let toEmail = transaction.borrower;
        if (!toEmail.includes('@')) {
            toEmail = transaction.borrower + '@student.chula.ac.th';
        }

        const whenText = daysUntilDue === 0 ? 'วันนี้ / today' :
            daysUntilDue === 1 ? 'พรุ่งนี้ / tomorrow' :
                `ใน ${daysUntilDue} วัน / in ${daysUntilDue} days`;

        const templateParams = {
            to_name: transaction.borrower,
            to_email: toEmail,
            items: transaction.equipment_name,
            return_date: new Date(transaction.return_date).toLocaleDateString('th-TH'),
            when: whenText
        };

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_REMINDER_TEMPLATE,
            templateParams
        );

        console.log('Reminder email sent:', response);
        return true;
    } catch (error) {
        console.error('Failed to send reminder email:', error);
        return false;
    }
};

// --- Badge auto-refresh (Supabase polling) ---

// Periodic polling: refresh pending badge every 15 seconds for admin
let _badgeInterval = null;
function startBadgePolling() {
    stopBadgePolling();
    _badgeInterval = setInterval(async () => {
        await window.initPendingBadge?.();
    }, 15000);
}
function stopBadgePolling() {
    if (_badgeInterval) {
        clearInterval(_badgeInterval);
        _badgeInterval = null;
    }
}

// Start polling after login
const _origShowMainApp = window.showMainApp;
if (typeof _origShowMainApp === 'function') {
    window.showMainApp = function () {
        _origShowMainApp.apply(this, arguments);
        if (window.currentUser?.role === 'admin') {
            startBadgePolling();
        }
    };
}

// Initialize EmailJS on load
document.addEventListener('DOMContentLoaded', () => {
    window.initEmailJS();
});
