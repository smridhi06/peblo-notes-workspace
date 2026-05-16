import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from database import get_db
from auth_utils import hash_password, verify_password, create_token

router = APIRouter()

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/signup")
def signup(body: SignupRequest, db=Depends(get_db)):
    existing = db.execute(
        "SELECT id FROM users WHERE email = ?", (body.email,)
    ).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
        (user_id, body.name, body.email, hash_password(body.password)),
    )
    db.commit()
    token = create_token(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "name": body.name, "email": body.email},
    }

@router.post("/login")
def login(body: LoginRequest, db=Depends(get_db)):
    user = db.execute(
        "SELECT id, name, email, password_hash FROM users WHERE email = ?",
        (body.email,),
    ).fetchone()
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"])
    return {
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }

@router.get("/me")
def me(user_id: str = Depends(__import__("auth_utils").get_current_user), db=Depends(get_db)):
    user = db.execute(
        "SELECT id, name, email, created_at FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(user)
