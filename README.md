# PromptTune ♫

AI-powered prompt optimization tool. Paste your system prompt, define success criteria, and get an optimized version with measured improvements.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import in Vercel (vercel.com/new)
3. Add environment variable: `ANTHROPIC_API_KEY` = your Anthropic API key
4. Deploy

## Project Structure

```
prompttune/
├── api/
│   └── ai.js          # Serverless proxy for Anthropic API
├── public/
│   └── index.html      
├── src/
│   ├── index.js        # React entry
│   └── App.js          # Main app (landing page + tool)
├── package.json
├── vercel.json         # Vercel routing config
└── README.md
```

## How it works

- Free tier: 3 runs using your Anthropic API key (server-side)
- BYOK: Users add their own key (routed through /api/ai proxy)
- All keys stored in browser localStorage only

## Local dev

```bash
npm install
npm start
```

Set `ANTHROPIC_API_KEY` in a `.env` file for local development.
