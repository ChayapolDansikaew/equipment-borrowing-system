// js/data.js

console.log('Data loaded');

// --- Data Fetching ---

window.fetchEquipments = async function () {
    if (!window.supabaseClient) {
        console.warn('Supabase client not initialized');
        return;
    }

    // Show skeleton loading state
    if (typeof window.showSkeletonLoading === 'function') {
        window.showSkeletonLoading();
    }

    try {
        // Fetch equipments
        const { data: equipData, error: equipError } = await window.supabaseClient
            .from('equipments')
            .select('*')
            .order('id');

        if (equipError) {
            console.error('Error fetching equipments:', equipError);
            window.showToast(window.translations[window.currentLang]?.errorGeneral || 'เกิดข้อผิดพลาด', 'error');
            return;
        }

        if (!equipData) {
            console.warn('No equipment data returned');
            window.equipments = [];
            window.renderEquipments();
            return;
        }

        // Fetch active transactions for borrowed items (checking overlaps)
        const startInput = document.getElementById('startDate');
        const endInput = document.getElementById('endDate');
        const startVal = startInput ? startInput.value : '';
        const endVal = endInput ? endInput.value : '';

        const today = new Date();
        const defaultStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const defaultEnd = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate(), 23, 59, 59);

        const selectedStart = startVal ? new Date(startVal + 'T00:00:00') : defaultStart;
        const selectedEnd = endVal ? new Date(endVal + 'T23:59:59') : defaultEnd;

        let transactionsMap = {};

        const { data: transData, error: transError } = await window.supabaseClient
            .from('transactions')
            .select('equipment_id, borrower_name, borrow_date, start_date, end_date')
            .eq('status', 'active');

        if (!transError && transData) {
            transData.forEach(t => {
                const tStartRaw = new Date(t.start_date || t.borrow_date);
                const tEndRaw = t.end_date ? new Date(t.end_date) : new Date(tStartRaw.getTime() + 86400000);

                const tStart = new Date(tStartRaw.getFullYear(), tStartRaw.getMonth(), tStartRaw.getDate(), 0, 0, 0);
                const tEnd = new Date(tEndRaw.getFullYear(), tEndRaw.getMonth(), tEndRaw.getDate(), 23, 59, 59);

                if (tStart < selectedEnd && tEnd > selectedStart) {
                    if (!transactionsMap[t.equipment_id]) {
                        transactionsMap[t.equipment_id] = [];
                    }
                    transactionsMap[t.equipment_id].push(t);
                }
            });
        }

        // Merge data
        window.equipments = equipData.map(e => {
            const activeTrans = transactionsMap[e.id];
            const isUnavailable = activeTrans && activeTrans.length > 0;

            return {
                ...e,
                status: isUnavailable ? 'borrowed' : 'available',
                transaction: isUnavailable ? activeTrans[0] : null
            };
        });

        window.renderEquipments();
    } catch (err) {
        console.error('fetchEquipments exception:', err);
        window.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
};

