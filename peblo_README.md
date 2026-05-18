# Peblo Notes — AI-Powered Notes Workspace

A full-stack notes application with AI summaries, public sharing, tag organization, and productivity insights.

## Architecture

```
peblo/
  backend/     FastAPI + SQLite + Claude AI
  frontend/    Next.js 14 + Tailwind CSS
```

## Features

- **Authentication** — Signup/login with JWT tokens, persistent sessions
- **Notes Workspace** — Create, edit, archive notes with auto-save (800ms debounce)
- **Tags** — Add/remove tags inline, filter notes by tag
- **Search** — Full-text search across title and content
- **AI Integration** — Claude generates summaries, action items, and suggested titles
- **Public Sharing** — Generate share links, public note page without login
- **Dashboard** — Weekly activity chart, top tags, AI usage stats

## Setup

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux

pip install -r requirements.txt
pip install email-validator

cp env.example .env           # Add your ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000

### Environment Variables (.env)
```
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=sk-ant-...
DB_PATH=peblo.db
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | Create account |
| POST | /auth/login | Login |
| GET | /notes | List notes (search, filter) |
| POST | /notes | Create note |
| PATCH | /notes/:id | Update note |
| DELETE | /notes/:id | Delete note |
| POST | /ai/generate-summary | AI summary + action items |
| POST | /shared/generate/:id | Create share link |
| GET | /shared/:shareId | Public note page |
| GET | /insights | Dashboard data |

## Sample AI Response
```json
{
  "summary": "Weekly project planning discussion covering Q2 goals",
  "action_items": ["Prepare UI mockups", "Review API structure"],
  "suggested_title": "Sprint Planning — Q2 2026"
}
```

## Database Schema
```sql
users (id, name, email, password_hash, created_at)
notes (id, user_id, title, content, archived, share_id, is_public,
       ai_summary, ai_action_items, ai_suggested_title, ai_used_count,
       created_at, updated_at)
tags (id, user_id, name)
note_tags (note_id, tag_id)
activity_log (id, user_id, action, note_id, created_at)
```

## Tech Stack Decisions
- **SQLite** — zero-config, easy to migrate to Postgres
- **Claude Haiku** — fast and cost-effective for summarization
- **Next.js App Router** — modern React with server/client separation
- **JWT** — stateless auth, 7-day expiry
- **Debounced auto-save** — 800ms delay prevents excessive API calls
