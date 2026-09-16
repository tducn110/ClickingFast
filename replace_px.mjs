import fs from "fs";

const file = "src/app/components/screens/GameplayScreen.tsx";
let content = fs.readFileSync(file, "utf8");

const regex = /\b(w|h|text|rounded|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|inset|top|bottom|left|right|min-h|min-w|border|translate-y|translate-x)-\[([0-9.]+)px\]/g;
content = content.replace(regex, (match, p1, p2) => {
  // If it's max-w or min-w large layout boundaries, keep it.
  if (parseInt(p2) > 300) return match; 
  return `${p1}-[calc(${p2}*var(--su))]`;
});

fs.writeFileSync(file, content);
console.log("Done replacing px in GameplayScreen.tsx");
