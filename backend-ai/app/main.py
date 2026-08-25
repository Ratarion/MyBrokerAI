from fastapi import FastAPI

from app.routers.advisor import router as advisor_router

app = FastAPI(
    title="MyBrokerAI - AI Investor Advisor",
    version="1.0.0",
)

app.include_router(advisor_router)
