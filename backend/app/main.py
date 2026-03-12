import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import webhooks, reviews

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Code Review",
    description="GitHub PR webhook receiver powered by Claude AI",
    version="1.0.0",
)

# CORS – allow the React frontend (served on port 3000 in dev, port 80 in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    logger.info("Initialising database …")
    init_db()
    logger.info("Database ready.")


app.include_router(webhooks.router)
app.include_router(reviews.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/")
def root():
    return {
        "name": "AI Code Review API",
        "docs": "/docs",
        "health": "/health",
        "webhook": "/webhook/github",
    }
