/**
 * Pathway Canada: Notion Database Sync Integration
 * Syncs student admissions data and roster from Supabase CANEDU to Notion.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// Read config from .env or environment
let NOTION_TOKEN = null;
let NOTION_DATABASE_ID = '3e739cfd847e8045a31fe994066fe405';

try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
            if (line.startsWith('NOTION_API_KEY=')) {
                NOTION_TOKEN = line.split('=')[1].trim();
            }
            if (line.startsWith('NOTION_DATABASE_ID=')) {
                NOTION_DATABASE_ID = line.split('=')[1].trim();
            }
        }
    }
} catch (e) {
    // Ignore read errors
}

if (!NOTION_TOKEN) {
    NOTION_TOKEN = process.env.NOTION_API_KEY;
}

const NOTION_VERSION = '2022-06-28';

export function notionRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        if (!NOTION_TOKEN) {
            return reject(new Error('NOTION_API_KEY environment variable is not set.'));
        }

        const payload = data ? JSON.stringify(data) : null;
        const options = {
            hostname: 'api.notion.com',
            path: '/v1' + endpoint,
            method: method,
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json'
            }
        };

        if (payload) {
            options.headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(parsed.message || `Notion API Error: ${res.statusCode}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse Notion response: ${body}`));
                }
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

// Get specific database details
export async function getDatabase(dbId = NOTION_DATABASE_ID) {
    return notionRequest(`/databases/${dbId}`, 'GET');
}

// Query records currently inside the database
export async function queryDatabaseRecords(dbId = NOTION_DATABASE_ID) {
    return notionRequest(`/databases/${dbId}/query`, 'POST', {});
}

// Push / Sync a student record into the Notion database
export async function pushStudentToNotion(student, dbId = NOTION_DATABASE_ID) {
    const properties = {
        "Name": {
            "title": [{ "text": { "content": student.name || "Student" } }]
        }
    };

    if (student.email) {
        properties["Email"] = { "email": student.email };
    }
    if (student.average !== undefined) {
        // Notion percentage format expects decimal between 0 and 1 (e.g. 0.92 for 92%)
        const avgNum = parseFloat(student.average);
        properties["Average"] = { "number": avgNum > 1 ? avgNum / 100 : avgNum };
    }
    if (student.province) {
        properties["Province"] = { "select": { "name": student.province } };
    }
    if (student.isPro !== undefined) {
        properties["Tier"] = { "select": { "name": student.isPro ? "⭐ Smart Match Pro" : "Free Plan" } };
    }
    if (student.role) {
        properties["Role"] = { "select": { "name": student.role.charAt(0).toUpperCase() + student.role.slice(1) } };
    }
    if (student.status) {
        properties["Status"] = { "select": { "name": student.status } };
    }
    if (student.targetPrograms) {
        const progStr = typeof student.targetPrograms === 'string' 
            ? student.targetPrograms 
            : student.targetPrograms.map(p => `${p.name || p.program} (${p.university})`).join(', ');
        properties["Target Programs"] = {
            "rich_text": [{ "text": { "content": progStr } }]
        };
    }

    return notionRequest('/pages', 'POST', {
        parent: { database_id: dbId },
        properties: properties
    });
}

// Sync all student records from Supabase CANEDU to Notion
export async function syncFromSupabase(dbId = NOTION_DATABASE_ID) {
    let supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wlnhygrpipvebyaxmvyp.supabase.co';
    let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
        try {
            const envPath = path.resolve(process.cwd(), '.env');
            if (fs.existsSync(envPath)) {
                const lines = fs.readFileSync(envPath, 'utf8').split('\n');
                for (const line of lines) {
                    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
                        supabaseKey = line.split('=')[1].trim();
                        break;
                    }
                }
            }
        } catch (e) {}
    }

    if (!supabaseKey) {
        console.warn('VITE_SUPABASE_ANON_KEY not found.');
        return;
    }

    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*,student_records(*)`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const profiles = await res.json();
        if (Array.isArray(profiles) && profiles.length > 0) {
            console.log(`Syncing ${profiles.length} profile(s) from Supabase to Notion...`);
            for (const p of profiles) {
                const rec = Array.isArray(p.student_records) ? (p.student_records[0] || {}) : (p.student_records || {});
                const courses = rec.courses || [];
                const avg = rec.calculated_average || (courses.length > 0 ? (courses.reduce((a,c) => a + (parseFloat(c.grade)||0), 0) / courses.length) : null);
                await pushStudentToNotion({
                    name: p.full_name || p.email.split('@')[0],
                    email: p.email,
                    province: rec.province || 'ON',
                    average: avg,
                    isPro: p.is_pro,
                    role: p.role || 'student',
                    status: p.is_pro ? 'Accepted' : 'In Progress',
                    targetPrograms: rec.saved_programs
                }, dbId);
            }
            console.log('✓ Successfully synced all profiles to Notion.');
        } else {
            console.log('No new user profiles in Supabase CANEDU yet to sync.');
        }
    } catch (err) {
        console.error('Error syncing Supabase to Notion:', err.message);
    }
}

// CLI Execution check
if (process.argv[1]?.endsWith('notionSync.js')) {
    (async () => {
        console.log(`🔌 Connecting to Notion Database [${NOTION_DATABASE_ID}]...`);
        try {
            const db = await getDatabase();
            const title = db.title?.map(t => t.plain_text).join('') || 'Database';
            console.log(`✓ Connected to "${title}"`);
            console.log(`  Columns configured: ${Object.keys(db.properties).join(', ')}`);

            const records = await queryDatabaseRecords();
            console.log(`\n📋 Current Records in Notion (${records.results.length} total):`);
            records.results.forEach((page, i) => {
                const name = page.properties.Name?.title?.[0]?.plain_text || 'Unnamed';
                const email = page.properties.Email?.email || 'No email';
                const tier = page.properties.Tier?.select?.name || 'Free';
                console.log(`  [${i + 1}] ${name} | ${email} | ${tier}`);
            });
        } catch (e) {
            console.error('Error connecting to Notion database:', e.message);
        }
    })();
}
