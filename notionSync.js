/**
 * Pathway Canada: Notion Database Sync Integration
 * Syncs student admissions data and roster from Supabase CANEDU to Notion.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// Read NOTION_API_KEY from environment or local .env file
let NOTION_TOKEN = process.env.NOTION_API_KEY;
if (!NOTION_TOKEN) {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split('\n');
            for (const line of lines) {
                if (line.startsWith('NOTION_API_KEY=')) {
                    NOTION_TOKEN = line.split('=')[1].trim();
                    break;
                }
            }
        }
    } catch (e) {
        // Ignore read errors
    }
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

// Find all databases shared with the integration
export async function getConnectedDatabases() {
    try {
        const search = await notionRequest('/search', 'POST', {
            filter: { property: 'object', value: 'database' }
        });
        return search.results.map(db => ({
            id: db.id,
            title: db.title?.map(t => t.plain_text).join('') || 'Untitled Database',
            url: db.url,
            properties: Object.keys(db.properties)
        }));
    } catch (err) {
        console.error('Error fetching databases:', err.message);
        return [];
    }
}

// Sync a single student record to a target Notion database
export async function pushStudentToNotion(databaseId, student) {
    const properties = {
        "Name": {
            "title": [{ "text": { "content": student.name || "Student" } }]
        }
    };

    if (student.email) {
        properties["Email"] = { "email": student.email };
    }
    if (student.average !== undefined) {
        properties["Average"] = { "number": parseFloat(student.average) || 0 };
    }
    if (student.province) {
        properties["Province"] = { "select": { "name": student.province } };
    }
    if (student.isPro !== undefined) {
        properties["Tier"] = { "select": { "name": student.isPro ? "Smart Match Pro" : "Free Plan" } };
    }

    return notionRequest('/pages', 'POST', {
        parent: { database_id: databaseId },
        properties: properties
    });
}

// Check databases when executed
console.log('🔍 Checking connected Notion databases with provided integration token...');
const dbs = await getConnectedDatabases();
if (dbs.length === 0) {
    console.log('\n⚠️ No custom databases are shared with this integration yet.');
    console.log('To connect your Notion database:');
    console.log('1. Open your target Database page in Notion.');
    console.log('2. Click the "..." menu in the top right corner.');
    console.log('3. Click "Connect to" (or "Add connections") and select your integration.');
} else {
    console.log(`\n✓ Found ${dbs.length} accessible database(s):`);
    dbs.forEach((db, i) => {
        console.log(`  [${i + 1}] "${db.title}" (ID: ${db.id})`);
        console.log(`      URL: ${db.url}`);
        console.log(`      Properties: ${db.properties.join(', ')}`);
    });
}
