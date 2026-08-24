const fs = require('fs');
const js = fs.readFileSync('public/wink-bridge.js', 'utf8');
global.window = {};
eval(js);
console.log(Object.keys(global.window.WinkBridge));
