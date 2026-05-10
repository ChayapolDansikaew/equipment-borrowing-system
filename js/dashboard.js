// js/dashboard.js — Admin Dashboard Module
console.log('Dashboard module loaded');

window.chartInstances = window.chartInstances || {};
window._dashboardInitialized = false;
window._dashboardRefreshInterval = null;

// Pagination state
window._dashboardTxPage = 0;
window._dashboardFeedPage = 0;
window._dashboardItemsPerPage = 10;
window._feedEvents = [];
window._dashboardTxHasMore = false;
window._dashboardFeedHasMore = false;
window._dashboardStats = null;

function _dashboardEscapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _dashboardFormatTime(date) {
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function _dashboardFormatInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function _dashboardGetHint(key) {
    const t = window.translations?.[window.currentLang] || {};
    return t[key] || '';
}

window.openDashboardBrowseView = function ({ status = 'all', category = 'all', search = '' } = {}) {
    const categoryFilter = document.getElementById('categoryFilter');
    const searchInput = document.getElementById('searchInput');

    window.stopDashboardRefresh?.();
    window.currentCategory = category;
    if (categoryFilter) categoryFilter.value = category;
    if (searchInput) searchInput.value = search;

    window.filterStatus?.(status);
};

window.handleDashboardAction = async function (action) {
    const stats = window._dashboardStats || {};

    switch (action) {
    case 'focus':
        if (stats.overdueCount > 0) {
            window.openHistoryPage?.({ status: 'overdue' });
            return;
        }
        if (stats.pendingRequests > 0) {
            await window.openPendingRequestsModal?.();
            return;
        }
        if ((stats.totalEquipment || 0) === 0) {
            window.openManageModal?.();
            return;
        }
        window.openDashboardBrowseView({ status: stats.utilizationRate >= 60 ? 'borrowed' : 'available' });
        return;
    case 'total':
        window.openDashboardBrowseView({ status: 'all', category: 'all', search: '' });
        return;
    case 'available':
        window.openDashboardBrowseView({ status: 'available' });
        return;
    case 'borrowed':
    case 'utilization':
        window.openDashboardBrowseView({ status: 'borrowed' });
        return;
    case 'pending':
        await window.openPendingRequestsModal?.();
        return;
    case 'overdue':
        window.openHistoryPage?.({ status: 'overdue' });
        return;
    case 'ontime':
        window.openHistoryPage?.({ status: 'returned' });
        return;
    default:
        return;
    }
};

window.handleDashboardActionKey = function (event, action) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    window.handleDashboardAction(action);
};

window.handleDashboardChartAction = async function (action, payload = {}) {
    const stats = window._dashboardStats || {};

    switch (action) {
    case 'trend': {
        const today = new Date();
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        window.openHistoryPage?.({
            dateFrom: payload.dateFrom || _dashboardFormatInputDate(monthStart),
            dateTo: payload.dateTo || _dashboardFormatInputDate(today)
        });
        return;
    }
    case 'category':
        window.openDashboardBrowseView({ status: 'all', category: payload.category || 'all' });
        return;
    case 'status':
        if (payload.status) {
            window.handleDashboardAction(payload.status === 'returned' ? 'ontime' : payload.status);
            return;
        }
        window.handleDashboardAction(stats.borrowed > 0 ? 'borrowed' : 'available');
        return;
    case 'borrowers':
        window.openHistoryPage?.(payload.borrower ? { borrower: payload.borrower } : {});
        return;
    case 'penalty':
        await window.openPenaltyHistoryModal?.();
        return;
    default:
        return;
    }
};

window.handleDashboardChartKey = function (event, action) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    window.handleDashboardChartAction(action);
};

window.renderDashboardPriorityItem = function (id, title, message, tone = 'info') {
    const el = document.getElementById(id);
    if (!el) return;

    const tones = {
        danger: {
            wrapper: 'border-red-100 dark:border-red-500/20 bg-red-50/70 dark:bg-red-500/10',
            title: 'text-red-500',
            body: 'text-red-700 dark:text-red-200'
        },
        warning: {
            wrapper: 'border-amber-100 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/10',
            title: 'text-amber-500',
            body: 'text-amber-700 dark:text-amber-200'
        },
        success: {
            wrapper: 'border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/10',
            title: 'text-emerald-500',
            body: 'text-emerald-700 dark:text-emerald-200'
        },
        info: {
            wrapper: 'border-blue-100 dark:border-blue-500/20 bg-blue-50/70 dark:bg-blue-500/10',
            title: 'text-blue-500',
            body: 'text-blue-700 dark:text-blue-200'
        }
    };

    const selectedTone = tones[tone] || tones.info;
    const hintKeyById = {
        dashPriorityOverdue: 'dashboardActionOverdue',
        dashPriorityPending: 'dashboardActionPending',
        dashPriorityUtilization: 'dashboardActionUtilization'
    };
    const hintText = _dashboardGetHint(hintKeyById[id]);
    el.className = `rounded-xl border px-4 py-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selectedTone.wrapper}`;
    el.innerHTML = `
        <p class="text-[11px] font-semibold uppercase tracking-wider ${selectedTone.title}">${_dashboardEscapeHtml(title)}</p>
        <p class="mt-1 text-sm ${selectedTone.body}">${_dashboardEscapeHtml(message)}</p>
        ${hintText ? `<p class="mt-2 text-[11px] font-medium ${selectedTone.title} opacity-80">${_dashboardEscapeHtml(hintText)}</p>` : ''}
    `;
};

