from pydantic import BaseModel
from typing import Optional


class InvestigationCreate(BaseModel):
    deviation_id: int
    analysis_method: str = "5 Whys"
    problem_statement: Optional[str] = None
    why_analysis: Optional[str] = None
    root_cause: Optional[str] = None
    contributing_factors: Optional[str] = None
    missing_evidence: Optional[str] = None


class InvestigationResponse(InvestigationCreate):
    id: int
    status: str

    class Config:
        from_attributes = True
