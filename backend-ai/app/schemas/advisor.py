from pydantic import BaseModel, Field


class PortfolioAsset(BaseModel):
    ticker: str
    name: str | None = None
    quantity: float = 0
    price: float | None = None
    currency: str | None = None
    weight: float | None = None


class PortfolioSnapshot(BaseModel):
    portfolio_id: str | None = None
    total_value: float | None = None
    currency: str | None = None
    cash: float | None = None
    assets: list[PortfolioAsset] = Field(default_factory=list)


class AdvisorRequest(BaseModel):
    question: str = "Проанализируй мой инвестиционный портфель."
    portfolio: PortfolioSnapshot


class RiskItem(BaseModel):
    type: str
    severity: str
    description: str


class AdvisorResponse(BaseModel):
    summary: str
    risk_level: int = Field(ge=1, le=10)
    risks: list[RiskItem] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    disclaimer: str
