// Due Date Reminder Script
// Runs via GitHub Actions to send email reminders for items due today or tomorrow

const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_REMINDER_TEMPLATE = process.env.EMAILJS_REMINDER_TEMPLATE;

async function sendEmail(toName, toEmail, items, returnDate, when) {
    const url = 'https://api.emailjs.com/api/v1.0/email/send';

    const payload = {
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_REMINDER_TEMPLATE,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
            to_name: toName,
            to_email: toEmail,
            items: items,
            return_date: returnDate,
            when: when
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`EmailJS error: ${response.status}`);
    }

    return true;
}

async function getTransactionsDueSoon() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    // Get transactions ending today or tomorrow
    const url = `${SUPABASE_URL}/rest/v1/transactions?status=eq.active&end_date=gte.${today.toISOString()}&end_date=lt.${dayAfter.toISOString()}&select=*,equipments(name)`;

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!response.ok) {
        throw new Error(`Supabase error: ${response.status}`);
    }

    return await response.json();
}

async function main() {
    console.log('Starting due date reminder job...');
    console.log('Timestamp:', new Date().toISOString());

    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_REMINDER_TEMPLATE) {
        console.error('Missing EmailJS credentials');
        process.exit(1);
    }

    try {
        const transactions = await getTransactionsDueSoon();
        console.log(`Found ${transactions.length} transactions due soon`);

        for (const tx of transactions) {
            const endDate = new Date(tx.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            const daysUntilDue = Math.round((endDate - today) / (1000 * 60 * 60 * 24));

            let whenText;
            if (daysUntilDue === 0) {
                whenText = 'วันนี้ / today';
            } else if (daysUntilDue === 1) {
                whenText = 'พรุ่งนี้ / tomorrow';
            } else {
                continue; // Skip if more than 1 day away
            }

            // Build email
            let toEmail = tx.borrower_name;
            if (!toEmail.includes('@')) {
                toEmail = tx.borrower_name + '@student.chula.ac.th';
            }

            const equipmentName = tx.equipments?.name || `Equipment #${tx.equipment_id}`;
            const returnDate = endDate.toLocaleDateString('th-TH');

            console.log(`Sending reminder to ${toEmail} for ${equipmentName} (due ${whenText})`);

            try {
                await sendEmail(
                    tx.borrower_name,
                    toEmail,
                    equipmentName,
                    returnDate,
                    whenText
                );
                console.log(`✓ Email sent to ${toEmail}`);
            } catch (emailError) {
                console.error(`✗ Failed to send email to ${toEmail}:`, emailError.message);
            }
        }

        console.log('Reminder job completed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
