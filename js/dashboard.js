// js/dashboard.js — Admin Dashboard Module
console.log('Dashboard module loaded');

window.chartInstances = window.chartInstances || {};
window._dashboardInitialized = false;
window._dashboardRefreshInterval = null;

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
        const [txResult, eqResult, usersResult] = await Promise.all([
            window.supabaseClient
                .from('transactions')
                .select('*, equipments(name, type)')
                .order('borrow_date', { ascending: false }),
            window.supabaseClient
                .from('equipments')
                .select('*'),
            window.supabaseClient
                .from('users')
                .select('id, username, role, created_at')
        ]);

        const transactions = txResult.data || [];
        const equipments = eqResult.data || [];
        const users = usersResult.data || [];
        const requests = await window.requests?.getAll() || [];

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

        const stats = {
            totalEquipment, available, borrowed, pendingRequests,
            overdueCount, onTimeRate, todayBorrows, weekBorrows,
            utilizationRate, totalUsers: users.length
        };

        // === Update Greeting ===
        const greeting = document.getElementById('dashGreeting');
        if (greeting) {
            const username = window.currentUser?.username || 'Admin';
            const hour = new Date().getHours();
            const greetText = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
            greeting.textContent = `${greetText}, ${username} 👋`;
        }

        // === Render Everything ===
        window.renderKPICards(stats);
        window.renderTrendChart(transactions, monthStart);
        window.renderCategoryChart(equipments);
        window.renderStatusChart(stats);
        window.renderTopBorrowersChart(transactions);
        window.renderRecentTransactions(transactions);
        window.renderKanbanBoard(requests, transactions);
        window.renderActivityFeed(transactions, requests);

    } catch (err) {
        console.error('Dashboard fetch error:', err);
    }
};

