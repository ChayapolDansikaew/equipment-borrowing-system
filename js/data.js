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

window.fetchOverviewData = async function () {
    const total = window.equipments.length;
    const available = window.equipments.filter(e => e.status === 'available').length;
    const borrowed = total - available;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statAvailable').textContent = available;
    document.getElementById('statBorrowed').textContent = borrowed;
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

// --- Actions ---

window.confirmBorrow = async function () {
    const id = document.getElementById('borrowItemId').value;
    const name = window.currentUser ? window.currentUser.username : 'Guest';
    const t = window.translations[window.currentLang];

    if (!name) {
        window.showToast(t.pleaseEnterName, 'error');
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
