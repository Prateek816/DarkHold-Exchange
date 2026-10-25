const fs = require('fs');
let code = fs.readFileSync('app/portfolio/page.tsx', 'utf8');

if (!code.includes('aria-label="Copy Transaction Hash"')) {
  code = code.replace(
    'onClick={() => copyToClipboard(selectedReceipt.tx_hash)}',
    'onClick={() => copyToClipboard(selectedReceipt.tx_hash)}\r\n                          aria-label="Copy Transaction Hash"'
  );
  fs.writeFileSync('app/portfolio/page.tsx', code, 'utf8');
  console.log('Added aria-label to copy button in app/portfolio/page.tsx');
}
