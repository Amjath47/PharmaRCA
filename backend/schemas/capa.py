from pydantic import BaseModel
from typing import Optional


class CAPACreate(BaseModel):
    investigation_id: int
    action_type: str
    description: str
    justification: Optional[str] = None


class CAPAResponse(CAPACreate):
    id: int
    status: str

    class Config:
        from_attributes = True