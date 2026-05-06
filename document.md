# Equipment Borrowing System

## ภาพรวมโปรเจค (Project Overview)

ระบบยืม-คืนอุปกรณ์สำหรับองค์กร พัฒนาเป็น **Single Page Application (SPA)** ด้วย Vanilla JavaScript, Tailwind CSS และ Supabase เป็น Backend-as-a-Service (BaaS) พร้อม Deploy บน **Vercel**

- **ชื่อโปรเจค:** Equipment Borrowing System
- **ผู้พัฒนา:** Chayapol Dansikaew
- **License:** MIT
- **Version:** 1.0.0

---

## เทคโนโลยีที่ใช้ (Tech Stack)

### Front-end
| เทคโนโลยี | หน้าที่ |
|---|---|
| **HTML / JavaScript (ES Module)** | โครงสร้างหน้าเว็บและ Logic หลัก |
| **Tailwind CSS (CDN)** | การจัดสไตล์ UI ทั้งหมด |
| **Chart.js** | แสดงกราฟและ Analytics บน Dashboard |
| **Flatpickr** | Date Picker สำหรับเลือกวันยืม-คืน |
| **Google Fonts (Kanit)** | ฟอนต์ภาษาไทย |

### Back-end
| เทคโนโลยี | หน้าที่ |
|---|---|
| **Supabase** | ฐานข้อมูล PostgreSQL, Row Level Security (RLS) |
| **Vercel** | Hosting, Serverless Functions, Cron Jobs |

### Services / 3rd Party
| เทคโนโลยี | หน้าที่ |
|---|---|
| **EmailJS** | ส่งอีเมลแจ้งเตือนผู้ใช้ (อนุมัติ, ปฏิเสธ) |
| **Chula SSO** | Single Sign-On สำหรับบัญชีจุฬาฯ |

---

## โครงสร้างไฟล์ (Project Structure)

```
senior-project/
├── index.html              # หน้าเว็บหลัก (SPA ทั้งหมดอยู่ในไฟล์เดียว)
├── callback.html           # Callback page สำหรับ Chula SSO
├── package.json            # Project metadata และ dependencies
├── vercel.json             # Vercel configuration (cron, rewrites, headers)
│
├── js/                     # JavaScript Modules
│   ├── config.js           # ค่าคงที่, Supabase client, ตัวแปร global, translations (TH/EN)
│   ├── env.js              # Environment variables (Supabase URL, API Key)
│   ├── env.example.js      # ตัวอย่างไฟล์ env
│   ├── auth.js             # ระบบ Login/Logout, Session, Chula SSO
│   ├── security.js         # XSS Prevention, Input Sanitization, Hash Password, Rate Limiting
│   ├── data.js             # ดึง/เขียนข้อมูล Supabase (equipments, transactions, users, penalties)
│   ├── ui.js               # Render UI, modals, charts, theme, language, skeleton loading
│   ├── cart.js             # จัดการตะกร้า (localStorage)
│   ├── requests.js         # ระบบคำขอยืม, อนุมัติ/ปฏิเสธ, email notification, badge polling
│   └── dashboard.js        # Admin Dashboard (KPI, charts, Kanban, activity feed)
│
├── api/                    # Vercel Serverless Functions
│   ├── sso-validate.js     # Validate Chula SSO ticket
│   └── keep-alive.js       # Cron job: Ping Supabase เพื่อป้องกัน cold start (ทุก 5 วัน)
│
├── DB/                     # SQL Scripts
│   ├── reset_db.sql        # สร้างตาราง users, equipments, transactions + Seed data
│   ├── penalty_tables.sql  # สร้างตาราง penalties + เพิ่ม columns ใน users
│   ├── db_optimization.sql # Indexes และ performance tuning
│   ├── hash_passwords.sql  # แปลง password เป็น SHA-256
│   ├── improved_rls_policies.sql  # Security policies ที่ปรับปรุงแล้ว
│   ├── seed_50_equipments.sql     # Seed อุปกรณ์ 50 รายการ
│   └── setup_auth.sql      # ตั้งค่า authentication
│
├── sql/
│   └── create_borrow_requests.sql # สร้างตาราง borrow_requests + request_items
│
├── images/
│   └── sciren-logo.png     # โลโก้ SciREN
│
└── .github/                # GitHub configurations
```

---

## ฐานข้อมูล (Database Schema)

### ตาราง `users`
| Column | Type | Description |
|---|---|---|
| `id` | BIGINT (PK) | รหัสผู้ใช้ |
| `username` | TEXT (UNIQUE) | ชื่อผู้ใช้ |
| `password` | TEXT | รหัสผ่าน (SHA-256 hashed) |
| `role` | TEXT | บทบาท: `admin` หรือ `user` |
| `total_strikes` | INTEGER | จำนวน strike สะสม |
| `is_banned` | BOOLEAN | สถานะถูกแบน |
| `ban_until` | TIMESTAMP | วันที่หมดการแบน |
| `ban_reason` | TEXT | เหตุผลที่ถูกแบน |
| `created_at` | TIMESTAMP | วันที่สร้างบัญชี |

