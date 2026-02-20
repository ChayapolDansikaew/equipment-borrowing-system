// Vercel Serverless Function: Automated Email Reminders
// This function is triggered by Vercel Cron to send email reminders for due and overdue borrowed equipments.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow GET or POST methods
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Check Configuration
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        const emailServiceId = process.env.EMAILJS_SERVICE_ID;
        const emailTemplateId = process.env.EMAILJS_REMINDER_TEMPLATE;
        // Depending on EmailJS account settings, you might need publicKey or privateKey
        const emailPublicKey = process.env.EMAILJS_PUBLIC_KEY;
        const emailPrivateKey = process.env.EMAILJS_PRIVATE_KEY; // Optional but recommended for server-side

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase configuration');
        }

        if (!emailServiceId || !emailTemplateId || (!emailPublicKey && !emailPrivateKey)) {
            console.warn('Missing EmailJS configuration, emails will not be sent.');
            return res.status(200).json({
                success: false,
                message: 'EmailJS config missing. Reminders disabled.',
                timestamp: new Date().toISOString()
            });
        }

        // 2. Initialize Supabase
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 3. Fetch Active Transactions
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                id,
                borrower_name,
                end_date,
                equipments ( name )
            `)
            .eq('status', 'active');

        if (error) {
            throw new Error(`Failed to fetch transactions: ${error.message}`);
        }

        if (!transactions || transactions.length === 0) {
            return res.status(200).json({ success: true, message: 'No active transactions.', count: 0 });
        }

        // 4. Process Transactions & Calculate Due Dates
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        const remindersToSend = [];

        for (const t of transactions) {
            if (!t.end_date) continue; // Skip if no end date

            // Parse end_date UTC safely
            const endDateString = t.end_date;
            const endDateRaw = new Date(endDateString);
            const endDay = new Date(Date.UTC(endDateRaw.getUTCFullYear(), endDateRaw.getUTCMonth(), endDateRaw.getUTCDate()));

            // Positive means future, 0 is today, negative is overdue
            const daysUntilDue = Math.ceil((endDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            // We want to send reminders if it is due today (0) or overdue (< 0)
            // You can adjust this to send 1 day before as well, e.g., daysUntilDue <= 1
            if (daysUntilDue <= 0) {
                remindersToSend.push({
                    transactionId: t.id,
                    borrower: t.borrower_name,
                    equipmentName: t.equipments?.name || 'Unknown',
                    endDateVal: endDateRaw,
                    daysUntilDue: daysUntilDue
                });
            }
        }

        if (remindersToSend.length === 0) {
            return res.status(200).json({ success: true, message: 'No reminders need to be sent today.', count: 0 });
        }

        console.log(`Preparing to send ${remindersToSend.length} email reminders.`);

        // 5. Send Emails via EmailJS REST API
        let sentCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const reminder of remindersToSend) {
            try {
                // Formatting data for EmailJS template
                let toEmail = reminder.borrower;
                if (!toEmail.includes('@')) {
                    toEmail = reminder.borrower + '@student.chula.ac.th';
                }

                const whenText = reminder.daysUntilDue === 0 ? 'วันนี้ / today' :
                    reminder.daysUntilDue === 1 ? 'พรุ่งนี้ / tomorrow' :
                        reminder.daysUntilDue < 0 ? `เลยกำหนดมาแล้ว ${Math.abs(reminder.daysUntilDue)} วัน / overdue by ${Math.abs(reminder.daysUntilDue)} days` :
                            `ในอีก ${reminder.daysUntilDue} วัน / in ${reminder.daysUntilDue} days`;

                const templateParams = {
                    to_name: reminder.borrower,
                    to_email: toEmail,
                    items: reminder.equipmentName,
                    return_date: reminder.endDateVal.toLocaleDateString('th-TH'),
                    when: whenText
                };

                // Construct EmailJS API payload
                const payload = {
                    service_id: emailServiceId,
                    template_id: emailTemplateId,
                    user_id: emailPublicKey,
                    accessToken: emailPrivateKey, // Provide if using private key for security
                    template_params: templateParams
                };

                const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`EmailJS API Error (${response.status}): ${errorText}`);
                }

                sentCount++;
                console.log(`Reminder sent to ${toEmail} for ${reminder.equipmentName}`);
                // Small delay to prevent rate-limiting from EmailJS
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (emailErr) {
                console.error(`Failed to send email to ${reminder.borrower}:`, emailErr);
                errorCount++;
                errors.push({ id: reminder.transactionId, error: emailErr.message });
            }
        }

        return res.status(200).json({
            success: true,
            timestamp: new Date().toISOString(),
            totalProcessed: remindersToSend.length,
            sentCount,
            errorCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Cron job error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
