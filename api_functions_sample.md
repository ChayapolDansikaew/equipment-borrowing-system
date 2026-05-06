# ตัวอย่างซอร์สโค้ด Serverless Functions (Vercel API)

เอกสารนี้แสดงตัวอย่างซอร์สโค้ดของฟังก์ชัน API (Serverless Functions) ที่ทำงานอยู่บน Vercel ซึ่งสอดคล้องกับรายละเอียดที่ระบุไว้ในเอกสารการออกแบบสถาปัตยกรรมระบบ

## 1. ฟังก์ชัน /api/sso-validate.js
ใช้สำหรับตรวจสอบความถูกต้อง (Validate) ของ Chula SSO ticket ว่าเป็นผู้ใช้งานจริงจากทางจุฬาลงกรณ์มหาวิทยาลัยหรือไม่

```javascript
// Vercel Serverless Function: SSO Ticket Validation
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { ticket } = req.query;
        if (!ticket) return res.status(400).json({ type: 'error', content: 'Missing ticket parameter' });

        const appId = process.env.CHULA_SSO_APP_ID;
        const appSecret = process.env.CHULA_SSO_APP_SECRET;
        const ssoBaseUrl = process.env.CHULA_SSO_BASE_URL || 'https://account.it.chula.ac.th';

        // ส่ง Request ไปให้ Chula SSO Service Validate
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
            return res.status(200).json(data);
        } else {
            return res.status(401).json(data);
        }
    } catch (error) {
        return res.status(500).json({ type: 'error', content: 'Internal server error' });
    }
}
```

## 2. ฟังก์ชัน /api/cron-reminders.js
เป็นระบบ Cron job ที่ทำงานอัตโนมัติ (ปัจจุบันฟีเจอร์นี้ได้ถูกระงับการใช้งานและแทนที่ด้วยระบบแจ้งเตือนการปฏิเสธคำขอ เพื่อให้สอดคล้องกับข้อจำกัดโควต้าฟรีของ EmailJS แต่ยังคงมีโครงสร้างดังนี้)

```javascript
// Vercel Serverless Function: Cron Reminders
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
        
        // ดึงข้อมูลรายการที่กำลังยืมอยู่
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*, equipments(name)')
            .eq('status', 'active');
            
        if (error) throw error;
        
        let emailsSent = 0;
        const now = new Date();
        
        // ค้นหารายการที่ใกล้ถึงกำหนดคืนเพื่อส่งอีเมล
        for (const tr of transactions) {
            const dueDate = new Date(tr.end_date);
            const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) { // แจ้งเตือนล่วงหน้า 1 วัน
                console.log(`Sending reminder to ${tr.borrower_name} for ${tr.equipments?.name}`);
                // ทำการส่งผ่าน Email API
                emailsSent++;
            }
        }

        return res.status(200).json({ success: true, emailsSent });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
```

## 3. ฟังก์ชัน /api/keep-alive.js
สำหรับ Ping ไปยังเซิร์ฟเวอร์ Supabase ในทุกๆ 5 วัน เพื่อป้องกันปัญหา Cold start หรือการถูก Pause ของระบบฐานข้อมูลที่ใช้งานแพ็คเกจฟรี

```javascript
// Vercel Serverless Function: Keep Supabase Alive
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        const supabase = createClient(supabaseUrl, supabaseKey);

        // ยิง Query เบาๆ เพื่อให้ฐานข้อมูลเกิด Activity ป้องกันการถูก Pause
        const { data, error } = await supabase
            .from('equipments')
            .select('id')
            .limit(1);

        if (error) throw error;

        console.log('Keep-alive ping successful:', new Date().toISOString());

        return res.status(200).json({
            success: true,
            message: 'Supabase keep-alive ping successful',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Keep-alive error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
```
