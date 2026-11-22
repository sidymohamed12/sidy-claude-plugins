"use strict";

const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  createState,
  applyEvent,
  sweep,
  snapshot,
  normalizeType,
  describeTool,
  STATUS,
} = require("../server/state");
const { buildScript } = require("../server/demo");

const SESSION = "s1";
const T0 = 1_000_000;

function ev(name, extra = {}) {
  return {
    hook_event_name: name,
    session_id: SESSION,
    cwd: "/home/sidy/boutique",
    ...extra,
  };
}

const BACK = { agent_id: "a1", agent_type: "sidy-dev:backend-dev" };

function findAgent(state, type) {
  return snapshot(state).agents.find((a) => a.type === type);
}

describe("normalizeType", () => {
  test("retire le préfixe du plugin", () => {
    assert.equal(normalizeType("sidy-dev:backend-dev"), "backend-dev");
  });
  test("agent principal sans type", () => {
    assert.equal(normalizeType(undefined), "claude");
  });
});

describe("describeTool", () => {
  test("ne garde que le nom du fichier, jamais son contenu", () => {
    const text = describeTool("Write", {
      file_path: "/a/b/Produit.java",
      content: "secret",
    });
    assert.equal(text, "Écrit Produit.java");
  });
  test("tronque les longues commandes", () => {
    const text = describeTool("Bash", { command: "x".repeat(200) });
    assert.ok(text.length <= 52);
  });
  test("outil MCP", () => {
    assert.equal(
      describeTool("mcp__github__create_issue", {}),
      "Utilise create_issue",
    );
  });
});

describe("applyEvent", () => {
  test("ignore un événement sans nom", () => {
    const state = createState();
    assert.equal(applyEvent(state, { session_id: SESSION }, T0), false);
    assert.equal(applyEvent(state, null, T0), false);
  });

  test("la demande utilisateur fait réfléchir Claude", () => {
    const state = createState();
    applyEvent(state, ev("UserPromptSubmit"), T0);
    const main = findAgent(state, "claude");
    assert.equal(main.status, STATUS.THINKING);
    assert.equal(main.project, "boutique");
  });

  test("un sous-agent qui écrit passe en frappe et compte le fichier", () => {
    const state = createState();
    applyEvent(state, ev("SubagentStart", BACK), T0);
    applyEvent(
      state,
      ev("PreToolUse", {
        ...BACK,
        tool_name: "Write",
        tool_use_id: "t1",
        tool_input: { file_path: "/x/A.java" },
      }),
      T0 + 1,
    );
    const back = findAgent(state, "backend-dev");
    assert.equal(back.status, STATUS.TYPING);
    assert.equal(back.files, 1);
    assert.equal(back.tools, 1);
  });

  test("la délégation indique l'agent visé", () => {
    const state = createState();
    applyEvent(
      state,
      ev("PreToolUse", {
        tool_name: "Agent",
        tool_use_id: "t1",
        tool_input: { subagent_type: "sidy-dev:reviewer" },
      }),
      T0,
    );
    const main = findAgent(state, "claude");
    assert.equal(main.status, STATUS.DELEGATING);
    assert.equal(main.delegateTo, "reviewer");
  });

  test("un PreToolUse reçu après son PostToolUse est ignoré", () => {
    const state = createState();
    applyEvent(
      state,
      ev("PostToolUse", { ...BACK, tool_name: "Read", tool_use_id: "t9" }),
      T0,
    );
    applyEvent(
      state,
      ev("PreToolUse", {
        ...BACK,
        tool_name: "Read",
        tool_use_id: "t9",
        tool_input: {},
      }),
      T0 + 1,
    );
    assert.equal(findAgent(state, "backend-dev").status, STATUS.THINKING);
  });

  test("un échec d'outil est compté et daté", () => {
    const state = createState();
    applyEvent(
      state,
      ev("PostToolUseFailure", {
        ...BACK,
        tool_name: "Bash",
        tool_use_id: "t2",
        tool_input: { command: "mvn test" },
      }),
      T0,
    );
    const back = findAgent(state, "backend-dev");
    assert.equal(back.errors, 1);
    assert.equal(back.lastErrorAt, T0);
    assert.equal(snapshot(state).feed[0].kind, "error");
  });

  test("une demande de permission met l'agent en attente", () => {
    const state = createState();
    applyEvent(
      state,
      ev("Notification", {
        notification_type: "permission_prompt",
        message: "needs your permission",
      }),
      T0,
    );
    assert.equal(findAgent(state, "claude").status, STATUS.WAITING);
  });

  test("la fin d'un sous-agent le retire et garde son bilan", () => {
    const state = createState();
    applyEvent(state, ev("SubagentStart", BACK), T0);
    applyEvent(
      state,
      ev("PreToolUse", {
        ...BACK,
        tool_name: "Edit",
        tool_use_id: "t1",
        tool_input: { file_path: "/x/A.java" },
      }),
      T0 + 10,
    );
    applyEvent(state, ev("SubagentStop", BACK), T0 + 5000);
    const snap = snapshot(state);
    assert.equal(snap.agents.length, 0);
    assert.deepEqual(snap.history["backend-dev"], {
      finishedAt: T0 + 5000,
      durationMs: 5000,
      tools: 1,
      files: 1,
      errors: 0,
      project: "boutique",
    });
  });

  test("la fin de session retire tous ses agents", () => {
    const state = createState();
    applyEvent(state, ev("SessionStart"), T0);
    applyEvent(state, ev("SubagentStart", BACK), T0);
    applyEvent(
      state,
      { hook_event_name: "SessionStart", session_id: "autre" },
      T0,
    );
    applyEvent(state, ev("SessionEnd"), T0 + 1);
    assert.deepEqual(
      snapshot(state).agents.map((a) => a.sessionId),
      ["autre"],
    );
  });

  test("Stop remet Claude au repos", () => {
    const state = createState();
    applyEvent(state, ev("UserPromptSubmit"), T0);
    applyEvent(state, ev("Stop"), T0 + 1);
    assert.equal(findAgent(state, "claude").status, STATUS.IDLE);
  });

  test("le fil d'activité est borné", () => {
    const state = createState();
    for (let i = 0; i < 200; i += 1) {
      applyEvent(state, ev("UserPromptSubmit"), T0 + i);
    }
    assert.equal(snapshot(state).feed.length, 80);
  });
});

