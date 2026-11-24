"use strict";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createOfficeServer } = require("../server/server");

let office;
let base;

before(async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "sidy-office-srv-"));
  fs.mkdirSync(path.join(home, ".claude", "agents"), { recursive: true });
  fs.writeFileSync(
    path.join(home, ".claude", "agents", "qa.md"),
    "---\nname: qa\ndescription: Teste.\n---\n",
  );
  office = createOfficeServer({ homeDir: home });
  await new Promise((resolve) => office.server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${office.server.address().port}`;
});

after(() => {
  office.server.closeAllConnections();
  office.server.close();
});

function post(path, body) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("health répond", async () => {
  const res = await fetch(`${base}/health`);
  const body = await res.json();
  assert.equal(body.app, "sidy-office");
  assert.equal(body.ok, true);
  assert.equal(body.pid, process.pid);
  assert.match(body.version, /^\d+\.\d+\.\d+$/);
});

test("un événement de hook met à jour l'état", async () => {
  const res = await post("/event", {
    hook_event_name: "UserPromptSubmit",
    session_id: "x",
    cwd: "/p/demo",
  });
  assert.equal(res.status, 200);
  const state = await (await fetch(`${base}/state`)).json();
  assert.equal(state.agents[0].status, "thinking");
});

test("l'état contient l'équipe détectée", async () => {
  const state = await (await fetch(`${base}/state`)).json();
  assert.deepEqual(
    state.team.members.map((m) => m.type),
    ["qa"],
  );
  assert.deepEqual(state.configErrors, []);
});

test("JSON invalide refusé", async () => {
  const res = await post("/event", "{pas du json");
  assert.equal(res.status, 400);
});

test("sert la page du bureau", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
});

test("refuse de sortir du dossier public", async () => {
  const res = await fetch(`${base}/..%2fserver%2fstate.js`);
  assert.ok([403, 404].includes(res.status));
});

test("le flux SSE envoie un instantané immédiatement", async () => {
  const controller = new AbortController();
  const res = await fetch(`${base}/stream`, { signal: controller.signal });
  const reader = res.body.getReader();
  const { value } = await reader.read();
  controller.abort();
  assert.match(new TextDecoder().decode(value), /^data: \{"version"/);
});
