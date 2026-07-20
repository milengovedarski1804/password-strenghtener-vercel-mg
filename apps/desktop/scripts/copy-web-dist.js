// Копира build-натата apps/web/dist в apps/desktop/web-dist, за да може
// electron-builder да я пакетира (не може директно да включи файлове извън
// apps/desktop без extraResources конфигурация с абсолютен път).
import { cpSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, "..", "..", "web", "dist");
const dest = path.join(__dirname, "..", "web-dist");

if (!existsSync(src)) {
  console.error(`Липсва ${src} — първо пусни "npm run build:web".`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Копирано: ${src} -> ${dest}`);
