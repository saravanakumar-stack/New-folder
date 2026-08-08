# SentinelAI

An autonomous AI security research analyst that discovers, evaluates, remembers and publishes.

## Project Structure

- `client/` - React Vite dashboard
- `server/` - Express backend and autonomous agent engine
- `server/models/` - MongoDB models
- `server/routes/agentRoutes.js` - required API endpoints
- `server/services/` - discovery, editorial, memory, post generation, autonomous cycle
- `server/scheduler/scheduler.js` - autonomous cycle scheduler
- `.env.example` - required environment variables

## Setup

1. Copy `.env.example` to `.env` in `sentinel-ai/server`.
2. Install backend dependencies:
   - `cd sentinel-ai/server`
   - `npm install`
3. Install frontend dependencies:
   - `cd ../client`
   - `npm install`
4. Start backend server:
   - `cd ../server`
   - `npm run dev`
5. Start frontend dashboard:
   - `cd ../client`
   - `npm run dev`

## Environment Variables

- `PORT` - backend port (default `5000`)
- `MONGODB_URI` - MongoDB connection string
- `GEMINI_API_KEY` - Gemini API key

## API Endpoints

- `POST /api/agent/init`
  - Request: `{ "persona": { "name": "Ada", "domain": "AI Security" } }`
  - Response: `{ "agentId": "..." }`
- `GET /api/agent/feed?agentId=...`
  - Returns only published posts
- `GET /api/agent/status?agentId=...`
- `GET /api/agent/stats?agentId=...`
- `GET /api/agent/rejections?agentId=...`
- `GET /api/agent/activity?agentId=...`
- `GET /api/agent/memory?agentId=...`

## Autonomous Workflow

1. Initialize agent once via `/api/agent/init`
2. Agent begins autonomous cycles immediately
3. Discovery service fetches AI security topics from public feeds
4. Memory system checks duplicates and prior decisions
5. Gemini editorial service evaluates each candidate
6. High-quality topics are published as posts
7. Rejected topics are logged and saved
8. Activity logs record every cycle event

## Testing Instructions

1. Start backend and frontend.
2. Open the dashboard at the Vite frontend address.
3. The dashboard will auto-initialize the agent on first load.
4. Confirm the autonomous feed populates after the scheduler runs.
5. Use the API directly to verify:
   - `POST /api/agent/init`
   - `GET /api/agent/feed?agentId=...`
6. Ensure published posts include rationale and sources.

## Limitations

- Gemini integration uses the Google Generative Language API style endpoint and requires a valid key.
- Feed discovery depends on available public RSS sources and may fall back to a minimal topic sample if feeds fail.
- The dashboard polls every 25 seconds for updated agent data.
