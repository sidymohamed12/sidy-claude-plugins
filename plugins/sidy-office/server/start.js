"use strict";

/**
 * Démarre le serveur du bureau en arrière-plan s'il ne tourne pas déjà.
 * Appelé par le hook SessionStart ; `--open` ouvre aussi le navigateur.
 *
 * Après une mise à jour du plugin, l'ancien serveur tourne encore (il est détaché de Claude Code)
 * et continuerait de servir l'ancienne version : on le remplace quand sa version diffère.
 */

const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { version: VERSION } = require("../.claude-plugin/plugin.json");

const PORT = Number(process.env.SIDY_OFFICE_PORT) || 4848;
const URL_BUREAU = `http://localhost:${PORT}`;
const WAIT_FREE_MS = 3000;

/** Réponse de /health du serveur en place, ou null s'il n'y en a pas. */
function getHealth() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port: PORT, path: "/health", timeout: 800 },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(text));
          } catch {
            resolve({});
          }
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Que faire du serveur déjà en place ?
 * - "keep" : même version (ou ce n'est pas notre serveur) ;
 * - "replace" : notre serveur, d'une autre version, que l'on sait arrêter (il donne son pid) ;
 * - "stale" : un ancien serveur qui ne donne pas son pid : on ne peut pas l'arrêter nous-mêmes.
 */
function decide(health, version, ownPid = process.pid) {
  if (!health) {
    return "none";
  }
  if (health.app !== "sidy-office" || health.version === version) {
    return "keep";
  }
  if (Number.isInteger(health.pid) && health.pid > 1 && health.pid !== ownPid) {
    return "replace";
  }
  return "stale";
}

function openBrowser() {
  const commands = { darwin: "open", win32: "explorer" };
  const command = commands[process.platform] || "xdg-open";
  spawn(command, [URL_BUREAU], { detached: true, stdio: "ignore" }).unref();
}

async function waitUntilFree() {
  const deadline = Date.now() + WAIT_FREE_MS;
  while (Date.now() < deadline) {
    if (!(await getHealth())) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

function launchServer() {
  const child = spawn(process.execPath, [path.join(__dirname, "server.js")], {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
}

async function main() {
  const health = await getHealth();
  const action = decide(health, VERSION);
  if (action === "none") {
    launchServer();
  } else if (action === "replace") {
    try {
      process.kill(health.pid);
    } catch {
      // déjà arrêté, ou pas à nous : on vérifie ci-dessous
    }
    if (await waitUntilFree()) {
      launchServer();
    }
  } else if (action === "stale") {
    console.log(
      `Un ancien serveur du bureau tourne sur le port ${PORT} (version avant ${VERSION}). ` +
        "Arrête-le, puis relance Claude Code : voir le README, « Après une mise à jour ».",
    );
  }
  if (process.argv.includes("--open")) {
    openBrowser();
  }
  console.log(`Bureau des agents : ${URL_BUREAU}`);
}

module.exports = { decide };

if (require.main === module) {
  main();
}
