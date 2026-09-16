import fs from "fs";

const file = "src/app/components/screens/GameplayScreen.tsx";
let content = fs.readFileSync(file, "utf8");

// Remove layoutMode state
content = content.replace(/const \[layoutMode, setLayoutMode\] = useState<"regular" \| "compact-landscape">.*\n/, "");

// Remove logic
content = content.replace(/const nextLayoutMode =\s*rendererWidth >= 620 && rendererHeight <= 500 \? "compact-landscape" : "regular";\s*setLayoutMode\(\(current\) => \(current === nextLayoutMode \? current : nextLayoutMode\)\);/g, "");

// Remove data-layout={layoutMode}
content = content.replace(/data-layout=\{layoutMode\}/g, "");

fs.writeFileSync(file, content);
console.log("Done");
