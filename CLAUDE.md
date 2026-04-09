# Agency Showcase

Public-facing portfolio page for Jack Satta / Deliberate UX. Shows what Jack has built with AI assistance.

**Live URL:** https://69d7d935ba00e311cbd02421--glittery-frangollo-500cc7.netlify.app  
**Local (Tailscale):** http://100.76.76.81:18797  
**Served by:** `openclaw-agency-showcase-1` (nginx, port 18797)

---

## Deployment

This is a **fully static** single-file page — no JS fetch calls, no external dependencies, no local ports.  
Deploy by dragging `agency-showcase/` onto Netlify (netlify.com → Add site → Deploy manually).

To open the folder for drag-and-drop:
```bash
open /Users/jack/.openclaw/workspace/agency-showcase
```

Use **Cmd+Shift+.** in Finder to reveal hidden folders if needed.

---

## Design Decisions

- **No live stats** — stats were removed for public deployment (they polled the local stats-server on port 18796, unreachable externally)
- **Uptime bar** — replaced "What's running" build cards with a static green uptime indicator ("100% · running since April 9, 2026") — cleaner for a marketing page
- **No internal links** — build cards are `<div>` not `<a>`; no `open18791()` etc. — avoids dead links for external visitors
- **No subscriptions tracker** — removed from "What's running" (too personal/financial)
- **HTTPS** — provided by Netlify; the local nginx service is HTTP-only

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Main page — links to all demo pages |
| `paper-trader.html` | Demo: portfolios Alpha/Beta/Gamma, live CoinGecko prices, baked state data |
| `flight-watcher.html` | Demo: PDX→Europe deals, baked April 2026 snapshot |
| `subscriptions.html` | Demo: generic indie dev SaaS stack (Figma, Vercel, etc.) — no real personal data |
| `real-estate.html` | Demo: generic property cards, no real addresses or prices |

## Deploy

Auto-deploys on `git push` — Netlify is connected to `github.com/jacksatta/agency-showcase`.

```bash
cd /Users/jack/.openclaw/workspace/agency-showcase
git add -A && git commit -m "update" && git push
```
