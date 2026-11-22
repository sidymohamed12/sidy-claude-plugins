"use strict";

/**
 * État du bureau : transforme les événements des hooks Claude Code
 * en un instantané lisible par l'interface. Module pur (aucune E/S).
 */

const MAIN_KEY = "main";
const MAIN_TYPE = "claude";
const FEED_LIMIT = 80;
const DONE_IDS_LIMIT = 500;
const STALE_ACTIVE_MS = 15 * 60 * 1000;
const STALE_SUBAGENT_MS = 30 * 60 * 1000;

const STATUS = Object.freeze({
  IDLE: "idle",
  THINKING: "thinking",
  TYPING: "typing",
  READING: "reading",
  RUNNING: "running",
  DELEGATING: "delegating",
  WAITING: "waiting",
});

const TOOL_STATUS = {
  Write: STATUS.TYPING,
  Edit: STATUS.TYPING,
  MultiEdit: STATUS.TYPING,
  NotebookEdit: STATUS.TYPING,
  Read: STATUS.READING,
  Grep: STATUS.READING,
  Glob: STATUS.READING,
  LS: STATUS.READING,
  NotebookRead: STATUS.READING,
  WebFetch: STATUS.READING,
  WebSearch: STATUS.READING,
  ToolSearch: STATUS.READING,
  Bash: STATUS.RUNNING,
  BashOutput: STATUS.RUNNING,
  KillShell: STATUS.RUNNING,
  Monitor: STATUS.RUNNING,
  Task: STATUS.DELEGATING,
  Agent: STATUS.DELEGATING,
  TodoWrite: STATUS.THINKING,
  TaskCreate: STATUS.THINKING,
  TaskUpdate: STATUS.THINKING,
};

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

const TEXT_THINKING = "Réfléchit";
const TEXT_PROMPT = "Lit ta demande";
const TEXT_FINISHED = "A terminé, attend ta suite";
const TEXT_PERMISSION = "Attend ta permission";

function createState() {
  return {
    agents: new Map(),
    history: new Map(),
    feed: [],
    doneToolIds: new Set(),
    doneOrder: [],
    version: 0,
  };
}

/** "sidy-dev:backend-dev" -> "backend-dev" */
function normalizeType(type) {
  if (!type || typeof type !== "string") {
    return MAIN_TYPE;
  }
  const parts = type.split(":");
  return parts[parts.length - 1];
}

function baseName(path) {
  if (!path || typeof path !== "string") {
    return "";
  }
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function truncate(text, max) {
  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return truncate(url, 40);
  }
}

function mcpLabel(toolName) {
  const parts = toolName.split("__");
  return parts[parts.length - 1];
}

function statusForTool(toolName) {
  if (TOOL_STATUS[toolName]) {
    return TOOL_STATUS[toolName];
  }
  return STATUS.RUNNING;
}

/** Phrase courte qui décrit ce que fait l'outil, sans jamais recopier le contenu des fichiers. */
function describeTool(toolName, input) {
  const i = input || {};
  switch (toolName) {
    case "Write":
      return `Écrit ${baseName(i.file_path)}`;
    case "Edit":
    case "MultiEdit":
      return `Modifie ${baseName(i.file_path)}`;
    case "NotebookEdit":
      return `Modifie ${baseName(i.notebook_path)}`;
    case "Read":
      return `Lit ${baseName(i.file_path)}`;
    case "Grep":
      return `Cherche « ${truncate(i.pattern, 30)} »`;
    case "Glob":
      return `Liste ${truncate(i.pattern, 30)}`;
    case "WebFetch":
      return `Consulte ${hostOf(i.url)}`;
    case "WebSearch":
      return `Recherche « ${truncate(i.query, 30)} »`;
    case "Bash":
      return `$ ${truncate(i.command, 48)}`;
    case "Task":
    case "Agent":
      return `Confie le travail à ${normalizeType(i.subagent_type)}`;
    case "TodoWrite":
    case "TaskCreate":
    case "TaskUpdate":
      return "Organise ses tâches";
    default:
      if (toolName.startsWith("mcp__")) {
        return `Utilise ${mcpLabel(toolName)}`;
      }
      return `Utilise ${toolName}`;
  }
}

