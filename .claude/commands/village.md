---
description: Launch the Claude Village 2D world in your browser (backgrounded)
allowed-tools: Bash
---

Start `claude-village` in the background and open the browser.

Run:

```bash
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "village already running on :3000 — visit http://localhost:3000"
else
  nohup claude-village >/tmp/claude-village.log 2>&1 &
  disown
  echo "village starting → http://localhost:3000 (logs: /tmp/claude-village.log)"
fi
```

Then tell the user the village is running at http://localhost:3000 and that `/village-stop` will kill it.
