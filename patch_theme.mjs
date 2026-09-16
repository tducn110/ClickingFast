import fs from "fs";

const file = "src/styles/theme.css";
let content = fs.readFileSync(file, "utf8");

// 1. Add --su to .gameplayRoot
content = content.replace(
  /\.gameplayRoot \{/,
  `.gameplayRoot {\n  --su: calc(min(100vw, 100svh) / 390);\n`
);

// 2. Remove .gameplayRoot[data-layout="compact-landscape"] rules
content = content.replace(/\.gameplayRoot\[data-layout="compact-landscape"\].*?\{[\s\S]*?\}/g, "");

fs.writeFileSync(file, content);
console.log("Done");