function agentKey(sessionId, agentId) {
  return `${sessionId || "session"}:${agentId || MAIN_KEY}`;
}

function ensureAgent(state, payload, now) {
  const agentId = payload.agent_id || null;
  const key = agentKey(payload.session_id, agentId);
  let agent = state.agents.get(key);
  if (!agent) {
    agent = {
      key,
      sessionId: payload.session_id || "session",
      agentId,
      isMain: !agentId,
      type: normalizeType(payload.agent_type),
      project: baseName(payload.cwd),
      status: STATUS.IDLE,
      detail: "",
      delegateTo: null,
      since: now,
      lastEventAt: now,
      startedAt: now,
      lastErrorAt: 0,
      tools: 0,
      files: new Set(),
      errors: 0,
    };
    state.agents.set(key, agent);
  }
  if (payload.agent_type) {
    agent.type = normalizeType(payload.agent_type);
  }
  if (payload.cwd) {
    agent.project = baseName(payload.cwd);
  }
  agent.lastEventAt = now;
  return agent;
}

function setStatus(agent, status, detail, now) {
  if (agent.status !== status) {
    agent.since = now;
  }
  agent.status = status;
  agent.detail = detail;
  if (status !== STATUS.DELEGATING) {
    agent.delegateTo = null;
  }
}

function pushFeed(state, agent, text, kind, now) {
  state.feed.unshift({
    ts: now,
    type: agent.type,
    project: agent.project,
    text,
    kind,
  });
  if (state.feed.length > FEED_LIMIT) {
    state.feed.length = FEED_LIMIT;
  }
}

function markToolDone(state, toolUseId) {
  if (!toolUseId || state.doneToolIds.has(toolUseId)) {
    return;
  }
  state.doneToolIds.add(toolUseId);
  state.doneOrder.push(toolUseId);
  if (state.doneOrder.length > DONE_IDS_LIMIT) {
    state.doneToolIds.delete(state.doneOrder.shift());
  }
}

function recordHistory(state, agent, now) {
  state.history.set(agent.type, {
    finishedAt: now,
    durationMs: now - agent.startedAt,
    tools: agent.tools,
    files: agent.files.size,
    errors: agent.errors,
    project: agent.project,
  });
}

function onPreToolUse(state, payload, now) {
  // Les hooks async peuvent arriver dans le désordre : un Pre reçu après son Post est ignoré.
  if (payload.tool_use_id && state.doneToolIds.has(payload.tool_use_id)) {
    return;
  }
  const agent = ensureAgent(state, payload, now);
  const toolName = payload.tool_name || "outil";
  const input = payload.tool_input || {};
  const status = statusForTool(toolName);
  const detail = describeTool(toolName, input);
  setStatus(agent, status, detail, now);
  if (status === STATUS.DELEGATING) {
    agent.delegateTo = normalizeType(input.subagent_type);
  }
  agent.tools += 1;
  if (WRITE_TOOLS.has(toolName)) {
    const file = input.file_path || input.notebook_path;
    if (file) {
      agent.files.add(file);
    }
  }
  pushFeed(state, agent, detail, status, now);
}

function onPostToolUse(state, payload, now, failed) {
  markToolDone(state, payload.tool_use_id);
  const agent = ensureAgent(state, payload, now);
  if (failed) {
    agent.errors += 1;
    agent.lastErrorAt = now;
    pushFeed(
      state,
      agent,
      `Échec : ${describeTool(payload.tool_name || "outil", payload.tool_input)}`,
      "error",
      now,
    );
  }
  setStatus(agent, STATUS.THINKING, TEXT_THINKING, now);
}

function onNotification(state, payload, now) {
  const agent = ensureAgent(state, payload, now);
  const type = payload.notification_type || "";
  const message = String(payload.message || "");
  if (type === "permission_prompt" || /permission/i.test(message)) {
    setStatus(agent, STATUS.WAITING, TEXT_PERMISSION, now);
    pushFeed(state, agent, TEXT_PERMISSION, STATUS.WAITING, now);
    return;
  }
  if (type === "idle_prompt") {
    setStatus(agent, STATUS.IDLE, TEXT_FINISHED, now);
    return;
  }
  if (message) {
    pushFeed(state, agent, truncate(message, 80), "info", now);
  }
}

