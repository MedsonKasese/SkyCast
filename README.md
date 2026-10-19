## SkyCast
SkyCast is a modern weather web application that prioritise simplicity, fast and easy to use.

## Tech Stack
SkyCast weather is being built using Vanilla html,css and javascript.
It uses weatherAPI to get weather updates.

## Setup

1. Clone the repo and copy the env template:
   ```
   cp .env.example .env
   ```
2. Get a free API key from [weatherapi.com](https://www.weatherapi.com/) and put it in `.env`:
   ```
   WEATHER_API_KEY=your_key_here
   ```
3. Run locally with the Vercel CLI (the `/api` weather and sports endpoints are Vercel serverless functions):
   ```
   npm i -g vercel
   vercel dev
   ```
4. When deploying on Vercel, add `WEATHER_API_KEY` under Project Settings → Environment Variables.

## Regression checks

Use Node.js 22.12 or newer:

```sh
npm ci
npm test
```

The suite uses mocked providers and DOM fixtures, so no API key is needed. Node may print an experimental VM-modules warning from the test harness; it does not affect the application runtime. GitHub Actions runs the same checks for pull requests.

For a **fixture-only UI preview** (not live weather or production API validation):

```sh
npm run preview:test
```

Open `http://localhost:4173`. Searching for `slow` delays the weather response so the full-card loading state can be inspected. Continue using `vercel dev` for real serverless API testing.

See the [loading/settings review and merge checklist](docs/LOADING_SETTINGS_REVIEW.md) for fixed bugs, verification limits, and remaining operational work.
