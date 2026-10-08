const fs = require('fs');
let c = fs.readFileSync('vite.config.js', 'utf8');
c = c.replace(/\\s*}\\n\\s*}\\n\\s*}\\)\\n\\s*\\],\\n\\s*build:/, '\\n      }\\n    })\\n  ],\\n  build:');
fs.writeFileSync('vite.config.js', c);
