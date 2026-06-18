<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1N4XU1Ixo49GoCk_lpWYzgoUZaOTjmEq-

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Keep local content in sync with deepchoi.com

The live site reads portfolio content from the Cloudflare D1 database behind `/api/projects`.
If local files or the local D1 database drift from the homepage, run:

`npm run sync:live:d1`

This pulls the current live project data into `data/projects.ts`, `server/data/db.json`, `local_projects.json`, and the local Wrangler D1 database used by `npm run dev`.
