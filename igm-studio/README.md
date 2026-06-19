# IGM Image Studio

Internal AI image generation tool for Icon Global Media. Upload 20–50 photos of a client, train a custom FLUX LoRA, then generate photorealistic images of that person in any pose or scene.

## Deploying to Netlify

### Option 1 — Drag & Drop (fastest)
1. Go to [netlify.com](https://netlify.com) and log in
2. From your dashboard, find the "Sites" section
3. Drag the entire `igm-studio` folder onto the Netlify dashboard
4. Done — your URL will be something like `random-name.netlify.app`

### Option 2 — GitHub (recommended for updates)
1. Push this folder to a GitHub repo
2. Go to Netlify → "Add new site" → "Import an existing project"
3. Connect GitHub, select the repo
4. Build settings: leave blank (this is a static site, no build needed)
5. Click Deploy

### Custom domain
In Netlify: Site settings → Domain management → Add custom domain.

## First-time setup
1. Open the app
2. Go to **Setup** → paste your fal.ai API key (get it at fal.ai/dashboard/keys)
3. Add your clients
4. Go to **Train model** → upload photos and train
5. Go to **Generate** → select your model and start generating

## How it works
- Training uses `fal-ai/flux-lora-fast-training` (FLUX LoRA fine-tuning)
- Generation uses `fal-ai/flux-lora` (FLUX.1 dev with LoRA)
- All data (key, clients, models, library) is stored in browser localStorage
- Nothing is stored on any server — all API calls go directly to fal.ai

## Cost estimates
- Training: ~$2–4 per model (one-time)
- Generation: ~$0.02–0.10 per image at 1024px

## Files
```
igm-studio/
├── index.html          Main app
├── css/
│   └── style.css       All styles
├── js/
│   └── app.js          All logic
├── netlify.toml        Security headers
└── README.md           This file
```