window.renderDashboardOverview = function (stats) {
    const focusTitle = document.getElementById('dashFocusTitle');
    const focusSummary = document.getElementById('dashFocusSummary');
    const focusHighlights = document.getElementById('dashFocusHighlights');

    let title = 'ภาพรวมการใช้งานวันนี้';
    let summary = 'ระบบอยู่ในสภาวะปกติและพร้อมให้ติดตามภาพรวมการยืม-คืนแบบรวดเร็ว';

    if (stats.overdueCount > 0) {
        title = 'มีรายการที่ควรเร่งติดตาม';
        summary = `พบ ${stats.overdueCount} รายการเลยกำหนด และยังมี ${stats.pendingRequests} รายการรออนุมัติ ควรติดตามสองส่วนนี้ก่อนงานทั่วไป`;
    } else if (stats.pendingRequests > 0) {
        title = 'โฟกัสที่คิวอนุมัติ';
        summary = `ตอนนี้ยังไม่มีรายการเลยกำหนด แต่มี ${stats.pendingRequests} รายการรออนุมัติ และวันนี้มีคำขอยืมใหม่ ${stats.todayBorrows} รายการ`;
    } else if (stats.utilizationRate >= 75) {
        title = 'อุปกรณ์ถูกใช้งานค่อนข้างสูง';
        summary = `อัตราใช้งานอยู่ที่ ${stats.utilizationRate}% ของคลังทั้งหมด จึงควรเฝ้าดูของว่างและรายการที่จะคืนในช่วงถัดไป`;
    } else if (stats.totalEquipment === 0) {
        title = 'ยังไม่มีข้อมูลคลังอุปกรณ์';
        summary = 'เมื่อเพิ่มอุปกรณ์และเริ่มมีรายการยืม dashboard จะสรุปภาพรวมให้อัตโนมัติ';
    }

    const highlightItems = [
        `${stats.todayBorrows} รายการยืมวันนี้`,
        `สัปดาห์นี้ ${stats.weekBorrows} รายการ`,
        stats.topCategory ? `ประเภทนำ: ${stats.topCategory.name} ${stats.topCategory.share}%` : 'ยังไม่มีประเภทเด่น',
        stats.topBorrower ? `ผู้ใช้ยืมบ่อยสุด: ${stats.topBorrower.name} ${stats.topBorrower.count} ครั้ง` : 'ยังไม่มีผู้ยืมเด่น'
    ];

    if (focusTitle) focusTitle.textContent = title;
    if (focusSummary) focusSummary.textContent = summary;
    if (focusHighlights) {
        focusHighlights.innerHTML = highlightItems.map(item => `
            <span class="px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/[0.08]">${_dashboardEscapeHtml(item)}</span>
        `).join('');
    }

    const overdueMessage = stats.overdueCount > 0
        ? `${stats.overdueCount} รายการต้องติดตามทันที คิดเป็น ${stats.overdueRate}% ของอุปกรณ์ที่ยังถูกยืมอยู่`
        : 'ยังไม่มีรายการ active ที่เกินวันคืน';
    const pendingMessage = stats.pendingRequests > 0
        ? `ยังมี ${stats.pendingRequests} รายการรออนุมัติ และวันนี้เข้ามาใหม่ ${stats.todayBorrows} รายการ`
        : 'ไม่มีคำขอค้างตรวจในตอนนี้';

    let utilizationTone = 'info';
    let utilizationMessage = `อัตราใช้งานอยู่ที่ ${stats.utilizationRate}% และของพร้อมใช้งาน ${stats.availabilityRate}%`;
    if (stats.utilizationRate >= 75) {
        utilizationTone = 'warning';
        utilizationMessage = `อัตราใช้งาน ${stats.utilizationRate}% ถือว่าสูง ควรเฝ้าดูของว่างและกำหนดคืนใกล้ถึง`; 
    } else if (stats.utilizationRate <= 35) {
        utilizationTone = 'success';
        utilizationMessage = `อัตราใช้งาน ${stats.utilizationRate}% ยังมีของพร้อมใช้งาน ${stats.available} ชิ้น รองรับการยืมเพิ่มได้`; 
    }

    window.renderDashboardPriorityItem('dashPriorityOverdue', 'รายการเลยกำหนด', overdueMessage, stats.overdueCount > 0 ? 'danger' : 'success');
    window.renderDashboardPriorityItem('dashPriorityPending', 'คำขอรออนุมัติ', pendingMessage, stats.pendingRequests > 0 ? 'warning' : 'success');
    window.renderDashboardPriorityItem('dashPriorityUtilization', 'อัตราใช้งาน', utilizationMessage, utilizationTone);
};

