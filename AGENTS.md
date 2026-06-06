# AGENTS.md

## Project Overview

USDM is a static reference website for USDM / USD Montelibero. It is built with Astro and served from a Caddy container.

The runtime container does not need Node.js. Node.js is used only in the Docker build stage to generate the static `dist/` output. Caddy serves the generated files over plain HTTP on port 80, intended to sit behind Traefik. The runtime exposes `/healthz` for Docker health checks and writes Caddy access logs to stdout as JSON.

## Stack

- Astro `6.4.4`
- Node.js `24` in CI and Docker build stage
- Caddy `2-alpine` as the runtime web server
- GitHub Actions for build, test, Docker image publishing
- GitHub Container Registry image: `ghcr.io/montelibero/usdm`

## Important Files

- `src/pages/index.astro` - Astro entrypoint for the generated static page
- `src/layouts/BaseLayout.astro` - shared document shell, metadata, styles, and browser script
- `src/components/LanguagePage.astro` - renders one localized page snapshot
- `src/content/pages/*.html` - localized HTML content snapshots used by `LanguagePage`
- `public/assets/styles.css` - page styling
- `public/assets/app.js` - browser behavior: language switcher, copy buttons, live metrics, trustline check, live liquidity pool refresh
- `public/assets/usdm-logo.png` - site logo and icon
- `public/data/monitoring-account.json` - static snapshot for the monitoring account payouts table; includes raw saved payments and regenerated monthly totals
- `public/data/usdm-pools.json` - build-time fallback snapshot for large USDM liquidity pools
- `public/robots.txt` - robots policy copied to build output
- `public/site.webmanifest` - web app manifest copied to build output
- `scripts/fetch-monitoring-account.mjs` - refreshes the monitoring account snapshot from Horizon
- `scripts/fetch-usdm-pools.mjs` - refreshes the USDM liquidity pools fallback snapshot from Horizon
- `Dockerfile` - multi-stage build: Node builds Astro, Caddy serves `dist`
- `Caddyfile` - Caddy static file server on `:80`, `/healthz`, and stdout access logs
- `.github/workflows/ci.yml` - CI and GHCR publishing
- `test/site.test.mjs` - smoke tests for static output, Docker config, and CI config

## Local Commands

Install dependencies:

```sh
npm install
```

Run local dev server:

```sh
npm run dev
```

Build static site:

```sh
npm run build
```

The build runs `npm run data:pools` first, so the Docker image and CI build include
a fresh fallback snapshot for liquidity pools when Horizon is reachable.

Run tests:

```sh
npm test
```

Refresh monitoring account data:

```sh
npm run data:monitoring
```

This command merges newly available Horizon payments into the existing saved `payments`
array before regenerating the monthly summary. Do not replace the snapshot with only
the latest Horizon response, because public Horizon history can be pruned.

Refresh large USDM liquidity pools:

```sh
npm run data:pools
```

The pools block is hybrid: browser JavaScript tries to load live Horizon pool data
on page load and caches it in `localStorage` for one hour. If Horizon is unavailable,
the page uses `public/data/usdm-pools.json`. Keep that fallback reasonably fresh:
it is updated during `npm run build` and should also be refreshed manually at least
monthly if builds are not happening.

The monthly monitoring summary must include complete months only. Keep payments from
the current incomplete month in the saved raw `payments` array, but do not include that
month in `monthly` or `totals` until the month is complete.

Build Docker image locally:

```sh
docker build -t usdm-site .
```

Run Docker image locally:

```sh
docker run --rm -p 8080:80 usdm-site
```

Check container health endpoint:

```sh
curl -fsS http://localhost:8080/healthz
```

Caddy access logs are emitted to stdout in JSON. In Docker/Traefik deployments,
collect container stdout to see remote IP, method, URI, status, user agent, and
referrer fields.

## Verification Before Finishing

Before claiming a change is complete, run:

```sh
npm run build
npm test
docker build -t usdm-site .
```

If the change affects the container runtime, also verify HTTP output:

```sh
docker run --rm -d -p 18080:80 --name usdm-site-check usdm-site
curl -fsS http://localhost:18080/
curl -fsS http://localhost:18080/healthz
docker stop usdm-site-check
```

Use another host port if `18080` is already taken.

## CI Behavior

GitHub Actions runs on both `push` and `pull_request`.

On pull requests, CI installs dependencies, builds Astro, runs tests, and builds the Docker image without publishing.

On pushes, CI additionally logs in to `ghcr.io` with `GITHUB_TOKEN` and publishes:

- `ghcr.io/montelibero/usdm:${{ github.sha }}`
- `ghcr.io/montelibero/usdm:latest`

## Editing Guidelines

- Keep the site static unless there is a clear requirement for runtime server behavior.
- Prefer static HTML, plain CSS, and small browser JavaScript over adding frontend frameworks.
- Do not commit generated output: `dist/`, `.astro/`, and `node_modules/` are ignored.
- Keep Docker runtime simple: Caddy should serve built static files over HTTP on port 80, expose `/healthz`, and log access requests to stdout.
- Update `test/site.test.mjs` when Docker, CI, or core page expectations change.
- Refresh `public/data/monitoring-account.json` with `npm run data:monitoring` when updating the monitoring table; preserve the saved `payments` array.
- Refresh `public/data/usdm-pools.json` with `npm run data:pools` when updating liquidity pool data manually. Do not hand-edit reserves unless Horizon is unavailable and the source is documented.
- Do not add an incomplete current month to the monitoring table. Percent values in the monitoring table are annualized against the 1000 USDM base.
- Avoid broad refactors while making content or layout edits.
