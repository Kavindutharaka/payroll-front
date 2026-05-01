const axios = require('axios');
const fs    = require('fs');
const path  = require('path');

const API_URL = 'https://mas.phvtech.com/api/Master/sp';
const sqlFile = path.join(__dirname, 'db_setup.sql');

const sql = fs.readFileSync(sqlFile, 'utf8');

// Split on GO batch separator lines, trim, filter blanks/comment-only
const batches = sql
  .split(/^\s*GO\s*$/m)
  .map((s) => s.trim())
  .filter((s) => {
    const stripped = s.replace(/--[^\n]*/g, '').trim();
    return stripped.length > 0;
  });

async function run() {
  console.log(`Running ${batches.length} SQL batches against ${API_URL}\n`);
  let ok = 0, fail = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const preview = batch.replace(/\s+/g, ' ').substring(0, 80);
    process.stdout.write(`[${i + 1}/${batches.length}] ${preview}… `);

    try {
      const { data } = await axios.post(API_URL, { SysID: batch });
      console.log('✓', JSON.stringify(data).substring(0, 80));
      ok++;
    } catch (err) {
      const msg = err.response?.data ?? err.message;
      console.error('✗', JSON.stringify(msg).substring(0, 120));
      fail++;
    }
  }

  console.log(`\nDone — ${ok} succeeded, ${fail} failed.`);
}

run();