window.renderDashboardChartInsights = function (stats) {
    const trendInsight = document.getElementById('dashTrendInsight');
    const categoryInsight = document.getElementById('dashCategoryInsight');
    const categoryBreakdown = document.getElementById('dashCategoryBreakdown');
    const statusInsight = document.getElementById('dashStatusInsight');
    const borrowersInsight = document.getElementById('dashBorrowersInsight');
    const penaltyInsight = document.getElementById('dashPenaltyInsight');

    if (trendInsight) {
        trendInsight.textContent = stats.peakBorrowDay
            ? `วันที่มียอดยืมสูงสุดคือ ${stats.peakBorrowDay.label} (${stats.peakBorrowDay.count} รายการ)`
            : 'ยังไม่มีข้อมูลการยืมในช่วง 30 วันที่ผ่านมา';
    }

    if (categoryInsight) {
        categoryInsight.textContent = stats.topCategory
            ? `${stats.topCategory.name} มีมากที่สุด ${stats.topCategory.count} ชิ้น (${stats.topCategory.share}% ของคลัง)`
            : 'ยังไม่มีข้อมูลประเภทอุปกรณ์';
    }

    if (categoryBreakdown) {
        if (!stats.categoryBreakdown.length) {
            categoryBreakdown.innerHTML = '<span class="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 dark:bg-white/[0.04] text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-white/[0.06]">ยังไม่มีข้อมูลประเภท</span>';
        } else {
            categoryBreakdown.innerHTML = stats.categoryBreakdown.map(item => `
                <button type="button" data-category="${_dashboardEscapeHtml(item.name)}" onclick="window.handleDashboardChartAction('category', { category: this.dataset.category })" class="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/[0.06] hover:border-brand-pink/40 hover:text-brand-pink transition-colors cursor-pointer">${_dashboardEscapeHtml(item.name)} · ${item.count} ชิ้น (${item.share}%)</button>
            `).join('');
        }
    }

    if (statusInsight) {
        statusInsight.textContent = stats.borrowed > 0
            ? `ตอนนี้ถูกยืม ${stats.borrowed} ชิ้น จากทั้งหมด ${stats.totalEquipment} ชิ้น และมีเลยกำหนด ${stats.overdueCount} รายการ`
            : 'อุปกรณ์ทั้งหมดอยู่ในสถานะพร้อมใช้งาน';
    }

    if (borrowersInsight) {
        borrowersInsight.textContent = stats.topBorrower
            ? `${stats.topBorrower.name} เป็นผู้ใช้ที่ยืมบ่อยที่สุด (${stats.topBorrower.count} ครั้ง)`
            : 'ยังไม่มีข้อมูลผู้ยืมมากพอสำหรับจัดอันดับ';
    }

    if (penaltyInsight) {
        if (stats.penaltyTotal === 0) {
            penaltyInsight.textContent = 'ยังไม่พบเหตุผิดนัดหรือกรณีไม่มารับของ';
        } else if (stats.penaltyLateReturn >= stats.penaltyNoShow) {
            penaltyInsight.textContent = `ความเสี่ยงหลักมาจากการคืนล่าช้า ${stats.penaltyLateReturn} เคส จากทั้งหมด ${stats.penaltyTotal} เคส`;
        } else {
            penaltyInsight.textContent = `ความเสี่ยงหลักมาจากกรณีไม่มารับของ ${stats.penaltyNoShow} เคส จากทั้งหมด ${stats.penaltyTotal} เคส`;
        }
    }
};

