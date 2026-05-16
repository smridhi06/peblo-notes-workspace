import os
import json
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import get_db
from auth_utils import get_current_user

router = APIRouter()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

async def call_claude(prompt: str) -> str:
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured")

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": "claude-3-haiku-20240307",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(ANTHROPIC_URL, headers=headers, json=body)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="AI service error")
        data = resp.json()
        return data["content"][0]["text"]

class GenerateRequest(BaseModel):
    note_id: str

@router.post("/generate-summary")
async def generate_summary(
    body: GenerateRequest,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db),
):
    note = db.execute(
        "SELECT id, title, content FROM notes WHERE id = ? AND user_id = ?",
        (body.note_id, user_id)
    ).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    content = note["content"] or ""
    if len(content.strip()) < 20:
        raise HTTPException(status_code=400, detail="Note content too short for AI analysis")

    prompt = f"""Analyze this note and respond with ONLY a JSON object (no markdown, no explanation):

Title: {note['title']}
Content: {content}

Respond with exactly this JSON structure:
{{
  "summary": "2-3 sentence summary of the note",
  "action_items": ["action item 1", "action item 2"],
  "suggested_title": "A better title for this note"
}}"""

    try:
        raw = await call_claude(prompt)
        # Clean up response
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI returned invalid response")

    # Save to database
    db.execute("""
        UPDATE notes SET
            ai_summary = ?,
            ai_action_items = ?,
            ai_suggested_title = ?,
            ai_used_count = ai_used_count + 1,
            updated_at = datetime('now')
        WHERE id = ?
    """, (
        result.get("summary", ""),
        json.dumps(result.get("action_items", [])),
        result.get("suggested_title", ""),
        body.note_id,
    ))
    db.commit()

    return {
        "summary": result.get("summary", ""),
        "action_items": result.get("action_items", []),
        "suggested_title": result.get("suggested_title", ""),
    }
