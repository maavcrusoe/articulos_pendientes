#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function pad(n) { return String(n).padStart(2, '0'); }
function formatLocalDatetime(date) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--category' || a === '-c') { opts.category = args[++i]; }
  else if (a === '--text' || a === '-t') { opts.text = args[++i]; }
  else if (a === '--help' || a === '-h') { opts.help = true; }
}

if (opts.help || !opts.category || !opts.text) {
  console.log('Usage: node scripts/add-changelog-entry.js --category <Added|Changed|Fixed> --text "Description"');
  process.exit(opts.help ? 0 : 1);
}

const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
let content = '';
try { content = fs.readFileSync(changelogPath, 'utf8'); }
catch (err) { console.error('ERROR: Cannot read CHANGELOG.md:', err.message); process.exit(2); }

const lines = content.split(/\r?\n/);
let unreleasedIndex = lines.findIndex(l => l.trim().startsWith('## [Unreleased]'));
if (unreleasedIndex === -1) {
  // insert Unreleased section after header
  const headerIndex = lines.findIndex(l => l.trim().startsWith('# Changelog'));
  const insertAt = headerIndex >= 0 ? headerIndex + 1 : 0;
  const block = ['','## [Unreleased]','',`### ${opts.category}`,''];
  lines.splice(insertAt + 1, 0, ...block);
  unreleasedIndex = lines.findIndex(l => l.trim().startsWith('## [Unreleased]'));
}

// find category header under Unreleased
let catIndex = -1;
for (let i = unreleasedIndex + 1; i < lines.length; i++) {
  const l = lines[i];
  if (l.trim().startsWith('## ')) break; // end of unreleased
  if (l.trim().startsWith(`### ${opts.category}`)) { catIndex = i; break; }
}

if (catIndex === -1) {
  // insert category header right after Unreleased
  let insertAt = unreleasedIndex + 1;
  // skip possible blank line
  if (lines[insertAt] && lines[insertAt].trim() === '') insertAt++;
  const hdr = [`### ${opts.category}`, ''];
  lines.splice(insertAt, 0, ...hdr);
  catIndex = insertAt;
}

// find where to append (before next header or end)
let insertPoint = catIndex + 1;
while (insertPoint < lines.length && !lines[insertPoint].trim().startsWith('### ') && !lines[insertPoint].trim().startsWith('## ')) {
  insertPoint++;
}

const timestamp = formatLocalDatetime(new Date());
const entry = `- ${timestamp} - ${opts.text}`;
lines.splice(insertPoint, 0, entry);

try {
  fs.writeFileSync(changelogPath, lines.join('\n'), 'utf8');
  console.log('Added changelog entry under', opts.category);
} catch (err) {
  console.error('ERROR: Cannot write CHANGELOG.md:', err.message);
  process.exit(3);
}
