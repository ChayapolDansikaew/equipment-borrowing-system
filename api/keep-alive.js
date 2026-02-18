// Vercel Serverless Function: Keep Supabase Alive
// This function runs on a schedule to prevent Supabase from being paused

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    try {
        // Initialize Supabase client from environment variables
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase configuration in environment variables');
            return res.status(500).json({
                success: false,
                error: 'Missing Supabase configuration',
                timestamp: new Date().toISOString()
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Simple query to keep the database active
        const { data, error } = await supabase
            .from('equipments')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Keep-alive query failed:', error);
            return res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        console.log('Keep-alive ping successful:', new Date().toISOString());

        return res.status(200).json({
            success: true,
            message: 'Supabase keep-alive ping successful',
            timestamp: new Date().toISOString(),
            recordsFound: data?.length || 0
        });

    } catch (error) {
        console.error('Keep-alive error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
