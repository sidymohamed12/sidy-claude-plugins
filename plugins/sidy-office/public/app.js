// Relie le flux du serveur à la scène et au panneau.

import { Office } from "./office.js";
import { STATUS_INFO, GUEST_ROLE, TILE } from "./layout.js";
import { drawStanding } from "./sprites.js";

const connection = document.getElementById("connection");
const offline = document.getElementById("offline");
const teamList = document.getElementById("team");
const feedList = document.getElementById("feed");
const demoButton = document.getElementById("demo");
const tooltip = document.getElementById("tooltip");
const canvas = document.getElementById("office");
const title = document.getElementById("title");
const configError = document.getElementById("config-error");

let latest = { agents: [], history: {}, feed: [] };
let hoveredId = null;
/** Lignes dont on a déployé le texte complet (clé stable d'un rendu à l'autre). */
const opened = new Set();

const office = new Office(canvas, {
  onHover: (id) => {
    hoveredId = id;
    renderTooltip();
    renderTeam();
  },
});
office.start();

/* ---------- formatage ---------- */

function plural(count, word) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

function since(ts) {
  const minutes = Math.round((Date.now() - ts) / 60000);
  if (minutes < 1) {
    return "à l'instant";
  }
  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }
  return `il y a ${Math.round(minutes / 60)} h`;
}

