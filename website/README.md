# Family Court Strategist — Landing Site

The public front door: an award-style landing page that tells the story and points
parents to the free toolkit. Built with **Three.js** (animated constellation hero)
and **GSAP + ScrollTrigger** (entrance, scroll reveals, counters).

## Run it locally

```bash
cd website
python3 -m http.server 4321
# open http://127.0.0.1:4321
```

Any static file server works — it's plain HTML/CSS/JS.

## Notes

- **Self-contained:** Three.js and GSAP are vendored in `vendor/` (no CDN needed at runtime). Fonts load from Google Fonts with system-serif fallback.
- **Accessible:** respects `prefers-reduced-motion` — the constellation renders a single static frame and all entrance animations are disabled.
- **Performance:** pixel ratio capped, animation pauses when the tab is hidden, node count drops on small screens.
- This is the **marketing site**, separate from the private local web app in [`../app`](../app). The app holds case data and stays strictly offline/local; this site is public.

## Deploy

Static hosting (GitHub Pages, Netlify, Cloudflare Pages). Point it at the `website/` folder; no build step.
