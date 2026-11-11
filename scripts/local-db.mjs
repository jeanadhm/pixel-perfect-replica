import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
const root = process.cwd(),
  data = path.join(root, ".data/postgres"),
  socket = path.join(root, ".data/socket");
const bin = (name) => (fs.existsSync(`/opt/local/bin/${name}`) ? `/opt/local/bin/${name}` : name);
const run = (name, args, options = {}) => {
  const result = spawnSync(bin(name), args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status) throw new Error(`${name}: sortie ${result.status}`);
};
fs.mkdirSync(socket, { recursive: true, mode: 0o700 });
if (!fs.existsSync(path.join(data, "PG_VERSION")))
  run("initdb", [
    "-D",
    data,
    "--auth-local=trust",
    "--auth-host=scram-sha-256",
    "--no-locale",
    "--encoding=UTF8",
  ]);
if (spawnSync(bin("pg_ctl"), ["-D", data, "status"], { stdio: "ignore" }).status !== 0)
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    path.join(root, ".data/postgres.log"),
    "-o",
    `-p 55439 -k ${socket} -c listen_addresses=''`,
    "start",
  ]);
const exists = spawnSync(
  bin("psql"),
  [
    "-h",
    socket,
    "-p",
    "55439",
    "-d",
    "postgres",
    "-tAc",
    "SELECT 1 FROM pg_database WHERE datname='ambs_hub'",
  ],
  { encoding: "utf8" },
);
if (exists.status) throw new Error("PostgreSQL inaccessible");
if (exists.stdout.trim() !== "1") run("createdb", ["-h", socket, "-p", "55439", "ambs_hub"]);
if (!fs.existsSync(".env"))
  fs.writeFileSync(
    ".env",
    `DATABASE_URL=postgresql://${encodeURIComponent(os.userInfo().username)}@localhost/ambs_hub?host=${encodeURIComponent(socket)}&port=55439\nAPP_ORIGIN=http://localhost:3000\nAPI_PORT=4000\nTOKEN_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}\n`,
    { mode: 0o600 },
  );
console.log(
  "Base locale AMBS prête sur le socket privé du projet. Aucun autre PostgreSQL modifié.",
);
