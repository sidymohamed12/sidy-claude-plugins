"use strict";

/**
 * Scénario de démonstration : rejoue des événements identiques à ceux
 * que Claude Code envoie, pour voir le bureau s'animer sans session réelle.
 */

const SESSION = "demo-session";
const CWD = "/Users/sidy/projets/boutique-api";
const STEP_MS = 1400;

let running = false;

function ev(name, extra = {}) {
  return { hook_event_name: name, session_id: SESSION, cwd: CWD, ...extra };
}

function sub(id, type) {
  return { agent_id: id, agent_type: type };
}

function tool(name, input, agent, id) {
  return [
    ev("PreToolUse", {
      tool_name: name,
      tool_input: input,
      tool_use_id: id,
      ...agent,
    }),
    ev("PostToolUse", {
      tool_name: name,
      tool_input: input,
      tool_use_id: id,
      ...agent,
    }),
  ];
}

const DEFAULT_CAST = [
  "backend-dev",
  "frontend-dev",
  "reviewer",
  "security-reviewer",
];

/** Les 4 rôles de la démo sont joués par les premiers agents de l'équipe. */
function castFrom(memberTypes = []) {
  return DEFAULT_CAST.map((fallback, i) => memberTypes[i] || fallback);
}

function buildScript(memberTypes) {
  const [backType, frontType, revType, secType] = castFrom(memberTypes);
  const back = sub("demo-back", backType);
  const front = sub("demo-front", frontType);
  const rev = sub("demo-rev", revType);
  const sec = sub("demo-sec", secType);
  const delegate = (type, id) =>
    ev("PreToolUse", {
      tool_name: "Agent",
      tool_input: { subagent_type: type },
      tool_use_id: id,
    });
  const src = `${CWD}/src/main/java/sn/sidy/boutique`;
  return [
    ev("SessionStart", { source: "startup" }),
    ev("UserPromptSubmit", { prompt: "CRUD Produit + page liste" }),
    ...tool("Read", { file_path: `${CWD}/README.md` }, {}, "d1"),
    delegate(backType, "d2"),
    ev("SubagentStart", back),
    ...tool("Glob", { pattern: "src/**/*.java" }, back, "b1"),
    ...tool("Read", { file_path: `${src}/domain/Commande.java` }, back, "b2"),
    ...tool("Write", { file_path: `${src}/domain/Produit.java` }, back, "b3"),
    delegate(frontType, "d3"),
    ev("SubagentStart", front),
    ...tool(
      "Write",
      { file_path: `${src}/application/CreerProduitUseCase.java` },
      back,
      "b4",
    ),
    ...tool(
      "Read",
      { file_path: `${CWD}/web/src/app/app.routes.ts` },
      front,
      "f1",
    ),
    ...tool(
      "Write",
      {
        file_path: `${src}/../../../../resources/db/migration/V3__produit.sql`,
      },
      back,
      "b5",
    ),
    ...tool(
      "Write",
      { file_path: `${CWD}/web/src/app/produits/liste-produits.ts` },
      front,
      "f2",
    ),
    ...tool(
      "Bash",
      { command: "./mvnw test -Dtest=CreerProduitUseCaseTest" },
      back,
      "b6",
    ),
    ev("PostToolUseFailure", {
      tool_name: "Bash",
      tool_input: { command: "./mvnw test" },
      tool_use_id: "b7",
      ...back,
    }),
    ...tool(
      "Edit",
      { file_path: `${src}/application/CreerProduitUseCase.java` },
      back,
      "b8",
    ),
    ...tool(
      "Edit",
      { file_path: `${CWD}/web/src/app/produits/liste-produits.html` },
      front,
      "f3",
    ),
    ...tool("Bash", { command: "./mvnw verify" }, back, "b9"),
    ev("SubagentStop", back),
    ev("PostToolUse", { tool_name: "Agent", tool_use_id: "d2" }),
    delegate(revType, "d4"),
    ev("SubagentStart", rev),
    ...tool("Bash", { command: "npm run build" }, front, "f4"),
    ...tool("Grep", { pattern: "catch \\(Exception" }, rev, "r1"),
    ev("SubagentStop", front),
    ev("PostToolUse", { tool_name: "Agent", tool_use_id: "d3" }),
    delegate(secType, "d5"),
    ev("SubagentStart", sec),
    ...tool(
      "Read",
      { file_path: `${src}/infra/web/ProduitController.java` },
      rev,
      "r2",
    ),
    ...tool(
      "Read",
      { file_path: `${src}/infra/security/SecurityConfig.java` },
      sec,
      "s1",
    ),
    ...tool("Grep", { pattern: "createNativeQuery" }, sec, "s2"),
    ev("SubagentStop", rev),
    ev("Notification", {
      notification_type: "permission_prompt",
      message: "Claude needs your permission to use Bash",
    }),
    ...tool(
      "WebFetch",
      { url: "https://docs.spring.io/spring-security/reference/" },
      sec,
      "s3",
    ),
    ev("SubagentStop", sec),
    ev("Stop", {}),
    ev("SessionEnd", { reason: "other" }),
  ];
}

/** Un outil reste visible un moment ; la pause qui suit est courte. */
function pauseAfter(payload, stepMs) {
  if (payload.hook_event_name === "PreToolUse") {
    return stepMs * 1.6;
  }
  if (payload.hook_event_name === "PostToolUse") {
    return stepMs * 0.25;
  }
  return stepMs;
}

/** Lance le scénario une seule fois à la fois. */
function runDemo(ingest, memberTypes, stepMs = STEP_MS) {
  if (running) {
    return false;
  }
  running = true;
  const script = buildScript(memberTypes);
  let at = 0;
  script.forEach((payload, index) => {
    setTimeout(() => {
      ingest(payload);
      if (index === script.length - 1) {
        running = false;
      }
    }, at);
    at += pauseAfter(payload, stepMs);
  });
  return true;
}

module.exports = { runDemo, buildScript };