// ============================================
// Main Data Fetcher
// ============================================
window.fetchDashboardData = async function () {
    if (!window.supabaseClient) return;

    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Get start of week (Monday)
        const dayOfWeek = today.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - mondayOffset);

        // Get last 30 days start
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);

        // Fetch all data in parallel
        const [txResult, eqResult, usersResult, penaltyStats] = await Promise.all([
            window.supabaseClient
                .from('transactions')
                .select('*, equipments(name, type)')
                .order('borrow_date', { ascending: false }),
            window.supabaseClient
                .from('equipments')
                .select('*'),
            window.supabaseClient
                .from('users')
                .select('id, username, role, created_at'),
            window.fetchPenaltyStats ? window.fetchPenaltyStats() : Promise.resolve({ late_return: 0, no_show: 0 })
        ]);

        const transactions = txResult.data || [];
        const equipments = eqResult.data || [];
        const users = usersResult.data || [];
        const requests = await window.requests?.getAll() || [];
        const categoryCounts = equipments.reduce((acc, equipment) => {
            const key = equipment.type || 'ไม่ระบุประเภท';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const categoryBreakdown = Object.entries(categoryCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({
                name,
                count,
                share: equipments.length > 0 ? Math.round((count / equipments.length) * 100) : 0
            }));

        const borrowerCounts = transactions.reduce((acc, transaction) => {
            if (!transaction.borrower_name) return acc;
            acc[transaction.borrower_name] = (acc[transaction.borrower_name] || 0) + 1;
            return acc;
        }, {});
        const borrowerBreakdown = Object.entries(borrowerCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));

        const trendMap = {};
        for (let cursor = new Date(monthStart); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
            trendMap[cursor.toISOString().split('T')[0]] = 0;
        }
        transactions.forEach(transaction => {
            const dayKey = transaction.borrow_date?.split('T')[0];
            if (dayKey && trendMap[dayKey] !== undefined) {
                trendMap[dayKey] += 1;
            }
        });
        const peakBorrowEntry = Object.entries(trendMap)
            .sort((a, b) => b[1] - a[1])[0] || null;

        // === Compute KPI Stats ===
        const totalEquipment = equipments.length;
        const available = equipments.filter(e => e.status === 'available').length;
        const borrowed = totalEquipment - available;

        // Pending requests count
        const pendingRequests = requests.reduce((sum, req) => {
            return sum + req.items.filter(i => i.status === 'pending').length;
        }, 0);

        // Overdue
        const overdueCount = transactions.filter(t => {
            if (t.status !== 'active' || !t.end_date) return false;
            return new Date(t.end_date) < today;
        }).length;

        // On-time rate
        const returned = transactions.filter(t => t.status === 'returned');
        const onTimeReturns = returned.filter(t => {
            if (!t.end_date || !t.return_date) return true;
            return new Date(t.return_date) <= new Date(t.end_date);
        }).length;
        const onTimeRate = returned.length > 0
            ? Math.round((onTimeReturns / returned.length) * 100) : 100;

        // Today & week borrows
        const todayBorrows = transactions.filter(t => {
            return t.borrow_date?.split('T')[0] === todayStr;
        }).length;

        const weekBorrows = transactions.filter(t => {
            return new Date(t.borrow_date) >= weekStart;
        }).length;

        // Utilization rate
        const utilizationRate = totalEquipment > 0
            ? Math.round((borrowed / totalEquipment) * 100) : 0;
        const availabilityRate = totalEquipment > 0
            ? Math.round((available / totalEquipment) * 100) : 0;
        const overdueRate = borrowed > 0
            ? Math.round((overdueCount / borrowed) * 100) : 0;
        const pendingLoad = Math.min(100, Math.round((pendingRequests / Math.max(pendingRequests + todayBorrows, 1)) * 100));
        const topCategory = categoryBreakdown[0] || null;
        const topBorrower = borrowerBreakdown[0] || null;
        const peakBorrowDay = peakBorrowEntry && peakBorrowEntry[1] > 0
            ? {
                raw: peakBorrowEntry[0],
                count: peakBorrowEntry[1],
                label: new Date(peakBorrowEntry[0]).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
            }
            : null;
        const penaltyLateReturn = penaltyStats.late_return || 0;
        const penaltyNoShow = penaltyStats.no_show || 0;
        const penaltyTotal = penaltyLateReturn + penaltyNoShow;
        const lastUpdatedAt = new Date();

        const stats = {
            totalEquipment, available, borrowed, pendingRequests,
            overdueCount, onTimeRate, todayBorrows, weekBorrows,
            utilizationRate, totalUsers: users.length,
            availabilityRate, overdueRate, pendingLoad,
            returnedCount: returned.length,
            categoryBreakdown: categoryBreakdown.slice(0, 3),
            topCategory, topBorrower, peakBorrowDay,
            penaltyLateReturn, penaltyNoShow, penaltyTotal,
            lastUpdatedAt
        };
        window._dashboardStats = stats;

        // === Update Greeting ===
        const greeting = document.getElementById('dashGreeting');
        if (greeting) {
            const username = window.currentUser?.username || 'Admin';
            const hour = new Date().getHours();
            const greetText = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
            greeting.textContent = `${greetText}, ${username} 👋`;
        }
        const lastUpdate = document.getElementById('dashLastUpdate');
        if (lastUpdate) {
            lastUpdate.textContent = `อัปเดตล่าสุด ${_dashboardFormatTime(lastUpdatedAt)} · รีเฟรชอัตโนมัติทุก 30 วินาที`;
        }

        // === Render Everything ===
        window.renderDashboardOverview(stats);
        window.renderKPICards(stats);
        window.renderDashboardChartInsights(stats);
        window.renderTrendChart(transactions, monthStart);
        window.renderCategoryChart(equipments);
        window.renderStatusChart(stats);
        window.renderTopBorrowersChart(transactions);
        window.renderPenaltyStatsChart(penaltyStats);

        // Fetch paged/filtered data for lists (separate from all-time charts)
        window._dashboardTxPage = 0;
        window._dashboardFeedPage = 0;
        await window.fetchRecentTransactionsPage(0);
        await window.fetchActivityFeedData();

    } catch (err) {
        console.error('Dashboard fetch error:', err);
    }
};

