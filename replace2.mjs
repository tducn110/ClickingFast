import fs from "fs";

const file = "src/app/components/screens/GameplayScreen.tsx";
let content = fs.readFileSync(file, "utf8");

content = content.split('\n').map(line => {
  if (line.includes('className="')) {
    return line.replace(/className="([^"]+)"/g, (match, classes) => {
      const newClasses = classes.split(/\s+/).filter(cls => {
        return !cls.startsWith("sm:") && !cls.startsWith("md:") && !cls.startsWith("lg:") && !cls.startsWith("xl:");
      }).map(cls => {
        const pxRegex = /^(w|h|text|rounded|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|inset|top|bottom|left|right|min-h|min-w|border|translate-y|translate-x|gap)-\[([0-9.]+)px\]$/;
        return cls.replace(pxRegex, (m, p1, p2) => {
          if (parseInt(p2) > 300) return m; 
          return `${p1}-[calc(${p2}*var(--su))]`;
        });
      }).join(" ");
      return `className="${newClasses}"`;
    });
  }
  return line;
}).join('\n');

// Also handle template literals with clsx or classNames like className={`...`}
// Wait, I will just use a global regex for any word that ends in px].
// Let's do a second pass for anything inside backticks `...`
content = content.replace(/`([^`]+)`/g, (match, classes) => {
    if (!classes.includes('px]')) return match;
    const newClasses = classes.split(/\s+/).filter(cls => {
        if (cls.includes('${')) return true; // keep expressions
        return !cls.startsWith("sm:") && !cls.startsWith("md:") && !cls.startsWith("lg:") && !cls.startsWith("xl:");
    }).map(cls => {
        const pxRegex = /^(w|h|text|rounded|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|inset|top|bottom|left|right|min-h|min-w|border|translate-y|translate-x|gap)-\[([0-9.]+)px\]$/;
        return cls.replace(pxRegex, (m, p1, p2) => {
            if (parseInt(p2) > 300) return m; 
            return `${p1}-[calc(${p2}*var(--su))]`;
        });
    }).join(" ");
    return `\`${newClasses}\``;
});

fs.writeFileSync(file, content);
console.log("Done");
