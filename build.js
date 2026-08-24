// build.js - siapkan folder dist untuk Vercel + inject token Apps Script
// Jalankan: node build.js
// Butuh: APPS_TOKEN di Vercel > Settings > Environment Variables

const fs   = require("fs");
const path = require("path");

const token = process.env.APPS_TOKEN || "";
const root  = __dirname;
const dist  = path.join(root, "dist");

// Yang TIDAK ikut disalin ke dist:
// - artefak build/config : dist, node_modules, build.js, vercel.json
// - metadata repo        : .git (~19 MB, bikin deploy membengkak), .github, .vercel
// - kode sisi server     : code.gs, rekap.gs (jangan diekspos ke publik)
// - file kerja           : note.txt, screenshot
const SKIP_EXACT = new Set([
  "dist", "node_modules", "build.js", "vercel.json",
  ".git", ".github", ".vercel", ".gitignore", ".vscode", ".DS_Store",
  "note.txt"
]);

function shouldSkip(name) {
  if (SKIP_EXACT.has(name)) return true;
  if (name.endsWith(".gs")) return true;
  if (/^Screenshot .*\.(png|jpe?g)$/i.test(name)) return true;
  return false;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (shouldSkip(entry.name)) continue;
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

// Mulai dari dist bersih supaya sisa build sebelumnya tidak ikut ter-deploy
fs.rmSync(dist, { recursive: true, force: true });
copyDir(root, dist);

// Inject token sebagai variabel global di baris pertama scriptorder.js.
// order.html membacanya lewat `typeof TOKEN` dan scriptorder.js dimuat lebih dulu,
// jadi tidak perlu injeksi terpisah ke HTML.
// JSON.stringify dipakai supaya token dengan tanda kutip tidak merusak file JS.
const jsPath = path.join(dist, "js", "scriptorder.js");
const js     = fs.readFileSync(jsPath, "utf8");
fs.writeFileSync(jsPath, `var __APPS_TOKEN__ = ${JSON.stringify(token)};\n` + js);

if (!token) {
  console.warn("");
  console.warn("!!  APPS_TOKEN KOSONG.");
  console.warn("!!  Apps Script akan menolak semua request dengan status \"error\": Unauthorized,");
  console.warn("!!  sehingga halaman order tidak bisa mengecek stok.");
  console.warn("!!  Set APPS_TOKEN di Vercel > Settings > Environment Variables, lalu redeploy.");
  console.warn("");
}

console.log("Build selesai. Token:", token ? "OK (terisi)" : "KOSONG - lihat peringatan di atas");