### ตาราง `equipments`
| Column | Type | Description |
|---|---|---|
| `id` | BIGINT (PK) | รหัสอุปกรณ์ |
| `name` | TEXT | ชื่ออุปกรณ์ |
| `type` | TEXT | หมวดหมู่ (Camera, Lens, Audio, Lighting, Accessory) |
| `image_url` | TEXT | URL รูปภาพ |
| `status` | TEXT | สถานะ: `available` หรือ `borrowed` |
| `created_at` | TIMESTAMP | วันที่เพิ่ม |

### ตาราง `transactions`
| Column | Type | Description |
|---|---|---|
| `id` | BIGINT (PK) | รหัส transaction |
| `equipment_id` | BIGINT (FK) | อ้างอิง equipments |
| `borrower_name` | TEXT | ชื่อผู้ยืม |
| `borrow_date` | TIMESTAMP | วันที่ยืม |
| `return_date` | TIMESTAMP | วันที่คืน (nullable) |
| `start_date` | TIMESTAMP | วันเริ่มต้นจอง |
| `end_date` | TIMESTAMP | วันสิ้นสุดจอง |
| `status` | TEXT | สถานะ: `active` หรือ `returned` |

### ตาราง `penalties`
| Column | Type | Description |
|---|---|---|
| `id` | SERIAL (PK) | รหัส penalty |
| `user_id` | VARCHAR | username ผู้กระทำผิด |
| `transaction_id` | INTEGER (FK) | อ้างอิง transactions |
| `equipment_id` | INTEGER (FK) | อ้างอิง equipments |
| `penalty_type` | VARCHAR | ประเภท: `late_return`, `no_show`, `minor_damage`, `major_damage`, `lost` |
| `severity` | VARCHAR | ระดับ: `low`, `medium`, `high`, `critical` |
| `days_late` | INTEGER | จำนวนวันที่ล่าช้า |
| `strikes_given` | INTEGER | จำนวน strike ที่ได้ |
| `compensation_amount` | DECIMAL | ค่าชดใช้ |
| `compensation_status` | VARCHAR | สถานะค่าชดใช้: `none`, `pending`, `paid`, `waived` |
| `created_by` | VARCHAR | Admin ที่บันทึก |
| `created_at` | TIMESTAMP | วันที่สร้าง |

---

## ฟีเจอร์หลัก (Features)

### 🔐 ระบบ Authentication
- เข้าสู่ระบบด้วย Username/Password
- เข้าสู่ระบบด้วย **Chula SSO** (Single Sign-On จุฬาลงกรณ์มหาวิทยาลัย)
- Session management ผ่าน `sessionStorage` (หมดอายุ 24 ชม.)
- SHA-256 Password hashing
- Rate limiting (ล็อค 30 วินาทีหลังพยายาม 5 ครั้ง)
- บัญชีทดลอง: `admin/admin123`, `user/user123`

### 🛒 ระบบตะกร้า (Cart System)
- เพิ่ม/ลบอุปกรณ์ในตะกร้า
- กำหนดจำนวน (quantity) ต่อรายการ
- เก็บข้อมูลใน `localStorage`
- Badge แสดงจำนวนบน Navbar

### 📝 ระบบคำขอยืม (Borrow Request)
- ผู้ใช้ส่งคำขอยืมพร้อมเลือกวันเริ่ม-สิ้นสุด
- ใส่โน้ตเพิ่มเติมได้
- ปฏิทิน Booking Calendar (Flatpickr) แสดงวันที่มีคนจองแล้ว
- ตรวจสอบวันที่ซ้อนทับ (overlap detection)

### ✅ ระบบอนุมัติ (Admin Approval)
- Admin ดูคำขอที่รออนุมัติ
- อนุมัติ/ปฏิเสธรายชิ้น หรืออนุมัติทั้งหมดในคำขอเดียว
- ระบุเหตุผลกรณีปฏิเสธ
- Badge แจ้งจำนวนคำขอค้าง (auto-refresh ทุก 15 วินาที)

### 📦 จัดการอุปกรณ์ (Equipment Management)
- เพิ่ม/แก้ไข/ลบอุปกรณ์ (Admin only)
- ค้นหาด้วยชื่อหรือหมวดหมู่
- กรองสถานะ: ทั้งหมด / ว่าง / ถูกยืม
- กรองหมวดหมู่: Camera, Lens, Audio, Lighting, Accessory
- แสดงผลเป็น Card grid พร้อม skeleton loading

