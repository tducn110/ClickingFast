const fs = require('fs');
const js = fs.readFileSync('public/wink-bridge.js', 'utf8');
global.window = { fetch: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
eval(js);
console.log(Object.keys(global.window.WinkBridge));
