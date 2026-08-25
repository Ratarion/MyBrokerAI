from pydantic import BaseModel, Field


class BrokerageAccount(BaseModel):
    account_id: str | None = None
    broker: str
    name: str | None = None
    balance: float | None = None
    currency: str = "RUB"


class PortfolioAsset(BaseModel):
    ticker: str
    name: str | None = None
    quantity: float = 0
    price: float | None = None
    average_price: float | None = None
    currency: str | None = None
    weight: float | None = None
    unrealized_pnl: float | None = None


class MarketSnapshot(BaseModel):
    imoex: float | None = None
    imoex_change_percent: float | None = None


class PortfolioSnapshot(BaseModel):
    portfolio_id: str | None = None
    portfolio_name: str = "Основной"
    total_value: float | None = None
    currency: str = "RUB"
    cash: float | None = None
    total_return_percent: float | None = None
    assets: list[PortfolioAsset] = Field(default_factory=list)
    brokerage_accounts: list[BrokerageAccount] = Field(default_factory=list)
    market: MarketSnapshot | None = None


class AdvisorRequest(BaseModel):
    question: str = "Автоматически проанализируй мой инвестиционный портфель для Dashboard."
    portfolio: PortfolioSnapshot


class RiskItem(BaseModel):
    type: str
    severity: str
    description: str


class AdvisorResponse(BaseModel):
    summary: str
    risk_level: int = Field(ge=1, le=10)
    diversification_score: int | None = Field(default=None, ge=0, le=100)
    risks: list[RiskItem] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    facts: list[str] = Field(default_factory=list)
    disclaimer: str
