from fastapi import APIRouter, Depends
from database import get_db
from auth_utils import get_current_user

router = APIRouter()

@router.get("")
def get_insights(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    # Total notes
    total = db.execute(
        "SELECT COUNT(*) as c FROM notes WHERE user_id = ? AND archived = 0",
        (user_id,)
    ).fetchone()["c"]

    # Archived notes
    archived = db.execute(
        "SELECT COUNT(*) as c FROM notes WHERE user_id = ? AND archived = 1",
        (user_id,)
    ).fetchone()["c"]

    # Recently edited (last 5)
    recent = db.execute("""
        SELECT id, title, updated_at FROM notes
        WHERE user_id = ? AND archived = 0
        ORDER BY updated_at DESC LIMIT 5
    """, (user_id,)).fetchall()

    # Most used tags (top 10)
    top_tags = db.execute("""
        SELECT t.name, COUNT(nt.note_id) as count
        FROM tags t
        JOIN note_tags nt ON t.id = nt.tag_id
        JOIN notes n ON nt.note_id = n.id
        WHERE t.user_id = ? AND n.archived = 0
        GROUP BY t.name
        ORDER BY count DESC
        LIMIT 10
    """, (user_id,)).fetchall()

    # AI usage stats
    ai_stats = db.execute("""
        SELECT
            COUNT(*) as notes_with_ai,
            SUM(ai_used_count) as total_ai_calls
        FROM notes
        WHERE user_id = ? AND ai_used_count > 0
    """, (user_id,)).fetchone()

    # Weekly activity (last 7 days)
    weekly = db.execute("""
        SELECT
            date(created_at) as day,
            COUNT(*) as count
        FROM activity_log
        WHERE user_id = ?
            AND created_at >= date('now', '-7 days')
        GROUP BY date(created_at)
        ORDER BY day ASC
    """, (user_id,)).fetchall()

    # Notes created this week
    notes_this_week = db.execute("""
        SELECT COUNT(*) as c FROM notes
        WHERE user_id = ? AND created_at >= date('now', '-7 days')
    """, (user_id,)).fetchone()["c"]

    return {
        "total_notes": total,
        "archived_notes": archived,
        "notes_this_week": notes_this_week,
        "recently_edited": [dict(r) for r in recent],
        "top_tags": [{"name": t["name"], "count": t["count"]} for t in top_tags],
        "ai_stats": {
            "notes_with_ai": ai_stats["notes_with_ai"] or 0,
            "total_ai_calls": ai_stats["total_ai_calls"] or 0,
        },
        "weekly_activity": [{"day": w["day"], "count": w["count"]} for w in weekly],
    }
