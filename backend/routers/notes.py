import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from database import get_db
from auth_utils import get_current_user

router = APIRouter()

class NoteCreate(BaseModel):
    title: str = "Untitled"
    content: str = ""
    tags: List[str] = []

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    archived: Optional[bool] = None
    is_public: Optional[bool] = None

def get_note_with_tags(db, note_id: str, user_id: str = None):
    if user_id:
        note = db.execute(
            "SELECT * FROM notes WHERE id = ? AND user_id = ?",
            (note_id, user_id)
        ).fetchone()
    else:
        note = db.execute(
            "SELECT * FROM notes WHERE id = ? AND is_public = 1",
            (note_id,)
        ).fetchone()

    if not note:
        return None

    note = dict(note)

    tags = db.execute("""
        SELECT t.name FROM tags t
        JOIN note_tags nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?
    """, (note_id,)).fetchall()
    note["tags"] = [t["name"] for t in tags]

    if note.get("ai_action_items"):
        try:
            note["ai_action_items"] = json.loads(note["ai_action_items"])
        except Exception:
            note["ai_action_items"] = []

    return note

def ensure_tags(db, user_id: str, tag_names: List[str]) -> List[str]:
    tag_ids = []
    for name in tag_names:
        name = name.strip().lower()
        if not name:
            continue
        existing = db.execute(
            "SELECT id FROM tags WHERE user_id = ? AND name = ?",
            (user_id, name)
        ).fetchone()
        if existing:
            tag_ids.append(existing["id"])
        else:
            tag_id = str(uuid.uuid4())
            db.execute(
                "INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)",
                (tag_id, user_id, name)
            )
            tag_ids.append(tag_id)
    return tag_ids

def log_activity(db, user_id: str, action: str, note_id: str = None):
    db.execute(
        "INSERT INTO activity_log (id, user_id, action, note_id) VALUES (?, ?, ?, ?)",
        (str(uuid.uuid4()), user_id, action, note_id)
    )

@router.get("")
def list_notes(
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    archived: bool = Query(False),
    user_id: str = Depends(get_current_user),
    db=Depends(get_db),
):
    query = """
        SELECT DISTINCT n.* FROM notes n
        LEFT JOIN note_tags nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        WHERE n.user_id = ? AND n.archived = ?
    """
    params = [user_id, int(archived)]

    if search:
        query += " AND (n.title LIKE ? OR n.content LIKE ?)"
        params += [f"%{search}%", f"%{search}%"]

    if tag:
        query += " AND t.name = ?"
        params.append(tag.lower())

    query += " ORDER BY n.updated_at DESC"

    notes = db.execute(query, params).fetchall()
    result = []
    for note in notes:
        n = get_note_with_tags(db, note["id"], user_id)
        if n:
            result.append(n)
    return result

@router.post("")
def create_note(body: NoteCreate, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    note_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    db.execute(
        """INSERT INTO notes (id, user_id, title, content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (note_id, user_id, body.title, body.content, now, now),
    )
    if body.tags:
        tag_ids = ensure_tags(db, user_id, body.tags)
        for tag_id in tag_ids:
            db.execute(
                "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)",
                (note_id, tag_id)
            )
    log_activity(db, user_id, "created", note_id)
    db.commit()
    return get_note_with_tags(db, note_id, user_id)

@router.get("/{note_id}")
def get_note(note_id: str, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    note = get_note_with_tags(db, note_id, user_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.patch("/{note_id}")
def update_note(
    note_id: str,
    body: NoteUpdate,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db),
):
    note = db.execute(
        "SELECT id FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id)
    ).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    updates = []
    params = []
    if body.title is not None:
        updates.append("title = ?")
        params.append(body.title)
    if body.content is not None:
        updates.append("content = ?")
        params.append(body.content)
    if body.archived is not None:
        updates.append("archived = ?")
        params.append(int(body.archived))
    if body.is_public is not None:
        updates.append("is_public = ?")
        params.append(int(body.is_public))
        if body.is_public:
            share_id = str(uuid.uuid4())[:8]
            updates.append("share_id = ?")
            params.append(share_id)

    updates.append("updated_at = ?")
    params.append(datetime.utcnow().isoformat())
    params.append(note_id)

    db.execute(f"UPDATE notes SET {', '.join(updates)} WHERE id = ?", params)

    if body.tags is not None:
        db.execute("DELETE FROM note_tags WHERE note_id = ?", (note_id,))
        if body.tags:
            tag_ids = ensure_tags(db, user_id, body.tags)
            for tag_id in tag_ids:
                db.execute(
                    "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)",
                    (note_id, tag_id)
                )

    log_activity(db, user_id, "updated", note_id)
    db.commit()
    return get_note_with_tags(db, note_id, user_id)

@router.delete("/{note_id}")
def delete_note(note_id: str, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    note = db.execute(
        "SELECT id FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id)
    ).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    log_activity(db, user_id, "deleted", note_id)
    db.commit()
    return {"message": "Note deleted"}

@router.get("/tags/all")
def get_all_tags(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    tags = db.execute(
        "SELECT name FROM tags WHERE user_id = ? ORDER BY name", (user_id,)
    ).fetchall()
    return [t["name"] for t in tags]