// ============================================
// KPI Cards
// ============================================
window.renderKPICards = function (stats) {
    const cards = [
        {
            id: 'kpi-total',
            value: stats.totalEquipment,
            meta: stats.totalEquipment > 0
                ? `${stats.available} พร้อมใช้ · ${stats.borrowed} ถูกยืม`
                : 'ยังไม่มีอุปกรณ์ในระบบ',
            progress: stats.totalEquipment > 0 ? 100 : 0
        },
        {
            id: 'kpi-available',
            value: stats.available,
            meta: `คิดเป็น ${stats.availabilityRate}% ของอุปกรณ์ทั้งหมด`,
            progress: stats.availabilityRate
        },
        {
            id: 'kpi-borrowed',
            value: stats.borrowed,
            meta: `อัตราใช้งาน ${stats.utilizationRate}% ของคลัง`,
            progress: stats.utilizationRate
        },
        {
            id: 'kpi-pending',
            value: stats.pendingRequests,
            meta: stats.pendingRequests > 0
                ? `วันนี้มี ${stats.todayBorrows} รายการใหม่ และยังรออนุมัติ ${stats.pendingRequests}`
                : 'ไม่มีคำขอค้างตรวจตอนนี้',
            progress: stats.pendingLoad
        },
        {
            id: 'kpi-overdue',
            value: stats.overdueCount,
            meta: stats.overdueCount > 0
                ? `คิดเป็น ${stats.overdueRate}% ของอุปกรณ์ที่ยังถูกยืม`
                : 'ยังไม่มีรายการ active ที่เกินกำหนด',
            progress: stats.overdueRate
        },
        {
            id: 'kpi-ontime',
            value: stats.onTimeRate + '%',
            meta: stats.returnedCount > 0
                ? `อิงจากรายการคืนแล้ว ${stats.returnedCount} รายการ`
                : 'ยังไม่มีข้อมูลการคืน จึงแสดงเป็น 100%',
            progress: stats.onTimeRate
        }
    ];

    cards.forEach(card => {
        const el = document.getElementById(card.id);
        if (el) {
            el.querySelector('.kpi-value').textContent = card.value;
            const metaEl = el.querySelector('.kpi-meta');
            const barEl = el.querySelector('.kpi-bar');
            if (metaEl) metaEl.textContent = card.meta;
            if (barEl) barEl.style.width = `${Math.max(0, Math.min(card.progress, 100))}%`;
            // Animate
            el.classList.add('scale-[1.02]');
            setTimeout(() => el.classList.remove('scale-[1.02]'), 200);
        }
    });
};

// ============================================
// Charts
// ============================================

// 1. Borrowing Trend (Line — last 30 days)
window.renderTrendChart = function (transactions, monthStart) {
    const canvas = document.getElementById('dashTrendChart');
    if (!canvas) return;
    if (window.chartInstances.dashTrend) window.chartInstances.dashTrend.destroy();
    canvas.classList.add('cursor-pointer');

    const isDark = document.documentElement.classList.contains('dark');
    const days = {};
    for (let d = new Date(monthStart); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        days[key] = 0;
    }
    transactions.forEach(t => {
        const d = t.borrow_date?.split('T')[0];
        if (d && days[d] !== undefined) days[d]++;
    });

    const rawDates = Object.keys(days);
    const labels = rawDates.map(d => {
        const date = new Date(d);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const data = Object.values(days);

    window.chartInstances.dashTrend = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'การยืม',
                data,
                borderColor: '#FFD100',
                backgroundColor: 'rgba(255, 209, 0, 0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 5,
                pointBackgroundColor: '#FFD100',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#1e2028' : '#fff',
                    titleColor: isDark ? '#fff' : '#111',
                    bodyColor: isDark ? '#9CA3AF' : '#6B7280',
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8
                }
            },
            onClick(event, _elements, chart) {
                const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (!points.length) return;
                const selectedDate = rawDates[points[0].index];
                if (!selectedDate) return;
                window.handleDashboardChartAction('trend', { dateFrom: selectedDate, dateTo: selectedDate });
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: isDark ? '#6B7280' : '#9CA3AF', font: { size: 11 } },
                    grid: { color: isDark ? 'rgba(75,85,99,0.3)' : 'rgba(229,231,235,0.5)' }
                },
                x: {
                    ticks: { color: isDark ? '#6B7280' : '#9CA3AF', maxRotation: 0, maxTicksLimit: 10, font: { size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
};

// 2. Equipment by Category (Doughnut)
window.renderCategoryChart = function (equipments) {
    const canvas = document.getElementById('dashCategoryChart');
    if (!canvas) return;
    if (window.chartInstances.dashCategory) window.chartInstances.dashCategory.destroy();
    canvas.classList.add('cursor-pointer');

    const isDark = document.documentElement.classList.contains('dark');
    const categories = {};
    equipments.forEach(e => {
        categories[e.type] = (categories[e.type] || 0) + 1;
    });

    const colors = ['#FFD100', '#FF4191', '#E90074', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#6366F1'];

    window.chartInstances.dashCategory = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: colors.slice(0, Object.keys(categories).length),
                borderWidth: 0,
                spacing: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDark ? '#9CA3AF' : '#6B7280',
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                        font: { size: 11 }
                    }
                }
            },
            onClick(event, _elements, chart) {
                const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (!points.length) return;
                const category = chart.data.labels?.[points[0].index];
                if (!category) return;
                window.handleDashboardChartAction('category', { category });
            }
        }
    });
};