describe("sweep", () => {
  test("met au repos un agent silencieux depuis 15 minutes", () => {
    const state = createState();
    applyEvent(state, ev("UserPromptSubmit"), T0);
    assert.equal(sweep(state, T0 + 16 * 60 * 1000), true);
    assert.equal(findAgent(state, "claude").status, STATUS.IDLE);
  });

  test("retire un sous-agent oublié depuis 30 minutes", () => {
    const state = createState();
    applyEvent(state, ev("SubagentStart", BACK), T0);
    sweep(state, T0 + 31 * 60 * 1000);
    assert.equal(findAgent(state, "backend-dev"), undefined);
  });

  test("ne change rien si tout est récent", () => {
    const state = createState();
    applyEvent(state, ev("UserPromptSubmit"), T0);
    assert.equal(sweep(state, T0 + 1000), false);
  });
});

describe("scénario de démo", () => {
  test("se termine sans agent restant", () => {
    const state = createState();
    buildScript().forEach((payload, i) => applyEvent(state, payload, T0 + i));
    const snap = snapshot(state);
    assert.equal(snap.agents.length, 0);
    assert.deepEqual(Object.keys(snap.history).sort(), [
      "backend-dev",
      "frontend-dev",
      "reviewer",
      "security-reviewer",
    ]);
  });

  test("est joué par les agents de l'équipe", () => {
    const state = createState();
    buildScript(["api", "web"]).forEach((payload, i) =>
      applyEvent(state, payload, T0 + i),
    );
    assert.deepEqual(Object.keys(snapshot(state).history).sort(), [
      "api",
      "reviewer",
      "security-reviewer",
      "web",
    ]);
  });
});
