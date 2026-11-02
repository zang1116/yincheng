import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "public");

rmSync(output, { recursive: true, force: true });
mkdirSync(join(output, "assets", "shots"), { recursive: true });
mkdirSync(join(output, "download"), { recursive: true });

for (const file of ["index.html", "features.html", "screens.html", "guide.html", "styles.css", "main.js", "404.html", "404.css", "robots.txt", "sitemap.xml", "_headers", "_redirects"]) {
  cpSync(join(root, file), join(output, file));
}

cpSync(join(root, "assets", "icon.png"), join(output, "assets", "icon.png"));
cpSync(join(root, "assets", "shots"), join(output, "assets", "shots"), { recursive: true });
cpSync(join(root, "download", "readme.txt"), join(output, "download", "readme.txt"));
cpSync(join(root, "download", "yincheng-2.3.5.apk"), join(output, "download", "yincheng-2.3.5.apk"));

console.log("Official site built to public/");