// 3. Equipment Status (Bar)
window.renderStatusChart = function (stats) {
    const canvas = document.getElementById('dashStatusChart');
    if (!canvas) return;
    if (window.chartInstances.dashStatus) window.chartInstances.dashStatus.destroy();
    canvas.classList.add('cursor-pointer');

    const isDark = document.documentElement.classList.contains('dark');
    const statusPoints = [
        { label: 'พร้อมใช้งาน', value: stats.available, color: '#10B981', action: 'available' },
        { label: 'ถูกยืม', value: stats.borrowed, color: '#FFD100', action: 'borrowed' },
        { label: 'คืนล่าช้า', value: stats.overdueCount, color: '#EF4444', action: 'overdue' }
    ];

    window.chartInstances.dashStatus = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: statusPoints.map(item => item.label),
            datasets: [{
                data: statusPoints.map(item => item.value),
                backgroundColor: statusPoints.map(item => item.color),
                borderRadius: 8,
                barThickness: 32
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            onClick(event, _elements, chart) {
                const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (!points.length) return;
                const selected = statusPoints[points[0].index];
                if (!selected) return;
                window.handleDashboardChartAction('status', { status: selected.action });
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: isDark ? '#6B7280' : '#9CA3AF', font: { size: 11 } },
                    grid: { color: isDark ? 'rgba(75,85,99,0.3)' : 'rgba(229,231,235,0.5)' }
                },
                x: {
                    ticks: { color: isDark ? '#9CA3AF' : '#6B7280', font: { size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
};

// 4. Top Borrowers (Horizontal Bar)
window.renderTopBorrowersChart = function (transactions) {
    const canvas = document.getElementById('dashBorrowersChart');
    if (!canvas) return;
    if (window.chartInstances.dashBorrowers) window.chartInstances.dashBorrowers.destroy();
    canvas.classList.add('cursor-pointer');

    const isDark = document.documentElement.classList.contains('dark');
    const borrowerMap = {};
    transactions.forEach(t => {
        if (t.borrower_name) {
            borrowerMap[t.borrower_name] = (borrowerMap[t.borrower_name] || 0) + 1;
        }
    });

    const sorted = Object.entries(borrowerMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const colors = ['#FFD100', '#FF4191', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];

    window.chartInstances.dashBorrowers = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                data: sorted.map(s => s[1]),
                backgroundColor: colors,
                borderRadius: 6,
                barThickness: 20
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            onClick(event, _elements, chart) {
                const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (!points.length) return;
                const borrower = chart.data.labels?.[points[0].index];
                if (!borrower) return;
                window.handleDashboardChartAction('borrowers', { borrower });
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: isDark ? '#6B7280' : '#9CA3AF', font: { size: 11 } },
                    grid: { color: isDark ? 'rgba(75,85,99,0.3)' : 'rgba(229,231,235,0.5)' }
                },
                y: {
                    ticks: { color: isDark ? '#9CA3AF' : '#6B7280', font: { size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
};

// ============================================
// Filtered / Paged Data Fetchers
// ============================================

// Stack-like pagination based on total items
// Returns {start, end} for Array.slice() (exclusive end)
function _getPageSlice(page, totalItems) {
    const safeTotal = Math.max(0, Number(totalItems) || 0);
    if (safeTotal === 0) return { start: 0, end: 0 };

    const firstPageSize = safeTotal <= 10 ? safeTotal : (safeTotal % 10 || 10);
    if (page === 0) return { start: 0, end: firstPageSize };

    const start = firstPageSize + ((page - 1) * 10);
    const end = Math.min(start + 10, safeTotal);
    return { start, end };
}

window.fetchRecentTransactionsPage = async function (page) {
    if (!window.supabaseClient) return;

    const today = new Date();
    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 30);
    const monthStartStr = monthStart.toISOString();

    try {
        const { count, error: countError } = await window.supabaseClient
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .gte('borrow_date', monthStartStr);

        if (countError) {
            console.error('Error counting recent transactions:', countError);
            window._dashboardTxHasMore = false;
            window.renderRecentTransactions([], false);
            return;
        }

        const totalItems = count || 0;
        const { start, end } = _getPageSlice(page, totalItems);

        if (totalItems === 0 || start >= totalItems) {
            window._dashboardTxHasMore = false;
            window.renderRecentTransactions([], false);
            return;
        }

        const { data, error } = await window.supabaseClient
            .from('transactions')
            .select('*, equipments(name, type)')
            .gte('borrow_date', monthStartStr)
            .order('borrow_date', { ascending: false })
            .range(start, end - 1);

        if (error) {
            console.error('Error fetching recent transactions:', error);
            window._dashboardTxHasMore = false;
            window.renderRecentTransactions([], false);
            return;
        }
        const hasMore = end < totalItems;
        window._dashboardTxHasMore = hasMore;
        window.renderRecentTransactions(data || [], hasMore);
    } catch (err) {
        console.error('fetchRecentTransactionsPage exception:', err);
        window._dashboardTxHasMore = false;
        window.renderRecentTransactions([], false);
    }
};

window.fetchActivityFeedData = async function () {
    if (!window.supabaseClient) return;

    const today = new Date();
    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 30);
    const monthStartStr = monthStart.toISOString();

    try {
        const [txResult, requests] = await Promise.all([
            window.supabaseClient
                .from('transactions')
                .select('*, equipments(name, type)')
                .gte('borrow_date', monthStartStr)
                .order('borrow_date', { ascending: false }),
            window.requests?.getAll(monthStartStr) || []
        ]);

        const transactions = txResult.data || [];
        const events = [];

        transactions.forEach(tx => {
            const action = tx.status === 'returned' ? 'คืน' : 'ยืม';
            const icon = tx.status === 'returned' ? '↩️' : '📤';
            const eqName = tx.equipments?.name || 'อุปกรณ์';
            events.push({
                icon,
                text: `<b>${tx.borrower_name}</b> ${action} <span class="text-gray-900 dark:text-white font-medium">${eqName}</span>`,
                time: new Date(tx.status === 'returned' && tx.return_date ? tx.return_date : tx.borrow_date),
                type: tx.status
            });
        });

        requests.forEach(req => {
            const hasApproved = req.items.some(i => i.status === 'approved');
            const hasPending = req.items.some(i => i.status === 'pending');
            if (hasPending) {
                events.push({
                    icon: '📋',
                    text: `<b>${req.userName}</b> ส่งคำขอยืม ${req.items.length} รายการ`,
                    time: new Date(req.createdAt),
                    type: 'request'
                });
            }
            if (hasApproved) {
                const approver = req.items.find(i => i.approvedBy)?.approvedBy || 'admin';
                events.push({
                    icon: '✅',
                    text: `<b>${approver}</b> อนุมัติคำขอของ <b>${req.userName}</b>`,
                    time: new Date(req.items.find(i => i.approvedAt)?.approvedAt || req.createdAt),
                    type: 'approved'
                });
            }
        });

        events.sort((a, b) => b.time - a.time);
        window._feedEvents = events;
        window.renderActivityFeedPage(0);
    } catch (err) {
        console.error('fetchActivityFeedData exception:', err);
        window._feedEvents = [];
        window.renderActivityFeedPage(0);
    }
};

// ============================================
// Pagination Controls
// ============================================
window.renderPagination = function (containerId, currentPage, hasMore, onPrev, onNext) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = hasMore ? currentPage + 2 : currentPage + 1;
    const isPrevDisabled = currentPage === 0;
    const isNextDisabled = !hasMore;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
            <button onclick="${onPrev}()"
                ${isPrevDisabled ? 'disabled' : ''}
                 class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                 ${isPrevDisabled
                     ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                     : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] cursor-pointer'}">
                 ← ก่อนหน้า
             </button>
             <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">
                 หน้า ${currentPage + 1}
             </span>
             <button onclick="${onNext}()"
                ${isNextDisabled ? 'disabled' : ''}
                 class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                 ${isNextDisabled
                     ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                     : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] cursor-pointer'}">
                 ถัดไป →
             </button>
         </div>
     `;
};

window.prevTxPage = function () {
    if (window._dashboardTxPage <= 0) return;
    window._dashboardTxPage--;
    window.fetchRecentTransactionsPage(window._dashboardTxPage);
};

window.nextTxPage = function () {
    if (!window._dashboardTxHasMore) return;
    window._dashboardTxPage++;
    window.fetchRecentTransactionsPage(window._dashboardTxPage);
};

window.prevFeedPage = function () {
    if (window._dashboardFeedPage <= 0) return;
    window._dashboardFeedPage--;
    window.renderActivityFeedPage(window._dashboardFeedPage);
};

window.nextFeedPage = function () {
    if (!window._dashboardFeedHasMore) return;
    window._dashboardFeedPage++;
    window.renderActivityFeedPage(window._dashboardFeedPage);
};

// ============================================
// Recent Transactions Table
// ============================================
window.renderRecentTransactions = function (transactions, hasMore = false) {
    const tbody = document.getElementById('dashRecentTransactions');
    if (!tbody) return;

    const now = new Date();

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-gray-400 text-sm">ไม่มีรายการ</td></tr>';
        window.renderPagination('recentTxPagination', window._dashboardTxPage, hasMore, 'window.prevTxPage', 'window.nextTxPage');
        return;
    }

    const locale = window.currentLang === 'th' ? 'th-TH' : 'en-US';

    tbody.innerHTML = transactions.map(tx => {
        const date = new Date(tx.borrow_date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: '2-digit' });
        const isOverdue = tx.status === 'active' && tx.end_date && new Date(tx.end_date) < now;

        let statusBadge;
        if (tx.status === 'returned') {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">คืนแล้ว</span>';
        } else if (isOverdue) {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">เลยกำหนด</span>';
        } else {
            statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">กำลังยืม</span>';
        }

        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <td class="py-3 pr-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <span class="text-sm font-medium text-gray-900 dark:text-white truncate">${tx.equipments?.name || 'Unknown'}</span>
                    </div>
                </td>
                <td class="py-3 pr-4 text-sm text-gray-600 dark:text-gray-400">${tx.borrower_name}</td>
                <td class="py-3 pr-4 text-xs text-gray-500 dark:text-gray-500">${date}</td>
                <td class="py-3">${statusBadge}</td>
            </tr>
        `;
    }).join('');

    window.renderPagination('recentTxPagination', window._dashboardTxPage, hasMore, 'window.prevTxPage', 'window.nextTxPage');
};

// ============================================
// Penalty Stats Chart (Late Return vs No Show)
// ============================================
window.renderPenaltyStatsChart = function (stats) {
    const canvas = document.getElementById('dashPenaltyChart');
    if (!canvas) return;
    if (window.chartInstances.dashPenalty) window.chartInstances.dashPenalty.destroy();
    canvas.classList.add('cursor-pointer');

    const isDark = document.documentElement.classList.contains('dark');
    const labels = ['คืนล่าช้า', 'ไม่มารับของ'];
    const data = [stats.late_return || 0, stats.no_show || 0];

    window.chartInstances.dashPenalty = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: ['#EF4444', '#F59E0B'],
                borderWidth: 0,
                spacing: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDark ? '#9CA3AF' : '#6B7280',
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 8,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1e2028' : '#fff',
                    titleColor: isDark ? '#fff' : '#111',
                    bodyColor: isDark ? '#9CA3AF' : '#6B7280',
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8
                }
            },
            onClick(event, _elements, chart) {
                const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (!points.length) return;
                window.handleDashboardChartAction('penalty', { type: chart.data.labels?.[points[0].index] });
            }
        }
    });
};

