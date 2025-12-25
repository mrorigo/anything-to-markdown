const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
const out = `// This file is auto-generated during build
export const VERSION = ${JSON.stringify(pkg.version)};
`;
fs.writeFileSync(path.resolve(__dirname, '..', 'src', 'version.ts'), out);
console.log('Generated src/version.ts with version', pkg.version);
