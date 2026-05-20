---
description: Stop the Claude Village server running on :3000
allowed-tools: Bash
---

Kill the `claude-village` process listening on port 3000.

Run:

```bash
PIDS=$(lsof -ti:3000 2>/dev/null)
if [ -z "$PIDS" ]; then
  echo "village not running"
else
  kill $PIDS && echo "stopped village (pid $PIDS)"
fi
```

Report whether the village was stopped or wasn't running.