// ============================================
// Activity Feed
// ============================================
window.renderActivityFeedPage = function (page) {
    const container = document.getElementById('activityFeed');
    if (!container) return;

    const events = window._feedEvents || [];
    const { start, end } = _getPageSlice(page, events.length);
    const pageEvents = events.slice(start, end);
    const hasMore = end < events.length;
    window._dashboardFeedHasMore = hasMore;

    if (pageEvents.length === 0) {
        container.innerHTML = '<p class="text-gray-400 dark:text-gray-600 text-center py-8 text-sm">ยังไม่มีกิจกรรม</p>';
        window.renderPagination('activityFeedPagination', page, hasMore, 'window.prevFeedPage', 'window.nextFeedPage');
        return;
    }

    container.innerHTML = pageEvents.map(ev => {
        const ago = window.timeAgo(ev.time);
        return `
            <div class="flex items-start gap-3 py-2.5 px-1 hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded-lg transition-colors group">
                <span class="text-base mt-0.5 w-6 text-center shrink-0">${ev.icon}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-600 dark:text-gray-300 leading-snug">${ev.text}</p>
                    <p class="text-[11px] text-gray-400 dark:text-gray-600 mt-0.5">${ago}</p>
                </div>
            </div>
        `;
    }).join('');

    window.renderPagination('activityFeedPagination', page, hasMore, 'window.prevFeedPage', 'window.nextFeedPage');
};

// ============================================
// Helpers
// ============================================
window.timeAgo = function (date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชม. ที่แล้ว`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
};

// ============================================
// Auto Refresh
// ============================================
window.setupDashboardRefresh = function () {
    if (window._dashboardRefreshInterval) {
        clearInterval(window._dashboardRefreshInterval);
    }
    window._dashboardRefreshInterval = setInterval(() => {
        const overview = document.getElementById('overviewSection');
        if (overview && !overview.classList.contains('hidden')) {
            window.fetchDashboardData();
        }
    }, 30000); // Refresh every 30 seconds
};

window.stopDashboardRefresh = function () {
    if (window._dashboardRefreshInterval) {
        clearInterval(window._dashboardRefreshInterval);
        window._dashboardRefreshInterval = null;
    }
};
