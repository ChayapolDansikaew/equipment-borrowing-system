// js/config.js

console.log('Config loaded');

// --- CONSTANTS (from env.js) ---
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = window.ENV?.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// --- EmailJS Config (from env.js) ---
const EMAILJS_PUBLIC_KEY = window.ENV?.EMAILJS_PUBLIC_KEY || 'YOUR_EMAILJS_PUBLIC_KEY';
const EMAILJS_SERVICE_ID = window.ENV?.EMAILJS_SERVICE_ID || 'YOUR_EMAILJS_SERVICE_ID';
const EMAILJS_APPROVAL_TEMPLATE = window.ENV?.EMAILJS_APPROVAL_TEMPLATE || 'YOUR_TEMPLATE_ID';
const EMAILJS_REMINDER_TEMPLATE = window.ENV?.EMAILJS_REMINDER_TEMPLATE || 'YOUR_TEMPLATE_ID';

// --- GLOBAL STATE ---
// We attach these to window so they are accessible by other scripts and HTML attributes
window.supabaseClient = null;
window.equipments = [];
window.currentUser = null;
window.currentFilter = 'all'; // all, available, borrowed, my-items, returns
window.currentCategory = 'all'; // all, Camera, Lens, Audio, Lighting, Accessory
window.currentLang = 'th';
window.isDark = false;

