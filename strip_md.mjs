import fs from "fs";

const file = "src/app/components/screens/GameplayScreen.tsx";
let content = fs.readFileSync(file, "utf8");

// Remove sm: and md: classes
// specifically: sm:h-..., sm:w-..., sm:text-..., md:h-..., md:w-..., md:text-..., md:min-h-..., md:rounded-..., md:gap-..., md:grid-cols-..., md:px-...
const regex = /\b(sm|md):([a-z0-9-\[\]\(\).*]+)\b/g;

content = content.replace(regex, "");

// Clean up double spaces
content = content.replace(/  +/g, " ");

fs.writeFileSync(file, content);
console.log("Done removing sm: and md: in GameplayScreen.tsx");
