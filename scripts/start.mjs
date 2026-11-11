import { spawn } from "node:child_process";
const env = { ...process.env, NODE_ENV: "production" };
const children = [
  spawn("npm", ["run", "start:api"], { stdio: "inherit", env }),
  spawn("npm", ["run", "start:web"], { stdio: "inherit", env }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) child.on("exit", (code) => stop(code ?? 1));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