### 📊 Admin Dashboard
- **KPI Cards:** จำนวนอุปกรณ์, ที่ว่าง, กำลังยืม, ค้างคืน
- **กราฟ Trend:** การยืมรายวันใน 30 วัน (Line Chart)
- **กราฟ Category:** สัดส่วนอุปกรณ์ตามหมวด (Doughnut Chart)
- **กราฟ Status:** สถานะอุปกรณ์ (Bar Chart)
- **Top Borrowers:** ผู้ยืมมากที่สุด (Horizontal Bar Chart)
- **Kanban Board:** สถานะคำขอ (Pending → Approved → Active → Returned)
- **Activity Feed:** กิจกรรมล่าสุดแบบ timeline
- **Recent Transactions:** ตาราง transactions ล่าสุด
- Auto-refresh ทุก 60 วินาที

### 📋 ประวัติการยืม-คืน (Borrowing History)
- ตารางแสดงประวัติทั้งหมด (pagination 30 รายการ/หน้า)
- กรองตามสถานะ, ค้นหาตามชื่ออุปกรณ์/ผู้ยืม
- Export เป็น CSV

### ⚠️ ระบบบทลงโทษ (Penalty System)
- บันทึกความผิด: คืนช้า, ความเสียหายเล็กน้อย/รุนแรง, สูญหาย
- ระบบ Strike สะสม (คืนช้า 1-2 strike, เสียหาย 2-3 strike, สูญหาย 5 strike)
- แบนผู้ใช้อัตโนมัติเมื่อ strike ถึงเกณฑ์ (≥3: 7 วัน, ≥5: 30 วัน, ≥10: ถาวร)
- ค่าชดใช้ (compensation) พร้อมติดตามสถานะการจ่าย

### 👥 จัดการผู้ใช้ (User Management)
- ดูรายชื่อผู้ใช้ทั้งหมดแบบ Card grid
- เปลี่ยน role (admin ↔ user)
- ดูสถิติผู้ใช้: วันที่ active ล่าสุด, strike, สถานะแบน

### 📧 ระบบแจ้งเตือน (Notifications)
- อีเมลแจ้งเมื่อคำขอได้รับการอนุมัติ (EmailJS)
- อีเมลแจ้งเมื่อคำขอถูกปฏิเสธ หรือถูก auto-reject (EmailJS)
- Auto-reject คำขอที่ทับซ้อนเมื่ออุปกรณ์ถูกอนุมัติให้ผู้ใช้อื่น
- Bell notification badge สำหรับ Admin และ User

### 🌐 อื่นๆ
- **Dark Mode / Light Mode:** สลับธีมได้
- **2 ภาษา (i18n):** ไทย / English
- **Responsive Design:** รองรับ Desktop และ Mobile
- **Glassmorphism UI:** เอฟเฟกต์กระจกพร้อม micro-animations
- **Accessibility:** Skip link, focus states, reduced motion support
- **Security Headers:** `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`

---

## การติดตั้ง (Installation)

### 1. Clone โปรเจค
```bash
git clone https://github.com/ChayapolDansikaew/equipment-borrowing-system.git
cd equipment-borrowing-system
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
คัดลอก `js/env.example.js` เป็น `js/env.js` แล้วแก้ค่า:
```javascript
window.ENV = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',
    EMAILJS_PUBLIC_KEY: 'your-emailjs-key',
    EMAILJS_SERVICE_ID: 'your-service-id',
    EMAILJS_TEMPLATE_ID: 'your-template-id'
};
```

### 4. ตั้งค่าฐานข้อมูล Supabase
รัน SQL scripts ตามลำดับใน Supabase SQL Editor:
1. `DB/reset_db.sql` — สร้างตารางหลัก + Seed data
2. `DB/penalty_tables.sql` — สร้างตาราง penalties
3. `sql/create_borrow_requests.sql` — สร้างตาราง borrow_requests
4. `DB/hash_passwords.sql` — Hash passwords (optional)
5. `DB/improved_rls_policies.sql` — ปรับปรุง security policies (optional)
6. `DB/db_optimization.sql` — เพิ่ม indexes (optional)

### 5. รันในเครื่อง
```bash
npm run dev
```
เปิด http://localhost:3000 ในเบราว์เซอร์

---

## การ Deploy (Deployment)

โปรเจคออกแบบมาสำหรับ **Vercel**:

```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Cron Jobs (อัตโนมัติ)
| Cron | Schedule | หน้าที่ |
|---|---|---|
| `/api/keep-alive` | ทุก 5 วัน | Ping Supabase ป้องกัน cold start |

---

## บัญชีทดลอง (Demo Accounts)

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin123` |
| **User** | `user` | `user123` |

---

## Security

- ✅ SHA-256 Password Hashing (Web Crypto API)
- ✅ XSS Prevention (`sanitizeHTML`, `sanitizeInput`)
- ✅ Row Level Security (RLS) บน Supabase
- ✅ Session Validation พร้อมหมดอายุ 24 ชม.
- ✅ Login Rate Limiting (5 ครั้ง / ล็อค 30 วินาที)
- ✅ Security Headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- ✅ Input sanitization ก่อนบันทึกลง Database
