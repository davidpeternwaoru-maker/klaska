// Logical database backup via pg_dump. Uses DIRECT_URL (unpooled) from .env and
// writes a timestamped custom-format dump to ./backups. Requires the Postgres
// client tools (pg_dump) on PATH. See docs/BACKUP.md for restore instructions.
//
//   node scripts/backup.mjs
import fs from "node:fs";
import { execFile } from "node:child_process";

const env = fs.readFileSync(".env", "utf8");
const url = (env.match(/DIRECT_URL="([^"]+)"/) || env.match(/DATABASE_URL="([^"]+)"/) || [])[1];
if (!url) {
  console.error("No DIRECT_URL/DATABASE_URL found in .env");
  process.exit(1);
}

fs.mkdirSync("backups", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = `backups/klaska-${stamp}.dump`;

// -Fc = custom format (compressed, restorable with pg_restore), --no-owner so it
// restores cleanly into a different role/host.
execFile("pg_dump", ["-Fc", "--no-owner", "--no-privileges", "-f", out, url], (err, _stdout, stderr) => {
  if (err) {
    if (err.code === "ENOENT") {
      console.error("pg_dump not found. Install the PostgreSQL client tools and retry.");
    } else {
      console.error("Backup failed:\n" + stderr);
    }
    process.exit(1);
  }
  const size = (fs.statSync(out).size / 1024 / 1024).toFixed(2);
  console.log(`✔ Backup written: ${out} (${size} MB)`);
  console.log("  Upload this to encrypted object storage. Restore steps: docs/BACKUP.md");
});
