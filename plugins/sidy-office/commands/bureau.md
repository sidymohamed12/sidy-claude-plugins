---
description: Ouvre le bureau pixel art qui montre Claude et tes agents au travail
allowed-tools: Bash(node:*)
---

Lance cette commande avec l'outil Bash, sans rien modifier :

```
node "${CLAUDE_PLUGIN_ROOT}/server/start.js" --open
```

Elle démarre le serveur du bureau s'il ne tourne pas déjà, puis ouvre le navigateur. Réponds ensuite en une phrase : le bureau est ouvert sur http://localhost:4848 (ou le port de la variable `SIDY_OFFICE_PORT` si elle est définie). N'ajoute rien d'autre.