function duration(ms) {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.round(s / 60)} min`;
}

function clock(ts) {
  return new Date(ts).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

/**
 * Texte court, avec le texte complet en info-bulle ; un clic (ou Entrée) le déploie.
 * `full` vide : rien à déployer.
 */
function expandable(node, key, full) {
  if (!full) {
    return node;
  }
  node.classList.add("is-expandable");
  node.title = full;
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  const show = (isOpen) => {
    node.classList.toggle("is-open", isOpen);
    node.setAttribute("aria-expanded", String(isOpen));
    node.textContent = isOpen ? full : node.dataset.short;
  };
  node.dataset.short = node.textContent;
  show(opened.has(key));
  const toggle = () => {
    if (opened.has(key)) {
      opened.delete(key);
    } else {
      opened.add(key);
    }
    show(opened.has(key));
  };
  node.addEventListener("click", toggle);
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
  return node;
}

/* ---------- panneau équipe ---------- */

function avatar(look) {
  const c = document.createElement("canvas");
  c.width = 12;
  c.height = 18;
  drawStanding(c.getContext("2d"), 6, 18, look, { facing: "front" });
  c.setAttribute("aria-hidden", "true");
  return c;
}

function metaLine(character) {
  const agent = latest.agents.find(
    (a) =>
      a.type === character.type && (!character.guest || a.key === character.id),
  );
  if (agent && agent.status !== "idle") {
    return `${plural(agent.tools, "outil")}, ${plural(agent.files, "fichier")} modifié${agent.files > 1 ? "s" : ""}`;
  }
  const past = latest.history[character.type];
  if (past) {
    return `Dernière mission ${since(past.finishedAt)} : ${plural(past.tools, "outil")}, ${duration(past.durationMs)}`;
  }
  return "";
}

function memberRow(character) {
  const info = STATUS_INFO[character.status] || STATUS_INFO.idle;
  const li = el("li", "member");
  li.dataset.active = String(character.status !== "idle");
  if (hoveredId === character.id) {
    li.classList.add("is-hovered");
  }
  li.append(avatar(character.look));
  const body = el("div");
  const name = el("div", "member-name", character.name);
  if (character.project) {
    name.append(el("span", "member-project", character.project));
  }
  const agentNow = latest.agents.find(
    (a) =>
      a.type === character.type && (!character.guest || a.key === character.id),
  );
  const fullDetail = character.detail && agentNow ? agentNow.detailFull : "";
  body.append(
    name,
    el("div", "member-role", character.guest ? GUEST_ROLE : character.role),
  );
  const status = el("div", "member-status");
  status.style.setProperty("--dot", info.color);
  status.append(
    expandable(
      el(
        "span",
        "member-detail",
        character.detail || character.activity || info.label,
      ),
      `member:${character.id}`,
      fullDetail,
    ),
  );
  body.append(status);
  const meta = metaLine(character);
  if (meta) {
    body.append(el("div", "member-meta", meta));
  }
  li.append(body);
  li.addEventListener("mouseenter", () => office.highlight(character.id));
  li.addEventListener("mouseleave", () => office.highlight(null));
  return li;
}

let activitySignature = "";

function renderTeam() {
  activitySignature = activityKey();
  teamList.replaceChildren(...office.characterList().map(memberRow));
}

/** Ce que font ceux qui flânent : le panneau se met à jour quand cela change. */
function activityKey() {
  return office
    .characterList()
    .map((c) => c.activity || "")
    .join("|");
}

setInterval(() => {
  if (activityKey() !== activitySignature) {
    renderTeam();
  }
  renderTooltip();
}, 500);

/* ---------- fil d'activité ---------- */

function displayName(type) {
  const team = latest.team;
  if (!team) {
    return type;
  }
  if (type === team.claude.type) {
    return team.claude.name;
  }
  const member = team.members.find((m) => m.type === type);
  return member ? member.name : type;
}

function renderFeed() {
  if (!latest.feed.length) {
    const li = el(
      "li",
      "empty",
      "Rien pour l’instant. Envoie une demande dans Claude Code, ou clique sur « Voir une démo ».",
    );
    feedList.replaceChildren(li);
    return;
  }
  feedList.replaceChildren(
    ...latest.feed.map((item) => {
      const li = el("li");
      li.dataset.kind = item.kind;
      const time = el("time", "", clock(item.ts));
      time.dateTime = new Date(item.ts).toISOString();
      const text = el("div");
      const who = displayName(item.type);
      text.append(el("span", "who", `${who} `));
      const what = expandable(
        el("span", "what", item.text),
        `feed:${item.ts}:${item.type}:${item.text}`,
        item.full,
      );
      if (item.text.startsWith("$ ")) {
        what.classList.add("is-command");
      }
      text.append(what);
      li.append(time, text);
      return li;
    }),
  );
}

/* ---------- info-bulle ---------- */

function agentFullDetail(c) {
  const agent = latest.agents.find(
    (a) => a.type === c.type && (!c.guest || a.key === c.id),
  );
  return agent ? agent.detailFull : "";
}

function renderTooltip() {
  const c = office.characterList().find((x) => x.id === hoveredId);
  if (!c) {
    tooltip.hidden = true;
    return;
  }
  const info = STATUS_INFO[c.status] || STATUS_INFO.idle;
  tooltip.replaceChildren(
    el("strong", "", c.name),
    document.createTextNode(
      (c.detail && agentFullDetail(c)) || c.detail || c.activity || info.label,
    ),
  );
  const rect = canvas.getBoundingClientRect();
  const wrap = canvas.parentElement.getBoundingClientRect();
  tooltip.style.left = `${rect.left - wrap.left + (c.x * TILE * rect.width) / office.W}px`;
  tooltip.style.top = `${rect.top - wrap.top + ((c.y * TILE - 26) * rect.height) / office.H}px`;
  tooltip.hidden = false;
}

/* ---------- en-tête ---------- */

function renderHeader() {
  if (latest.team && latest.team.title) {
    title.textContent = latest.team.title;
    document.title = latest.team.title;
  }
  const errors = latest.configErrors || [];
  configError.hidden = errors.length === 0;
  configError.textContent = errors.length
    ? `Réglages ignorés : ${errors.join(" ")}`
    : "";
}

/* ---------- flux serveur ---------- */

function setConnection(state, text) {
  connection.dataset.state = state;
  connection.textContent = text;
  offline.hidden = state !== "offline";
}

function connect() {
  const source = new EventSource("/stream");
  source.onopen = () => setConnection("live", "En direct");
  source.onmessage = (message) => {
    latest = JSON.parse(message.data);
    renderHeader();
    office.update(latest);
    renderTeam();
    renderFeed();
    renderTooltip();
  };
  source.onerror = () => setConnection("offline", "Serveur injoignable");
}

demoButton.addEventListener("click", async () => {
  demoButton.disabled = true;
  demoButton.textContent = "Démo en cours";
  try {
    await fetch("/demo", { method: "POST" });
  } finally {
    setTimeout(() => {
      demoButton.disabled = false;
      demoButton.textContent = "Voir une démo";
    }, 90000);
  }
});

// Rafraîchit les « il y a … » sans attendre d'événement.
setInterval(renderTeam, 30000);

const legend = document.getElementById("legend");
legend.replaceChildren(
  ...Object.values(STATUS_INFO).map((info) => {
    const li = el("li", "", info.label);
    li.style.setProperty("--dot", info.color);
    return li;
  }),
);

renderFeed();
connect();