function onSubagentStop(state, payload, now) {
  const key = agentKey(payload.session_id, payload.agent_id);
  const agent = state.agents.get(key) || ensureAgent(state, payload, now);
  recordHistory(state, agent, now);
  pushFeed(state, agent, "Mission terminée", "done", now);
  state.agents.delete(key);
}

function onSessionEnd(state, payload, now) {
  for (const [key, agent] of state.agents) {
    if (agent.sessionId === payload.session_id) {
      if (!agent.isMain) {
        recordHistory(state, agent, now);
      }
      state.agents.delete(key);
    }
  }
}

/**
 * Applique un événement de hook. Retourne true si l'état a changé.
 */
function applyEvent(state, payload, now = Date.now()) {
  if (!payload || typeof payload !== "object" || !payload.hook_event_name) {
    return false;
  }
  switch (payload.hook_event_name) {
    case "SessionStart": {
      const agent = ensureAgent(state, payload, now);
      setStatus(agent, STATUS.IDLE, "Arrive au bureau", now);
      pushFeed(state, agent, "Ouvre une session", "info", now);
      break;
    }
    case "UserPromptSubmit": {
      const agent = ensureAgent(state, payload, now);
      setStatus(agent, STATUS.THINKING, TEXT_PROMPT, now);
      pushFeed(state, agent, TEXT_PROMPT, STATUS.THINKING, now);
      break;
    }
    case "PreToolUse":
      onPreToolUse(state, payload, now);
      break;
    case "PostToolUse":
      onPostToolUse(state, payload, now, false);
      break;
    case "PostToolUseFailure":
      onPostToolUse(state, payload, now, true);
      break;
    case "PermissionRequest": {
      const agent = ensureAgent(state, payload, now);
      setStatus(agent, STATUS.WAITING, TEXT_PERMISSION, now);
      break;
    }
    case "Notification":
      onNotification(state, payload, now);
      break;
    case "SubagentStart": {
      const agent = ensureAgent(state, payload, now);
      agent.startedAt = now;
      setStatus(agent, STATUS.THINKING, "Commence sa mission", now);
      pushFeed(state, agent, "Commence sa mission", "start", now);
      break;
    }
    case "SubagentStop":
      onSubagentStop(state, payload, now);
      break;
    case "Stop": {
      const agent = ensureAgent(state, payload, now);
      setStatus(agent, STATUS.IDLE, TEXT_FINISHED, now);
      pushFeed(state, agent, TEXT_FINISHED, "done", now);
      break;
    }
    case "SessionEnd":
      onSessionEnd(state, payload, now);
      break;
    default:
      return false;
  }
  state.version += 1;
  return true;
}

/** Remet au repos les agents silencieux et retire les sous-agents oubliés. */
function sweep(state, now = Date.now()) {
  let changed = false;
  for (const [key, agent] of state.agents) {
    const silence = now - agent.lastEventAt;
    if (!agent.isMain && silence > STALE_SUBAGENT_MS) {
      state.agents.delete(key);
      changed = true;
    } else if (agent.status !== STATUS.IDLE && silence > STALE_ACTIVE_MS) {
      setStatus(agent, STATUS.IDLE, "En pause", now);
      changed = true;
    }
  }
  if (changed) {
    state.version += 1;
  }
  return changed;
}

function snapshot(state) {
  return {
    version: state.version,
    agents: [...state.agents.values()].map((a) => ({
      key: a.key,
      sessionId: a.sessionId,
      isMain: a.isMain,
      type: a.type,
      project: a.project,
      status: a.status,
      detail: a.detail,
      delegateTo: a.delegateTo,
      since: a.since,
      lastErrorAt: a.lastErrorAt,
      tools: a.tools,
      files: a.files.size,
      errors: a.errors,
    })),
    history: Object.fromEntries(state.history),
    feed: state.feed,
  };
}

module.exports = {
  STATUS,
  createState,
  applyEvent,
  sweep,
  snapshot,
  normalizeType,
  describeTool,
  statusForTool,
};
