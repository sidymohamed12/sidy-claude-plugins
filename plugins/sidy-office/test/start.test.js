"use strict";

const { test, describe, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { spawnSync, spawn } = require("node:child_process");
const { decide } = require("../server/start");

const OURS = { app: "sidy-office", ok: true, version: "1.2.0", pid: 4242 };

describe("decide", () => {
  test("rien ne tourne : on démarre", () => {
    assert.equal(decide(null, "1.2.0"), "none");
  });

  test("même version : on ne touche à rien", () => {
    assert.equal(decide(OURS, "1.2.0"), "keep");
  });

  test("autre version avec un pid : on remplace", () => {
    assert.equal(decide({ ...OURS, version: "1.1.0" }, "1.2.0"), "replace");
  });

  test("ancien serveur sans version ni pid : on ne peut pas l'arrêter", () => {
    assert.equal(decide({ app: "sidy-office", ok: true }, "1.2.0"), "stale");
  });

  test("quelque chose d'autre sur le port : on n'y touche pas", () => {
    assert.equal(decide({ app: "autre", pid: 4242, version: "9" }, "1.2.0"), "keep");
    assert.equal(decide({}, "1.2.0"), "keep");
  });

  test("jamais de kill sur soi-même, sur le pid 1 ou sur un pid invalide", () => {
    assert.equal(decide({ ...OURS, version: "1.1.0", pid: 77 }, "1.2.0", 77), "stale");
    assert.equal(decide({ ...OURS, version: "1.1.0", pid: 1 }, "1.2.0"), "stale");
    assert.equal(decide({ ...OURS, version: "1.1.0", pid: "12; rm -rf /" }, "1.2.0"), "stale");
    assert.equal(decide({ ...OURS, version: "1.1.0", pid: -5 }, "1.2.0"), "stale");
  });
});

// De bout en bout : un faux « ancien » serveur est remplacé par le vrai.
describe("remplacement d'un ancien serveur", () => {
  const PORT = 48000 + Math.floor(Math.random() * 1000);
  const START = path.join(__dirname, "..", "server", "start.js");
  let old;

  after(async () => {
    old?.kill();
    // arrête le serveur lancé par start.js
    const res = await fetch(`http://127.0.0.1:${PORT}/health`).catch(() => null);
    if (res) {
      const { pid } = await res.json();
      try {
        process.kill(pid);
      } catch {
        /* déjà arrêté */
      }
    }
  });

  test("le serveur d'une autre version est arrêté puis remplacé", async () => {
    // processus enfant qui se fait passer pour un serveur de la version 0.0.1
    old = spawn(
      process.execPath,
      [
        "-e",
        `require("node:http").createServer((q,r)=>{r.setHeader("content-type","application/json");r.end(JSON.stringify({app:"sidy-office",ok:true,version:"0.0.1",pid:process.pid}))}).listen(${PORT},"127.0.0.1")`,
      ],
      { stdio: "ignore" },
    );
    await new Promise((resolve) => setTimeout(resolve, 600));
    const before = await (await fetch(`http://127.0.0.1:${PORT}/health`)).json();
    assert.equal(before.version, "0.0.1");

    const run = spawnSync(process.execPath, [START], {
      env: { ...process.env, SIDY_OFFICE_PORT: String(PORT) },
      encoding: "utf8",
      timeout: 15000,
    });
    assert.equal(run.status, 0, run.stderr);

    let health = null;
    for (let i = 0; i < 30 && !(health && health.pid !== old.pid); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      health = await fetch(`http://127.0.0.1:${PORT}/health`)
        .then((r) => r.json())
        .catch(() => null);
    }
    assert.ok(health, "un serveur répond");
    assert.notEqual(health.version, "0.0.1");
    assert.notEqual(health.pid, old.pid);
    assert.equal(old.killed || old.exitCode !== null || old.signalCode !== null, true);
  });
});
