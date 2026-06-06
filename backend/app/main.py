from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, pdfs, qa, questions, summarize
from app.config import settings
from app.db import database


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    description="AI Study Companion - Exam-ready preparation from your notes",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(pdfs.router, prefix="/api/pdfs", tags=["pdfs"])
app.include_router(summarize.router, prefix="/api/summarize", tags=["summarize"])
app.include_router(qa.router, prefix="/api/qa", tags=["qa"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }
