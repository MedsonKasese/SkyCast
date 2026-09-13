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
