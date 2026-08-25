from fastapi import FastAPI

from app.routers.advisor import router as advisor_router

app = FastAPI(
    title="MyBrokerAI - AI Investor Advisor",
    version="1.0.0",
)


@app.get("/health", tags=["System"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(advisor_router)
