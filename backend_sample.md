# ตัวอย่างซอร์สโค้ดฝั่ง Back-end (Back-end Source Code Sample)

เอกสารนี้แสดงตัวอย่างซอร์สโค้ดในส่วนของ **Back-end & Services** ที่ใช้ในระบบ Equipment Borrowing System ซึ่งประกอบไปด้วยการตั้งค่าฐานข้อมูลและความปลอดภัย (Row Level Security) บน **Supabase** และการเขียน **Vercel Serverless Function** เพื่อใช้สำหรับ API

## 1. การกำหนดความปลอดภัยฐานข้อมูล (Supabase RLS Policies)
ตัวอย่างสคริปต์ SQL (จากไฟล์ `DB/improved_rls_policies.sql`) ที่ใช้บน Supabase เพื่อควบคุมสิทธิ์การเข้าถึงและการแก้ไขข้อมูล

```sql
-- ===========================================
-- TRANSACTIONS TABLE POLICIES
-- ===========================================

-- Transactions: ทุกคนดูได้ (อ่าน)
CREATE POLICY "Transactions - Public read" 
ON transactions FOR SELECT 
USING (true);

-- Transactions: สร้างได้ (สำหรับการยืม)
CREATE POLICY "Transactions - Insert for borrowing" 
ON transactions FOR INSERT 
WITH CHECK (true);

-- Transactions: แก้ไขได้ (สำหรับการคืน หรืออัปเดตสถานะ)
CREATE POLICY "Transactions - Update for returns" 
ON transactions FOR UPDATE 
USING (true);

-- Transactions: ห้ามลบเด็ดขาด (เก็บเป็นประวัติการยืม-คืน)
CREATE POLICY "Transactions - No delete" 
ON transactions FOR DELETE 
USING (false);

-- ===========================================
-- USERS TABLE POLICIES
-- ===========================================

-- Users: ห้ามลบ/แก้ไขโครงสร้างจากฝั่ง Client
CREATE POLICY "Users - No client modifications" ON users FOR INSERT WITH CHECK (false);
CREATE POLICY "Users - No client updates" ON users FOR UPDATE USING (false);
CREATE POLICY "Users - No client deletes" ON users FOR DELETE USING (false);
```

## 2. API ฝั่งเซิร์ฟเวอร์ (Vercel Serverless Function)
ตัวอย่างซอร์สโค้ด Node.js (จากไฟล์ `api/sso-validate.js`) ที่รันบน Vercel ทำหน้าที่เป็น Proxy server ในการตรวจสอบ (Validate) Ticket การล็อกอินด้วยระบบ Chula SSO

```javascript
// Vercel Serverless Function: SSO Ticket Validation
export default async function handler(req, res) {
    // กำหนด CORS Headers เพื่อให้ Frontend เรียกใช้ได้
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { ticket } = req.query;

        if (!ticket) {
            return res.status(400).json({ type: 'error', content: 'Missing ticket parameter' });
        }

        // ดึงค่า Credentials จาก Environment Variables ใน Vercel
        const appId = process.env.CHULA_SSO_APP_ID;
        const appSecret = process.env.CHULA_SSO_APP_SECRET;
        const ssoBaseUrl = process.env.CHULA_SSO_BASE_URL || 'https://account.it.chula.ac.th';

        if (!appId || !appSecret) {
            return res.status(500).json({ type: 'error', content: 'SSO configuration error' });
        }

        // ยิง Request ไปตรวจสอบกับ Chula SSO API
        const validationUrl = `${ssoBaseUrl}/serviceValidation?ticket=${encodeURIComponent(ticket)}`;
        const response = await fetch(validationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'DeeAppId': appId,
                'DeeAppSecret': appSecret,
                'DeeTicket': ticket
            }
        });

        const responseText = await response.text();
        const data = JSON.parse(responseText);

        if (response.ok) {
            // สำเร็จ ส่งคืนข้อมูลผู้ใช้งาน (User Info)
            return res.status(200).json(data);
        } else {
            // ล้มเหลว (Ticket หมดอายุ หรือ ไม่ถูกต้อง)
            return res.status(401).json(data);
        }

    } catch (error) {
        return res.status(500).json({
            type: 'error',
            content: 'Internal server error during SSO validation',
            debug: error.message
        });
    }
}
```

## 3. การเชื่อมต่อฐานข้อมูลจาก Client (Supabase JS)
ตัวอย่างการเขียนโค้ดเพื่อคิวรี่ข้อมูลจาก Supabase ฐานข้อมูล PostgreSQL ฝั่ง Backend (ในไฟล์ `js/data.js`)

```javascript
// ดึงข้อมูลรายการอุปกรณ์ทั้งหมด พร้อมกับเช็คสถานะการถูกยืม
window.fetchEquipments = async function () {
    try {
        // ใช้ Supabase Client (supabase) ดึงข้อมูลตาราง equipments
        const { data, error } = await window.supabase
            .from('equipments')
            .select(`
                *,
                transaction:transactions (
                    id, borrower_name, status
                )
            `)
            .order('name');

        if (error) throw error;
        
        // กรองหา Transaction ที่มีสถานะ 'active' (กำลังถูกยืมอยู่)
        const formattedData = data.map(item => {
            const activeTransaction = Array.isArray(item.transaction) 
                ? item.transaction.find(t => t.status === 'active')
                : (item.transaction?.status === 'active' ? item.transaction : null);
                
            return {
                ...item,
                transaction: activeTransaction
            };
        });

        window.equipments = formattedData;
        
        // อัปเดต UI หลังจากได้ข้อมูลจาก Database
        if (typeof window.renderEquipments === 'function') {
            window.renderEquipments();
        }
    } catch (err) {
        console.error('Error fetching equipments:', err.message);
        if (typeof window.showToast === 'function') {
            window.showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลอุปกรณ์', 'error');
        }
    }
};
```
