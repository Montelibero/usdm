# USDM

Static reference site for USDM / USD Montelibero, built with Astro and served from a Caddy container.

## Local development

```sh
npm install
npm run dev
```

## Build and test

```sh
npm run build
npm test
```

## Update monitoring data

```sh
npm run data:monitoring
```

The command preserves already saved raw payments in `public/data/monitoring-account.json`,
merges newly available Horizon payments, and regenerates the monthly summary.

## Docker

```sh
docker build -t usdm-site .
docker run --rm -p 8080:80 usdm-site
```
