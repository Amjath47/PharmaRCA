from pydantic import BaseModel


class DocumentRCAResponse(BaseModel):
    filename: str
    extracted_text: str
    analysis_method: str
    analysis: dict
