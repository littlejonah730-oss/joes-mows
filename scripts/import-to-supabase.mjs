// One-time importer: loads the Base44 LawnFlow data export
// (lawnflow-data-export/*.json) into the matching Supabase tables created by
// supabase/migrations/0001_init.sql.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   npm run import-data
//
// The service role key is required (not the anon key) because it bypasses
// RLS for this one-time bulk load. Never commit it or expose it to the
// frontend — it's only read from the environment here.

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../lawnflow-data-export');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function loadJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

// Base44 exports leave FK-ish string fields as "" when unset; Postgres FK
// columns need null instead, or the insert fails with a foreign-key violation.
function nullifyEmpty(row, fields) {
  const copy = { ...row };
  for (const f of fields) {
    if (copy[f] === '') copy[f] = null;
  }
  return copy;
}

async function importTable(tableName, rows, { fkFields = [] } = {}) {
  if (!rows || rows.length === 0) {
    console.log(`  ${tableName}: nothing to import`);
    return;
  }
  const cleaned = rows.map((r) => nullifyEmpty(r, fkFields));
  const batchSize = 500;
  for (let i = 0; i < cleaned.length; i += batchSize) {
    const batch = cleaned.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  ${tableName}: FAILED on batch starting at ${i}`);
      throw error;
    }
  }
  console.log(`  ${tableName}: imported ${cleaned.length} rows`);
}

async function main() {
  console.log(`Importing LawnFlow data from ${DATA_DIR}\n`);

  // Order matters: parents before children, so foreign keys resolve.
  await importTable('business_settings', loadJson('BusinessSettings.json'));
  await importTable('customers', loadJson('Customer.json'));
  await importTable('employees', loadJson('Employee.json'), { fkFields: ['user_id'] });
  await importTable('equipment', loadJson('Equipment.json'), { fkFields: ['assigned_job_id'] });
  await importTable('jobs', loadJson('Job.json'), {
    fkFields: ['customer_id', 'claimed_by_employee_id', 'exclusive_to_employee_id'],
  });
  await importTable('invoices', loadJson('Invoice.json'), { fkFields: ['job_id', 'customer_id'] });
  await importTable('expenses', loadJson('Expense.json'));
  await importTable('mileage', loadJson('Mileage.json'));
  await importTable('notes', loadJson('Note.json'));
  await importTable('rewards', loadJson('Reward.json'));

  const misc = loadJson('Misc.json') || {};
  await importTable('messages', misc.Message, { fkFields: ['employee_id'] });
  await importTable('chat_messages', misc.ChatMessage);
  await importTable('equipment_usage', misc.EquipmentUsage, { fkFields: ['equipment_id', 'job_id'] });
  await importTable('yard_photos', misc.YardPhoto, { fkFields: ['customer_id'] });

  console.log('\nDone. Note: Base44 "User" accounts (User.json) were NOT imported —');
  console.log('Supabase auth accounts must be created by each person signing up.');
  console.log('The first person to sign up becomes admin automatically (see the');
  console.log('handle_new_user() trigger in supabase/migrations/0001_init.sql).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
