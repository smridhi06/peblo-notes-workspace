import uuid
import json
from fastapi import APIRouter, HTTPException, Depends
from database import get_db
from auth_utils import get_current_user

router = APIRouter()

@router.post("/generate/{note_id}")
def generate_share_link(
    note_id: str,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db),
):
    note = db.execute(
        "SELECT id, share_id FROM notes WHERE id = ? AND user_id = ?",
        (note_id, user_id)
    ).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    share_id = note["share_id"] or str(uuid.uuid4())[:8]
    db.execute(
        "UPDATE notes SET share_id = ?, is_public = 1 WHERE id = ?",
        (share_id, note_id)
    )
    db.commit()
    return {"share_id": share_id, "share_url": f"/shared/{share_id}"}

@router.delete("/revoke/{note_id}")
def revoke_share(
    note_id: str,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db),
):
    db.execute(
        "UPDATE notes SET share_id = NULL, is_public = 0 WHERE id = ? AND user_id = ?",
        (note_id, user_id)
    )
    db.commit()
    return {"message": "Share link revoked"}

@router.get("/{share_id}")
def get_shared_note(share_id: str, db=Depends(get_db)):
    note = db.execute(
        "SELECT * FROM notes WHERE share_id = ? AND is_public = 1",
        (share_id,)
    ).fetchone()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or not public")

    note = dict(note)

    tags = db.execute("""
        SELECT t.name FROM tags t
        JOIN note_tags nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?
    """, (note["id"],)).fetchall()
    note["tags"] = [t["name"] for t in tags]

    if note.get("ai_action_items"):
        try:
            note["ai_action_items"] = json.loads(note["ai_action_items"])
        except Exception:
            note["ai_action_items"] = []

    # Remove sensitive fields
    note.pop("user_id", None)
    note.pop("password_hash", None)

    return note
