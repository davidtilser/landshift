# Menu preview (temporary)

This preview is deliberately temporary: it mounts the landing screen at `/src/dev/menu-preview/index.html` against a fake globe that logs every call to the console and draws a placeholder circle, and it owns the game handoff the way the real caller will (append `?fail-handoff` to exercise the load-failure path). Removal trigger: the landing screen is wired to the real globe in src/main.ts. Deletion list: `src/dev/menu-preview/`. Permanent code under `src/app`, `src/regions`, `src/screens`, and `src/ui` must never import from `src/dev`.
