from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Union


class RCARequest(BaseModel):
    incident_text: str
    analysis_method: str = "5 Whys"


class CAPARecommendation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: str
    reason: str = ""
    relevance: str = ""


class RootCauseHypothesis(BaseModel):
    model_config = ConfigDict(extra="ignore")

    category: str = ""
    cause: str = ""


class RCAResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str = ""
    facts: List[str] = Field(default_factory=list)
    fishbone: Dict[str, List[str]] = Field(default_factory=dict)

    hypotheses: Union[
        List[Union[str, RootCauseHypothesis]],
        Dict[str, List[str]]
    ] = Field(default_factory=list)
    missingEvidence: List[str] = Field(default_factory=list)

    correctiveActions: List[CAPARecommendation] = Field(default_factory=list)
    preventiveActions: List[CAPARecommendation] = Field(default_factory=list)

    evidenceLimitations: Union[str, List[str]] = Field(default_factory=list)

    why_analysis: List[str] = Field(default_factory=list)
    fishbone_categories: List[str] = Field(default_factory=list)
    potential_root_causes: List[str] = Field(default_factory=list)
    contributing_factors: List[str] = Field(default_factory=list)
    missing_evidence: List[str] = Field(default_factory=list)
    capa_recommendations: List[CAPARecommendation] = Field(default_factory=list)
    evidence_limitations: List[str] = Field(default_factory=list)