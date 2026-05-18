from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import auth, notes, ai, share, insights

app = FastAPI(title="Peblo Notes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://peblo-notes-workspace.vercel.app",
        "https://peblo-notes-workspace-p7n4fm5pp-smridhis-projects-2ccd97e6.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db()

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(notes.router, prefix="/notes", tags=["notes"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(share.router, prefix="/shared", tags=["share"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])

@app.get("/")
def root():
    return {"message": "Peblo Notes API running"}
