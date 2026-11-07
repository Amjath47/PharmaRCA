from pydantic import BaseModel
from typing import Optional


class DeviationCreate(BaseModel):
    title: str
    description: str
    department: Optional[str] = None
    severity: Optional[str] = None


class DeviationResponse(DeviationCreate):
    id: int
    status: str

    class Config:
        from_attributes = True
