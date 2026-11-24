"use strict";

/**
 * Serveur local du bureau : reçoit les hooks de Claude Code (POST /event)
 * et diffuse l'état aux navigateurs ouverts (GET /stream, Server-Sent Events).
 * Aucune dépendance : uniquement les modules Node intégrés.
 */

const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createState, applyEvent, sweep, snapshot } = require("./state");
const { runDemo } = require("./demo");
const { resolveTeam } = require("./team");
const { version: VERSION } = require("../.claude-plugin/plugin.json");

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4848;
const MAX_BODY_BYTES = 1024 * 1024;
const BROADCAST_DELAY_MS = 80;
const SWEEP_INTERVAL_MS = 30 * 1000;
const TEAM_REFRESH_MS = 60 * 1000;
const TEAM_DEBOUNCE_MS = 300;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const CONTENT_TYPE = "Content-Type";
const JSON_TYPE = "application/json; charset=utf-8";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function createOfficeServer({
  homeDir = os.homedir(),
  globalConfigFile = process.env.SIDY_OFFICE_CONFIG,
} = {}) {
  const state = createState();
  const clients = new Set();
  const cwds = new Set();
  let broadcastTimer = null;
  let teamTimer = null;
  let team = null;
  let configErrors = [];
  let teamJson = "";

  function fullSnapshot() {
    return { ...snapshot(state), team, configErrors };
  }

  /** Relit les agents installés et les configs ; retourne true si l'équipe a changé. */
  function refreshTeam() {
    const resolved = resolveTeam({
      homeDir,
      cwds: [...cwds],
      globalConfigFile,
    });
    const json = JSON.stringify(resolved);
    if (json === teamJson) {
      return false;
    }
    teamJson = json;
    team = resolved.team;
    configErrors = resolved.errors;
    return true;
  }

  function scheduleTeamRefresh() {
    clearTimeout(teamTimer);
    teamTimer = setTimeout(() => {
      if (refreshTeam()) {
        broadcast();
      }
    }, TEAM_DEBOUNCE_MS);
  }

  refreshTeam();

  function broadcast() {
    if (broadcastTimer) {
      return;
    }
    broadcastTimer = setTimeout(() => {
      broadcastTimer = null;
      const data = `data: ${JSON.stringify(fullSnapshot())}\n\n`;
      for (const res of clients) {
        res.write(data);
      }
    }, BROADCAST_DELAY_MS);
  }

  function ingest(payload) {
    if (payload && typeof payload.cwd === "string" && !cwds.has(payload.cwd)) {
      cwds.add(payload.cwd);
      scheduleTeamRefresh();
    }
    if (applyEvent(state, payload, Date.now())) {
      broadcast();
    }
  }

  function sendJson(res, status, body) {
    res.writeHead(status, { [CONTENT_TYPE]: JSON_TYPE });
    res.end(JSON.stringify(body));
  }

  function readBody(req, res, onJson) {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        sendJson(res, 413, { error: "Événement trop volumineux" });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (res.writableEnded) {
        return;
      }
      try {
        onJson(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
        sendJson(res, 200, {});
      } catch {
        sendJson(res, 400, { error: "JSON invalide" });
      }
    });
  }

  function serveStatic(req, res) {
    const urlPath = decodeURIComponent(
      new URL(req.url, `http://${HOST}`).pathname,
    );
    const relative =
      urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const file = path.normalize(path.join(PUBLIC_DIR, relative));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(file, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end("Introuvable");
        return;
      }
      res.writeHead(200, {
        [CONTENT_TYPE]: MIME[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(content);
    });
  }

  function openStream(req, res) {
    // un rechargement de la page relit tout de suite les agents et les réglages
    if (refreshTeam()) {
      broadcast();
    }
    res.writeHead(200, {
      [CONTENT_TYPE]: "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify(fullSnapshot())}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
  }

  const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, `http://${HOST}`);
    if (req.method === "POST" && pathname === "/event") {
      readBody(req, res, ingest);
    } else if (req.method === "POST" && pathname === "/demo") {
      runDemo(ingest, team ? team.members.map((m) => m.type) : []);
      sendJson(res, 202, { demo: "lancée" });
    } else if (req.method === "GET" && pathname === "/stream") {
      openStream(req, res);
    } else if (req.method === "GET" && pathname === "/state") {
      sendJson(res, 200, fullSnapshot());
    } else if (req.method === "GET" && pathname === "/health") {
      sendJson(res, 200, {
        app: "sidy-office",
        ok: true,
        version: VERSION,
        pid: process.pid,
      });
    } else if (req.method === "GET") {
      serveStatic(req, res);
    } else {
      res.writeHead(405);
      res.end();
    }
  });

  const teamRefresher = setInterval(() => {
    if (refreshTeam()) {
      broadcast();
    }
  }, TEAM_REFRESH_MS);
  teamRefresher.unref();

  const sweeper = setInterval(() => {
    if (sweep(state, Date.now())) {
      broadcast();
    }
  }, SWEEP_INTERVAL_MS);
  sweeper.unref();

  // Garde la connexion SSE ouverte derrière les proxys.
  const keepAlive = setInterval(() => {
    for (const res of clients) {
      res.write(": ping\n\n");
    }
  }, 20 * 1000);
  keepAlive.unref();

  server.on("close", () => {
    clearInterval(sweeper);
    clearInterval(keepAlive);
    clearInterval(teamRefresher);
    clearTimeout(teamTimer);
  });

  return { server, state, ingest, refreshTeam };
}

if (require.main === module) {
  const port = Number(process.env.SIDY_OFFICE_PORT) || DEFAULT_PORT;
  const { server } = createOfficeServer();
  server.listen(port, HOST, () => {
    console.log(`Bureau des agents : http://localhost:${port}`);
  });
}

module.exports = { createOfficeServer, DEFAULT_PORT };