window.fetchReturnData = async function () {
    if (!window.supabaseClient) {
        console.warn('Supabase client not initialized');
        return;
    }

    // Show skeleton loading state for table
    if (typeof window.showTableSkeletonLoading === 'function') {
        window.showTableSkeletonLoading();
    }
    window.setLoading(true);

    try {
        const { data, error } = await window.supabaseClient
            .from('transactions')
            .select(`*, equipments ( name, image_url, type )`)
            .eq('status', 'active')
            .order('borrow_date', { ascending: false });

        window.setLoading(false);

        if (error) {
            console.error('Error fetching return data:', error);
            window.showToast(window.translations[window.currentLang]?.errorGeneral || 'เกิดข้อผิดพลาด', 'error');
            return;
        }

        window.renderReturnTable(data || []);
    } catch (err) {
        console.error('fetchReturnData exception:', err);
        window.setLoading(false);
        window.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
};

// --- Borrowing History ---
window._historyData = [];
window._historyPage = 1;
window._historyPerPage = 30;

window.fetchBorrowingHistory = async function (filters = {}) {
    if (!window.supabaseClient) return;

    const tbody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('historyEmpty');
    const pagination = document.getElementById('historyPagination');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="py-12 text-center text-gray-400">Loading...</td></tr>`;
    if (emptyState) emptyState.classList.add('hidden');
    if (pagination) pagination.classList.add('hidden');

    try {
        const { data, error } = await window.supabaseClient
            .from('transactions')
            .select('*, equipments ( name, image_url, type )')
            .order('borrow_date', { ascending: false });

        if (error) {
            console.error('Error fetching history:', error);
            window.showToast(window.translations[window.currentLang]?.errorGeneral || 'Error', 'error');
            return;
        }

        let transactions = data || [];
        const now = new Date();

        // Apply client-side filters
        if (filters.equipment) {
            const q = filters.equipment.toLowerCase();
            transactions = transactions.filter(t => (t.equipments?.name || '').toLowerCase().includes(q));
        }
        if (filters.borrower) {
            const q = filters.borrower.toLowerCase();
            transactions = transactions.filter(t => (t.borrower_name || '').toLowerCase().includes(q));
        }
        if (filters.status && filters.status !== 'all') {
            if (filters.status === 'overdue') {
                transactions = transactions.filter(t => {
                    if (t.status !== 'active' || !t.end_date) return false;
                    return new Date(t.end_date) < now;
                });
            } else {
                transactions = transactions.filter(t => t.status === filters.status);
            }
        }
        if (filters.dateFrom) {
            const from = new Date(filters.dateFrom + 'T00:00:00');
            transactions = transactions.filter(t => new Date(t.borrow_date) >= from);
        }
        if (filters.dateTo) {
            const to = new Date(filters.dateTo + 'T23:59:59');
            transactions = transactions.filter(t => new Date(t.borrow_date) <= to);
        }

        // Update stats
        const t = window.translations[window.currentLang];
        const totalEl = document.getElementById('historyStatTotal');
        const returnedEl = document.getElementById('historyStatReturned');
        const activeEl = document.getElementById('historyStatActive');
        const returnedCount = transactions.filter(tr => tr.status === 'returned').length;
        const activeCount = transactions.filter(tr => tr.status === 'active').length;
        if (totalEl) totalEl.textContent = `${transactions.length} ${t?.records || 'records'}`;
        if (returnedEl) returnedEl.textContent = `${returnedCount} ${t?.returned || 'returned'}`;
        if (activeEl) activeEl.textContent = `${activeCount} ${t?.activeStatus || 'active'}`;

        window._historyData = transactions;
        window._historyPage = 1;
        window.renderHistoryTable();
    } catch (err) {
        console.error('fetchBorrowingHistory error:', err);
        window.showToast('Error loading history', 'error');
    }
};

window.fetchOverviewData = async function () {
    const total = window.equipments.length;
    const available = window.equipments.filter(e => e.status === 'available').length;
    const borrowed = total - available;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statAvailable').textContent = available;
    document.getElementById('statBorrowed').textContent = borrowed;

    // Fetch additional analytics
    await window.fetchAnalyticsData();
};

// Fetch comprehensive analytics data
window.fetchAnalyticsData = async function () {
    if (!window.supabaseClient) return;

    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Get start of week (Monday)
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - mondayOffset);
        const weekStartStr = weekStart.toISOString().split('T')[0];

        // Fetch all transactions for analytics
        const { data: allTransactions, error } = await window.supabaseClient
            .from('transactions')
            .select('*, equipments(name)')
            .order('borrow_date', { ascending: false });

        if (error) {
            console.error('Error fetching analytics:', error);
            return;
        }

        const transactions = allTransactions || [];

        // 1. Overdue count
        const overdueCount = transactions.filter(t => {
            if (t.status !== 'active' || !t.end_date) return false;
            const endDate = new Date(t.end_date);
            return endDate < today;
        }).length;
        document.getElementById('statOverdue').textContent = overdueCount;

        // 2. Today's borrows
        const todayBorrows = transactions.filter(t => {
            const borrowDate = t.borrow_date?.split('T')[0];
            return borrowDate === todayStr;
        }).length;
        document.getElementById('statTodayBorrows').textContent = todayBorrows;

        // 3. Week's borrows
        const weekBorrows = transactions.filter(t => {
            const borrowDate = new Date(t.borrow_date);
            return borrowDate >= weekStart;
        }).length;
        document.getElementById('statWeekBorrows').textContent = weekBorrows;

        // 4. On-time return rate
        const returned = transactions.filter(t => t.status === 'returned');
        const onTimeReturns = returned.filter(t => {
            if (!t.end_date || !t.return_date) return true;
            const endDate = new Date(t.end_date);
            const returnDate = new Date(t.return_date);
            return returnDate <= endDate;
        }).length;
        const onTimeRate = returned.length > 0
            ? Math.round((onTimeReturns / returned.length) * 100)
            : 100;
        document.getElementById('statOnTimeRate').textContent = onTimeRate + '%';

        // 5. Weekly chart data (last 7 days)
        const weeklyData = window.getWeeklyBorrowings(transactions);
        window.renderWeeklyChart(weeklyData);

        // 6. Top equipment
        const topEquipment = window.getTopEquipments(transactions);
        window.renderTopEquipmentChart(topEquipment);

        // 7. Top borrowers
        const topBorrowers = window.getTopBorrowers(transactions);
        window.renderTopBorrowersList(topBorrowers);

    } catch (err) {
        console.error('fetchAnalyticsData error:', err);
    }
};

// Get daily borrowing counts for last 7 days
window.getWeeklyBorrowings = function (transactions) {
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const count = transactions.filter(t => {
            const borrowDate = t.borrow_date?.split('T')[0];
            return borrowDate === dateStr;
        }).length;

        const dayName = date.toLocaleDateString('th-TH', { weekday: 'short' });
        result.push({ day: dayName, count });
    }
    return result;
};

// Get top 5 most borrowed equipment
window.getTopEquipments = function (transactions) {
    const counts = {};
    transactions.forEach(t => {
        const name = t.equipments?.name || 'Unknown';
        counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
};

// Get top 5 borrowers
window.getTopBorrowers = function (transactions) {
    const counts = {};
    transactions.forEach(t => {
        const name = t.borrower_name || 'Unknown';
        counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
};

// Fetch user's borrowed items
window.fetchMyBorrowings = async function () {
    if (!window.supabaseClient || !window.currentUser) return;

    // Show loading skeleton
    const grid = document.getElementById('myBorrowingsGrid');
    const emptyState = document.getElementById('myBorrowingsEmpty');

    if (grid) {
        grid.innerHTML = `
            <div class="skeleton-card p-4">
                <div class="flex gap-4">
                    <div class="skeleton w-20 h-20 rounded-lg"></div>
                    <div class="flex-1">
                        <div class="skeleton h-4 w-24 mb-2"></div>
                        <div class="skeleton h-5 w-40 mb-3"></div>
                        <div class="skeleton h-3 w-32"></div>
                    </div>
                </div>
            </div>
            <div class="skeleton-card p-4">
                <div class="flex gap-4">
                    <div class="skeleton w-20 h-20 rounded-lg"></div>
                    <div class="flex-1">
                        <div class="skeleton h-4 w-24 mb-2"></div>
                        <div class="skeleton h-5 w-40 mb-3"></div>
                        <div class="skeleton h-3 w-32"></div>
                    </div>
                </div>
            </div>
        `;
    }

    const { data, error } = await window.supabaseClient
        .from('transactions')
        .select(`*, equipments ( id, name, image_url, type )`)
        .eq('status', 'active')
        .eq('borrower_name', window.currentUser.username)
        .order('borrow_date', { ascending: false });

    if (error) {
        console.error('Error fetching my borrowings:', error);
        window.showToast(window.translations[window.currentLang].errorGeneral, 'error');
        return;
    }

    window.renderMyBorrowings(data);
};

// --- Booking Calendar Functions ---

// Get all booked date ranges for a specific equipment
window.getBookedDatesForEquipment = async function (equipmentId) {
    if (!window.supabaseClient) return [];

    try {
        const { data, error } = await window.supabaseClient
            .from('transactions')
            .select('start_date, end_date, borrower_name')
            .eq('equipment_id', equipmentId)
            .eq('status', 'active');

        if (error) {
            console.error('Error fetching booked dates:', error);
            return [];
        }

        if (!data || data.length === 0) return [];

        // Convert to array of disabled dates for flatpickr
        const disabledDates = [];
        data.forEach(booking => {
            const start = new Date(booking.start_date);
            const end = booking.end_date ? new Date(booking.end_date) : new Date(start.getTime() + 86400000);

            // Add each day in the range
            let current = new Date(start);
            while (current <= end) {
                disabledDates.push(new Date(current).toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        });

        return [...new Set(disabledDates)]; // Remove duplicates
    } catch (err) {
        console.error('getBookedDatesForEquipment error:', err);
        return [];
    }
};

// --- Actions ---

window.confirmBorrow = async function () {
    const id = document.getElementById('borrowItemId').value;
    const name = window.currentUser ? window.currentUser.username : 'Guest';
    const t = window.translations[window.currentLang];

    if (!name) {
        window.showToast(t.pleaseEnterName, 'error');
        return;
    }

    // Check if user is banned
    const banStatus = await window.checkCanBorrow?.(name);
    if (banStatus && !banStatus.canBorrow) {
        const banDate = banStatus.banUntil ? new Date(banStatus.banUntil).toLocaleDateString('th-TH') : 'ไม่มีกำหนด';
        window.showToast(`คุณถูกระงับการยืมจนถึง ${banDate}`, 'error');
        window.closeModal('borrowModal');
        return;
    }

    // Get selected dates
    const startVal = document.getElementById('startDate').value;
    const endVal = document.getElementById('endDate').value;
    const startDateObj = new Date(startVal + 'T00:00:00');
    const endDateObj = new Date(endVal + 'T23:59:59');

    // =====================================================
    // DOUBLE BOOKING PREVENTION
    // Check if this equipment is already booked in the selected date range
    // =====================================================
    const { data: existingBookings, error: checkError } = await window.supabaseClient
        .from('transactions')
        .select('id, start_date, end_date, borrower_name')
        .eq('equipment_id', id)
        .eq('status', 'active');

    if (checkError) {
        console.error('Check error:', checkError);
        window.showToast(t.errorGeneral, 'error');
        return;
    }

    // Check for overlapping bookings
    if (existingBookings && existingBookings.length > 0) {
        for (const booking of existingBookings) {
            const bookingStart = new Date(booking.start_date);
            const bookingEnd = booking.end_date ? new Date(booking.end_date) : new Date(bookingStart.getTime() + 86400000);

            // Check overlap: (start1 <= end2) && (end1 >= start2)
            const hasOverlap = startDateObj <= bookingEnd && endDateObj >= bookingStart;

            if (hasOverlap) {
                const conflictDate = bookingStart.toLocaleDateString(window.currentLang === 'th' ? 'th-TH' : 'en-US', {
                    day: 'numeric', month: 'short'
                });
                const conflictEndDate = bookingEnd.toLocaleDateString(window.currentLang === 'th' ? 'th-TH' : 'en-US', {
                    day: 'numeric', month: 'short'
                });

                window.showToast(
                    `${t.alreadyBooked || 'อุปกรณ์ถูกจองแล้ว'} (${conflictDate} - ${conflictEndDate})`,
                    'error'
                );
                return;
            }
        }
    }
    // =====================================================

    // 1. Update equipment status
    const { error: updateError } = await window.supabaseClient
        .from('equipments')
        .update({ status: 'borrowed' })
        .eq('id', id);

    if (updateError) {
        console.error('Update error:', updateError);
        window.showToast(t.errorUpdate, 'error');
        return;
    }

    // 2. Insert transaction
    const { error: insertError } = await window.supabaseClient
        .from('transactions')
        .insert([{
            equipment_id: id,
            borrower_name: name,
            status: 'active',
            start_date: startDateObj.toISOString(),
            end_date: endDateObj.toISOString()
        }]);

    if (insertError) {
        console.error('Insert error:', insertError);
        // Rollback
        await window.supabaseClient.from('equipments').update({ status: 'available' }).eq('id', id);
        window.showToast(t.errorSave, 'error');
        return;
    }

    window.closeModal('borrowModal');
    window.showToast(t.successBorrow, 'success');
    window.fetchEquipments();
};

window.confirmReturn = async function () {
    const id = document.getElementById('returnItemId').value;

    // 1. Update equipment status
    const { error: updateError } = await window.supabaseClient
        .from('equipments')
        .update({ status: 'available' })
        .eq('id', id);

    if (updateError) {
        console.error('Update error:', updateError);
        window.showToast(window.translations[window.currentLang].errorUpdate, 'error');
        return;
    }

    // 2. Update transaction
    const { error: transError } = await window.supabaseClient
        .from('transactions')
        .update({ status: 'returned', return_date: new Date().toISOString() })
        .eq('equipment_id', id)
        .eq('status', 'active');

    if (transError) {
        console.error('Transaction update error:', transError);
        window.showToast(window.translations[window.currentLang].errorSave, 'error');
        return;
    }

    window.closeModal('returnModal');
    window.showToast(window.translations[window.currentLang].successReturn, 'success');

    if (window.currentFilter === 'returns') {
        window.fetchReturnData();
    } else {
        window.fetchEquipments();
    }
};

window.saveEquipment = async function () {
    const t = window.translations[window.currentLang];

    try {
        const originalName = document.getElementById('manageOriginalName')?.value || '';
        const name = document.getElementById('manageName')?.value?.trim() || '';
        const type = document.getElementById('manageType')?.value || '';
        const image = document.getElementById('manageImage')?.value?.trim() || '';
        const quantityEl = document.getElementById('manageQuantity');
        const newQuantity = quantityEl ? parseInt(quantityEl.value) || 1 : 1;

        // Validation
        if (!name) {
            window.showToast('กรุณาระบุชื่ออุปกรณ์', 'error');
            return;
        }
        if (!image) {
            window.showToast('กรุณาระบุ URL รูปภาพ', 'error');
            return;
        }
        if (!type) {
            window.showToast('กรุณาเลือกประเภทอุปกรณ์', 'error');
            return;
        }
        if (newQuantity < 0 || newQuantity > 100) {
            window.showToast('จำนวนต้องอยู่ระหว่าง 0-100', 'error');
            return;
        }

        const payload = { name, type, image_url: image };
        let error = null;

        if (originalName) {
            // EDITING: Handle quantity changes
            const currentItems = window.equipments.filter(e => e.name === originalName);
            const currentQuantity = currentItems.length;
            const quantityDiff = newQuantity - currentQuantity;

            // Update existing items first
            const { error: updateError } = await window.supabaseClient
                .from('equipments')
                .update(payload)
                .eq('name', originalName);

            if (updateError) {
                error = updateError;
            } else if (quantityDiff > 0) {
                // Need to ADD more units
                const itemsToInsert = [];
                for (let i = 0; i < quantityDiff; i++) {
                    itemsToInsert.push({ ...payload, status: 'available' });
                }
                const { error: insertError } = await window.supabaseClient
                    .from('equipments')
                    .insert(itemsToInsert);
                error = insertError;
            } else if (quantityDiff < 0) {
                // Need to REMOVE units (only available ones)
                const availableItems = currentItems.filter(item => item.status === 'available');
                const toRemove = Math.min(Math.abs(quantityDiff), availableItems.length);

                if (toRemove < Math.abs(quantityDiff)) {
                    window.showToast(`สามารถลบได้เฉพาะอุปกรณ์ที่ว่าง (ลบได้ ${toRemove} จาก ${Math.abs(quantityDiff)} ชิ้น)`, 'warning');
                }

                if (toRemove > 0) {
                    const idsToDelete = availableItems.slice(0, toRemove).map(item => item.id);
                    const { error: deleteError } = await window.supabaseClient
                        .from('equipments')
                        .delete()
                        .in('id', idsToDelete);
                    error = deleteError;
                }
            }
        } else {
            // ADDING NEW
            if (newQuantity < 1) {
                window.showToast('จำนวนต้องอย่างน้อย 1 ชิ้น', 'error');
                return;
            }
            const itemsToInsert = [];
            for (let i = 0; i < newQuantity; i++) {
                itemsToInsert.push({ ...payload, status: 'available' });
            }
            const { error: insertError } = await window.supabaseClient
                .from('equipments')
                .insert(itemsToInsert);
            error = insertError;
        }

        if (error) {
            console.error('Save error:', error);
            window.showToast(t?.errorSave || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
            return;
        }

        window.closeModal('manageModal');
        window.showToast(originalName ? (t?.successUpdate || 'อัปเดตสำเร็จ') : (t?.successAdd || 'เพิ่มสำเร็จ'), 'success');
        window.fetchEquipments();
    } catch (err) {
        console.error('saveEquipment exception:', err);
        window.showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
};

// --- User Management ---

window.fetchAllUsers = async function () {
    if (!window.supabaseClient) {
        console.warn('Supabase client not initialized');
        return [];
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('users')
            .select('id, username, role')
            .order('id', { ascending: true });

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('fetchAllUsers exception:', err);
        return [];
    }
};

window.updateUserRole = async function (userId, newRole) {
    if (!window.supabaseClient) {
        console.warn('Supabase client not initialized');
        return false;
    }

    try {
        const { error } = await window.supabaseClient
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            console.error('Error updating user role:', error);
            window.showToast('เกิดข้อผิดพลาดในการอัปเดต', 'error');
            return false;
        }

        window.showToast(`เปลี่ยน role เป็น ${newRole} สำเร็จ`, 'success');
        return true;
    } catch (err) {
        console.error('updateUserRole exception:', err);
        window.showToast('เกิดข้อผิดพลาด', 'error');
        return false;
    }
};

window.syncUserToDatabase = async function (userData) {
    if (!window.supabaseClient) {
        console.warn('Supabase client not initialized');
        return null;
    }

    try {
        // Check if user exists
        const { data: existingUser, error: fetchError } = await window.supabaseClient
            .from('users')
            .select('id, username, role')
            .eq('username', userData.username)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows returned (user doesn't exist)
            console.error('Error checking existing user:', fetchError);
        }

        if (existingUser) {
            // User exists - return their role from database
            console.log('User exists in database:', existingUser);
            return existingUser;
        }

        // User doesn't exist - create new user
        const { data: newUser, error: insertError } = await window.supabaseClient
            .from('users')
            .insert([{
                username: userData.username,
                password: 'sso_user', // Placeholder for SSO users
                role: userData.role || 'user'
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Error creating user:', insertError);
            return null;
        }

        console.log('New user created:', newUser);
        return newUser;
    } catch (err) {
        console.error('syncUserToDatabase exception:', err);
        return null;
    }
};

// --- Penalty System ---

// Strike calculation based on penalty type
window.calculateStrikes = function (penaltyType, daysLate = 0) {
    switch (penaltyType) {
        case 'late_return':
            if (daysLate <= 3) return { strikes: 1, severity: 'low' };
            if (daysLate <= 7) return { strikes: 2, severity: 'medium' };
            return { strikes: 3, severity: 'high' };
        case 'minor_damage':
            return { strikes: 1, severity: 'low' };
        case 'major_damage':
            return { strikes: 2, severity: 'medium' };
        case 'severe_damage':
            return { strikes: 3, severity: 'high' };
        case 'lost':
            return { strikes: 3, severity: 'critical' };
        default:
            return { strikes: 1, severity: 'low' };
    }
};

// Ban duration based on total strikes
window.calculateBanDuration = function (totalStrikes) {
    if (totalStrikes >= 6) return { days: null, permanent: true };  // ถาวร
    if (totalStrikes >= 4) return { days: 60, permanent: false };
    if (totalStrikes >= 3) return { days: 30, permanent: false };
    return { days: 0, permanent: false };
};

// Add a penalty record
window.addPenalty = async function (penaltyData) {
    if (!window.supabaseClient) return { success: false, error: 'No database connection' };

    try {
        const { strikes, severity } = window.calculateStrikes(penaltyData.penaltyType, penaltyData.daysLate || 0);

        // Insert penalty record
        const { data: penalty, error: insertError } = await window.supabaseClient
            .from('penalties')
            .insert([{
                user_id: penaltyData.userId,
                transaction_id: penaltyData.transactionId || null,
                equipment_id: penaltyData.equipmentId || null,
                penalty_type: penaltyData.penaltyType,
                severity: severity,
                days_late: penaltyData.daysLate || 0,
                description: penaltyData.description || '',
                strikes_given: strikes,
                compensation_amount: penaltyData.compensationAmount || 0,
                compensation_status: penaltyData.compensationAmount > 0 ? 'pending' : 'none',
                created_by: window.currentUser?.username || 'system',
                notes: penaltyData.notes || ''
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting penalty:', insertError);
            return { success: false, error: insertError.message };
        }

        // Update user's total strikes
        await window.updateUserStrikes(penaltyData.userId, strikes);

        return { success: true, penalty, strikesGiven: strikes };
    } catch (err) {
        console.error('addPenalty exception:', err);
        return { success: false, error: err.message };
    }
};

// Update user's total strikes and check if should be banned
window.updateUserStrikes = async function (userId, strikesToAdd) {
    try {
        // Get current user data
        const { data: user, error: fetchError } = await window.supabaseClient
            .from('users')
            .select('total_strikes, is_banned')
            .eq('username', userId)
            .single();

        if (fetchError) {
            console.error('Error fetching user:', fetchError);
            return false;
        }

        const newTotalStrikes = (user?.total_strikes || 0) + strikesToAdd;
        const banInfo = window.calculateBanDuration(newTotalStrikes);

        let updateData = { total_strikes: newTotalStrikes };

        // Apply ban if threshold reached
        if (banInfo.days > 0 || banInfo.permanent) {
            const banUntil = banInfo.permanent
                ? new Date('2099-12-31')
                : new Date(Date.now() + banInfo.days * 24 * 60 * 60 * 1000);

            updateData.is_banned = true;
            updateData.ban_until = banUntil.toISOString();
            updateData.ban_reason = banInfo.permanent
                ? 'สะสม Strike มากกว่า 6 ครั้ง - ระงับการยืมถาวร'
                : `สะสม Strike ${newTotalStrikes} ครั้ง - ระงับการยืม ${banInfo.days} วัน`;
        }

        // Update user
        const { error: updateError } = await window.supabaseClient
            .from('users')
            .update(updateData)
            .eq('username', userId);

        if (updateError) {
            console.error('Error updating user strikes:', updateError);
            return false;
        }

        return true;
    } catch (err) {
        console.error('updateUserStrikes exception:', err);
        return false;
    }
};

// Get user's penalty history
window.getUserPenalties = async function (userId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('penalties')
            .select('*, equipments(name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching penalties:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('getUserPenalties exception:', err);
        return [];
    }
};

// Check if user can borrow (not banned)
window.checkCanBorrow = async function (userId) {
    try {
        const { data: user, error } = await window.supabaseClient
            .from('users')
            .select('is_banned, ban_until, ban_reason, total_strikes')
            .eq('username', userId)
            .single();

        if (error) {
            console.error('Error checking ban status:', error);
            return { canBorrow: true }; // Allow if error
        }

        if (!user) return { canBorrow: true };

        // Check if ban has expired
        if (user.is_banned && user.ban_until) {
            const banUntil = new Date(user.ban_until);
            if (banUntil < new Date()) {
                // Ban expired - unban user
                await window.supabaseClient
                    .from('users')
                    .update({ is_banned: false, ban_until: null, ban_reason: null })
                    .eq('username', userId);
                return { canBorrow: true, totalStrikes: user.total_strikes };
            }
        }

        return {
            canBorrow: !user.is_banned,
            isBanned: user.is_banned,
            banUntil: user.ban_until,
            banReason: user.ban_reason,
            totalStrikes: user.total_strikes
        };
    } catch (err) {
        console.error('checkCanBorrow exception:', err);
        return { canBorrow: true }; // Allow if error
    }
};

// Get all penalties (for admin)
window.fetchAllPenalties = async function () {
    try {
        const { data, error } = await window.supabaseClient
            .from('penalties')
            .select('*, equipments(name)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching all penalties:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('fetchAllPenalties exception:', err);
        return [];
    }
};
