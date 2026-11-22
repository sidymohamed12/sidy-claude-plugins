"use strict";

/**
 * Démarre le serveur du bureau en arrière-plan s'il ne tourne pas déjà.
 * Appelé par le hook SessionStart ; `--open` ouvre aussi le navigateur.
 */

const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const PORT = Number(process.env.SIDY_OFFICE_PORT) || 4848;
const URL_BUREAU = `http://localhost:${PORT}`;

function isRunning() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port: PORT, path: "/health", timeout: 800 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser() {
  const commands = { darwin: "open", win32: "explorer" };
  const command = commands[process.platform] || "xdg-open";
  spawn(command, [URL_BUREAU], { detached: true, stdio: "ignore" }).unref();
}

async function main() {
  if (!(await isRunning())) {
    const child = spawn(process.execPath, [path.join(__dirname, "server.js")], {
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.unref();
  }
  if (process.argv.includes("--open")) {
    openBrowser();
  }
  console.log(`Bureau des agents : ${URL_BUREAU}`);
}

main();
