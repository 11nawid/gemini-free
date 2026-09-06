const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', '.next'),
  path.join(__dirname, '..', 'node_modules', '.cache'),
];

for (const dir of targets) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`[clean-build] Removed ${path.relative(process.cwd(), dir) || dir}`);
  } catch (err) {
    console.log(`[clean-build] Warn: could not remove ${dir}:`, err.message);
  }
}