// ============================================
// KPI Cards
// ============================================
window.renderKPICards = function (stats) {
    const cards = [
        { id: 'kpi-total', value: stats.totalEquipment, label: 'อุปกรณ์ทั้งหมด' },
        { id: 'kpi-available', value: stats.available, label: 'พร้อมใช้งาน' },
        { id: 'kpi-borrowed', value: stats.borrowed, label: 'ถูกยืม' },
        { id: 'kpi-pending', value: stats.pendingRequests, label: 'รออนุมัติ' },
        { id: 'kpi-overdue', value: stats.overdueCount, label: 'คืนล่าช้า' },
        { id: 'kpi-ontime', value: stats.onTimeRate + '%', label: 'ตรงเวลา' }
    ];

    cards.forEach(card => {
        const el = document.getElementById(card.id);
        if (el) {
            el.querySelector('.kpi-value').textContent = card.value;
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

    const labels = Object.keys(days).map(d => {
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
            }
        }
    });
};

// 3. Equipment Status (Bar)
window.renderStatusChart = function (stats) {
    const canvas = document.getElementById('dashStatusChart');
    if (!canvas) return;
    if (window.chartInstances.dashStatus) window.chartInstances.dashStatus.destroy();

    const isDark = document.documentElement.classList.contains('dark');

    window.chartInstances.dashStatus = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['พร้อมใช้งาน', 'ถูกยืม', 'คืนล่าช้า'],
            datasets: [{
                data: [stats.available, stats.borrowed, stats.overdueCount],
                backgroundColor: ['#10B981', '#FFD100', '#EF4444'],
                borderRadius: 8,
                barThickness: 32
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
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
// Recent Transactions Table
// ============================================
window.renderRecentTransactions = function (transactions) {
    const tbody = document.getElementById('dashRecentTransactions');
    if (!tbody) return;

    const recent = transactions.slice(0, 8);
    const now = new Date();

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-gray-400 text-sm">ไม่มีรายการ</td></tr>';
        return;
    }

    const locale = window.currentLang === 'th' ? 'th-TH' : 'en-US';

    tbody.innerHTML = recent.map(tx => {
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
};

// ============================================
// Kanban Pipeline
// ============================================
window.renderKanbanBoard = function (requests, transactions) {
    const container = document.getElementById('kanbanBoard');
    if (!container) return;

    const columns = {
        pending: { title: 'รออนุมัติ', color: 'yellow', icon: '⏳', items: [] },
        approved: { title: 'อนุมัติแล้ว', color: 'blue', icon: '✅', items: [] },
        active: { title: 'กำลังยืม', color: 'green', icon: '📦', items: [] },
        returned: { title: 'คืนแล้ว', color: 'gray', icon: '✔️', items: [] }
    };

    // From Supabase requests
    requests.forEach(req => {
        req.items.forEach(item => {
            const card = {
                user: req.userName,
                equipment: item.name,
                date: new Date(req.createdAt).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
                requestId: req.id
            };
            if (item.status === 'pending') columns.pending.items.push(card);
            else if (item.status === 'approved') columns.approved.items.push(card);
            else if (item.status === 'rejected') { /* skip */ }
        });
    });

    // From Supabase transactions
    const recentTx = transactions.slice(0, 30); // last 30
    recentTx.forEach(tx => {
        const card = {
            user: tx.borrower_name,
            equipment: tx.equipments?.name || 'Unknown',
            date: new Date(tx.borrow_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
        };
        if (tx.status === 'active') columns.active.items.push(card);
        else if (tx.status === 'returned') columns.returned.items.push(card);
    });

    // Limit returned to last 10
    columns.returned.items = columns.returned.items.slice(0, 10);

    const colorMap = {
        yellow: { bg: 'bg-yellow-500/10 dark:bg-yellow-500/5', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', dot: 'bg-yellow-500' },
        blue: { bg: 'bg-blue-500/10 dark:bg-blue-500/5', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
        green: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
        gray: { bg: 'bg-gray-500/10 dark:bg-gray-500/5', border: 'border-gray-500/30', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' }
    };

    container.innerHTML = Object.entries(columns).map(([key, col]) => {
        const c = colorMap[col.color];
        const cardsHtml = col.items.length > 0
            ? col.items.map(item => `
                <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${item.equipment}</p>
                    <div class="flex items-center justify-between mt-2">
                        <span class="text-xs text-gray-500 dark:text-gray-400">${item.user}</span>
                        <span class="text-[10px] text-gray-400 dark:text-gray-500">${item.date}</span>
                    </div>
                </div>
            `).join('')
            : `<p class="text-xs text-gray-400 dark:text-gray-600 text-center py-6">ไม่มีรายการ</p>`;

        return `
            <div class="min-w-[220px] flex-1">
                <div class="flex items-center gap-2 mb-3 px-1">
                    <span class="w-2 h-2 rounded-full ${c.dot}"></span>
                    <h4 class="text-xs font-bold uppercase tracking-wider ${c.text}">${col.title}</h4>
                    <span class="ml-auto text-[10px] font-bold ${c.text} ${c.bg} px-1.5 py-0.5 rounded-full">${col.items.length}</span>
                </div>
                <div class="space-y-2 ${c.bg} rounded-xl p-2 min-h-[120px] border ${c.border}">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }).join('');
};

// ============================================
// Activity Feed
// ============================================
window.renderActivityFeed = function (transactions, requests) {
    const container = document.getElementById('activityFeed');
    if (!container) return;

    const events = [];

    // From transactions
    transactions.slice(0, 15).forEach(tx => {
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

    // From requests
    requests.slice(0, 10).forEach(req => {
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

    // Sort by time descending
    events.sort((a, b) => b.time - a.time);

    if (events.length === 0) {
        container.innerHTML = '<p class="text-gray-400 dark:text-gray-600 text-center py-8 text-sm">ยังไม่มีกิจกรรม</p>';
        return;
    }

    container.innerHTML = events.slice(0, 12).map(ev => {
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