// --- TRANSLATIONS ---
window.translations = {
    th: {
        overview: 'ภาพรวม',
        backToBrowse: 'กลับหน้าหลัก',
        searchPlaceholder: 'ค้นหาอุปกรณ์...',
        all: 'ทั้งหมด',
        available: 'ว่าง',
        borrowed: 'ถูกยืม',
        activeTransactions: 'รายการยืมที่กำลังดำเนินการ',
        equipment: 'อุปกรณ์',
        borrower: 'ผู้ยืม',
        date: 'วันที่',
        status: 'สถานะ',
        action: 'ดำเนินการ',
        borrow: 'ยืมอุปกรณ์',
        edit: 'แก้ไข',
        addEquipment: '+ เพิ่มอุปกรณ์',
        logout: 'ออกจากระบบ',
        totalEquipments: 'อุปกรณ์ทั้งหมด',
        borrowTitle: 'ยืนยันการยืม',
        pleaseEnterName: 'กรุณาระบุชื่อผู้ยืม',
        successBorrow: 'ยืมอุปกรณ์สำเร็จ',
        successReturn: 'คืนอุปกรณ์สำเร็จ',
        successAdd: 'เพิ่มอุปกรณ์สำเร็จ',
        successUpdate: 'อัพเดทข้อมูลสำเร็จ',
        errorUpdate: 'เกิดข้อผิดพลาดในการอัพเดท',
        errorSave: 'เกิดข้อผิดพลาดในการบันทึก',
        errorGeneral: 'เกิดข้อผิดพลาด',
        returnNotify: 'รับคืน',
        outOfStock: 'ของหมด',
        myItems: 'ของฉัน',
        returns: 'แจ้งคืน',
        youHave: 'คุณมี:',
        startDate: 'เริ่ม',
        endDate: 'สิ้นสุด',
        overdue: 'คืนล่าช้า',
        myBorrowings: 'ของที่ฉันยืม',
        noActiveBorrowings: 'ไม่มีรายการยืม',
        dueDate: 'คืนภายใน',
        borrowedOn: 'ยืมเมื่อ',
        alreadyBooked: 'อุปกรณ์ถูกจองแล้ว',
        category: 'ประเภท',
        allCategories: 'ทั้งหมด',
        noActiveTransactions: 'ไม่มีรายการคืน',
        active: 'กำลังยืม',
        refresh: 'รีเฟรช',
        today: 'วันนี้',
        thisWeek: 'สัปดาห์นี้',
        onTimeRate: 'อัตราตรงเวลา',
        weeklyBorrowings: 'การยืมรายสัปดาห์',
        topEquipment: 'อุปกรณ์ยอดนิยม',
        topBorrowers: 'ผู้ยืมมากที่สุด',
        loading: 'กำลังโหลด...',
        noBorrowingData: 'ไม่มีข้อมูลการยืม',
        times: 'ครั้ง',
        // Booking Calendar
        selectDates: 'เลือกวันยืม-คืน',
        dateRequired: 'กรุณาเลือกวันยืม-คืน',
        booked: 'ถูกจองแล้ว',
        selected: 'เลือกไว้',
        requestToBorrow: 'ขอยืมอุปกรณ์',
        useCartToBook: 'ใช้ปุ่มตะกร้าเพื่อยืม',
        equipmentDetails: 'รายละเอียดอุปกรณ์',
        totalDuration: 'ระยะเวลา',
        days: 'วัน',
        // Labels
        search: 'ค้นหา',
        statusLabel: 'สถานะ',
        myBorrowingsDesc: 'รายการอุปกรณ์ที่คุณกำลังยืมอยู่',
        noItemsDesc: 'คุณยังไม่ได้ยืมอุปกรณ์ใดๆ ในขณะนี้',
        browseEquipments: 'เลือกยืมอุปกรณ์',
        daysRemaining: 'วัน',
        // Cart
        addToCart: 'ใส่ตะกร้า',
        inCart: 'ในตะกร้า',
        cartTitle: 'ตะกร้าอุปกรณ์',
        cartEmpty: 'ตะกร้าว่างเปล่า',
        cartEmptyDesc: 'เลือกอุปกรณ์ที่ต้องการยืม',
        pieces: 'ชิ้น',
        submitRequest: 'ส่งคำขอยืม',
        // Request Form
        selectedEquipments: 'อุปกรณ์ที่เลือก',
        borrowStartDate: 'วันเริ่มยืม',
        returnDate: 'วันคืน',
        noteOptional: 'หมายเหตุ (ไม่บังคับ)',
        notePlaceholder: 'ระบุเหตุผลหรือรายละเอียดเพิ่มเติม...',
        confirmSubmit: 'ยืนยันส่งคำขอ',
        // My Requests
        myRequests: 'คำขอของฉัน',
        noRequests: 'ยังไม่มีคำขอยืม',
        noRequestsDesc: 'เลือกอุปกรณ์และส่งคำขอเพื่อเริ่มต้น',
        sentOn: 'ส่งเมื่อ',
        deleteRequest: 'ลบคำขอนี้',
        approved: 'อนุมัติแล้ว',
        rejected: 'ถูกปฏิเสธ',
        pendingApproval: 'รออนุมัติ',
        reason: 'เหตุผล',
        // Pending Requests (Admin)
        noPendingRequests: 'ไม่มีคำขอที่รออนุมัติ',
        approveAll: '✓ อนุมัติทั้งหมด',
        pendingCount: 'รอดำเนินการ',
        approve: 'อนุมัติ',
        reject: 'ปฏิเสธ',
        // Toast Messages
        selectEquipmentFirst: 'กรุณาเลือกอุปกรณ์ก่อน',
        selectBorrowDates: 'กรุณาเลือกวันยืม-คืน',
        endDateAfterStart: 'วันสิ้นสุดต้องหลังวันเริ่มต้น',
        requestSentSuccess: 'ส่งคำขอยืมสำเร็จ! รอการอนุมัติ',
        requestNotFound: 'ไม่พบคำขอ',
        equipmentNotFound: 'ไม่พบอุปกรณ์',
        confirmDeleteRequest: 'ต้องการลบคำขอนี้หรือไม่?',
        rejectionReasonPrompt: 'เหตุผลที่ปฏิเสธ (ไม่บังคับ):',
        rejectedSuccess: 'ปฏิเสธคำขอแล้ว',
        approveError: 'เกิดข้อผิดพลาดในการอนุมัติ',
        noPendingItems: 'ไม่มีรายการรออนุมัติ',
        // Borrowing History
        history: 'ประวัติ',
        borrowingHistory: 'ประวัติการยืม-คืน',
        borrowingHistoryDesc: 'ประวัติการยืม-คืนอุปกรณ์ทั้งหมด',
        allStatus: 'ทั้งหมด',
        returnedStatus: 'คืนแล้ว',
        overdueStatus: 'เลยกำหนด',
        activeStatus: 'กำลังยืม',
        actualReturn: 'วันคืนจริง',
        noHistoryRecords: 'ไม่พบประวัติการยืม-คืน',
        noHistoryDesc: 'ยังไม่มีรายการยืม-คืนในระบบ',
        exportCSV: 'ดาวน์โหลด CSV',
        page: 'หน้า',
        of: 'จาก',
        showing: 'แสดง',
        records: 'รายการ',
        searchEquipment: 'ค้นหาอุปกรณ์...',
        searchBorrower: 'ค้นหาผู้ยืม...',
        total: 'ทั้งหมด',
        returned: 'คืนแล้ว',
        filterBy: 'กรอง'
    },
    en: {
        overview: 'Overview',
        backToBrowse: 'Back to Browse',
        searchPlaceholder: 'Search equipment...',
        all: 'All',
        available: 'Available',
        borrowed: 'Borrowed',
        activeTransactions: 'Active Transactions',
        equipment: 'Equipment',
        borrower: 'Borrower',
        date: 'Date',
        status: 'Status',
        action: 'Action',
        borrow: 'Borrow',
        edit: 'Edit',
        addEquipment: '+ Add Equipment',
        logout: 'Logout',
        totalEquipments: 'Total Equipments',
        borrowTitle: 'Confirm Borrow',
        pleaseEnterName: 'Please enter borrower name',
        successBorrow: 'Borrowed successfully',
        successReturn: 'Returned successfully',
        successAdd: 'Added successfully',
        successUpdate: 'Updated successfully',
        errorUpdate: 'Error updating',
        errorSave: 'Error saving',
        errorGeneral: 'An error occurred',
        returnNotify: 'Return',
        outOfStock: 'Out of Stock',
        myItems: 'My Items',
        returns: 'Returns',
        youHave: 'You have:',
        startDate: 'Start',
        endDate: 'End',
        overdue: 'Overdue',
        myBorrowings: 'My Borrowings',
        noActiveBorrowings: 'No active borrowings',
        dueDate: 'Due',
        borrowedOn: 'Borrowed on',
        alreadyBooked: 'Equipment already booked',
        category: 'Category',
        allCategories: 'All',
        noActiveTransactions: 'No active transactions',
        active: 'Active',
        refresh: 'Refresh',
        today: 'Today',
        thisWeek: 'This Week',
        onTimeRate: 'On-Time Rate',
        weeklyBorrowings: 'Weekly Borrowings',
        topEquipment: 'Top Equipment',
        topBorrowers: 'Top Borrowers',
        loading: 'Loading...',
        noBorrowingData: 'No borrowing data',
        times: 'times',
        // Booking Calendar
        selectDates: 'Select Dates',
        dateRequired: 'Please select borrow dates',
        booked: 'Booked',
        selected: 'Selected',
        requestToBorrow: 'Request to Borrow',
        useCartToBook: 'Use the cart button to borrow',
        equipmentDetails: 'Equipment Details',
        totalDuration: 'Duration',
        days: 'days',
        // Labels
        search: 'Search',
        statusLabel: 'Status',
        myBorrowingsDesc: 'Equipment you are currently borrowing',
        noItemsDesc: 'You have not borrowed any equipment yet',
        browseEquipments: 'Browse Equipment',
        daysRemaining: 'days',
        // Cart
        addToCart: 'Add to Cart',
        inCart: 'In Cart',
        cartTitle: 'Equipment Cart',
        cartEmpty: 'Cart is empty',
        cartEmptyDesc: 'Select equipment to borrow',
        pieces: 'pcs',
        submitRequest: 'Submit Request',
        // Request Form
        selectedEquipments: 'Selected Equipment',
        borrowStartDate: 'Start Date',
        returnDate: 'Return Date',
        noteOptional: 'Note (Optional)',
        notePlaceholder: 'Specify reason or additional details...',
        confirmSubmit: 'Confirm & Submit',
        // My Requests
        myRequests: 'My Requests',
        noRequests: 'No requests yet',
        noRequestsDesc: 'Select equipment and submit a request to get started',
        sentOn: 'Sent on',
        deleteRequest: 'Delete this request',
        approved: 'Approved',
        rejected: 'Rejected',
        pendingApproval: 'Pending',
        reason: 'Reason',
        // Pending Requests (Admin)
        noPendingRequests: 'No pending requests',
        approveAll: '✓ Approve All',
        pendingCount: 'pending',
        approve: 'Approve',
        reject: 'Reject',
        // Toast Messages
        selectEquipmentFirst: 'Please select equipment first',
        selectBorrowDates: 'Please select borrow dates',
        endDateAfterStart: 'End date must be after start date',
        requestSentSuccess: 'Request sent successfully! Awaiting approval',
        requestNotFound: 'Request not found',
        equipmentNotFound: 'Equipment not found',
        confirmDeleteRequest: 'Delete this request?',
        rejectionReasonPrompt: 'Reason for rejection (optional):',
        rejectedSuccess: 'Request rejected',
        approveError: 'Error approving request',
        noPendingItems: 'No items pending approval',
        // Borrowing History
        history: 'History',
        borrowingHistory: 'Borrowing History',
        borrowingHistoryDesc: 'Complete equipment borrowing and return records',
        allStatus: 'All',
        returnedStatus: 'Returned',
        overdueStatus: 'Overdue',
        activeStatus: 'Active',
        actualReturn: 'Returned On',
        noHistoryRecords: 'No borrowing history found',
        noHistoryDesc: 'No borrowing records in the system yet',
        exportCSV: 'Download CSV',
        page: 'Page',
        of: 'of',
        showing: 'Showing',
        records: 'records',
        searchEquipment: 'Search equipment...',
        searchBorrower: 'Search borrower...',
        total: 'Total',
        returned: 'Returned',
        filterBy: 'Filter'
    }
};

// --- INITIALIZATION HELPERS ---
window.initSupabase = function () {
    if (SUPABASE_URL.startsWith('YOUR') || SUPABASE_KEY.startsWith('YOUR')) {
        console.warn('Configuration Needed');
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('loginSection').innerHTML = `
             <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                 <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md dark:bg-gray-800 text-center">
                     <h2 class="text-2xl font-bold text-red-500 mb-4">Configuration Needed</h2>
                     <p class="text-gray-600 dark:text-gray-300 mb-4">Please set SUPABASE_URL and SUPABASE_KEY in js/config.js</p>
                 </div>
             </div>
         `;
        return false;
    }
    try {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        return true;
    } catch (e) {
        console.error("Supabase init failed", e);
        return false;
    }
};
