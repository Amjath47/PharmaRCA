from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from database import engine, Base, SessionLocal
from models.deviation import Deviation
from models.investigation import Investigation
from models.capa import CAPA

from schemas.deviation import DeviationCreate, DeviationResponse
from schemas.investigation import (
    InvestigationCreate,
    InvestigationResponse,
)
from schemas.capa import CAPACreate, CAPAResponse
from schemas.rca import RCARequest, RCAResult
from schemas.document import DocumentRCAResponse

from services.rca_agent import run_rca
from services.document_reader import extract_document_text


Base.metadata.create_all(bind=engine)

app = FastAPI(title="AIVOA RCA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DocumentTextAnalysisRequest(BaseModel):
    incident_text: str
    analysis_method: str = "5 Whys"


@app.get("/")
def home():
    return {"message": "AIVOA RCA Backend is running!"}


@app.get("/health")
def health():
    return {"status": "healthy"}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/deviations", response_model=DeviationResponse)
def create_deviation(
    deviation: DeviationCreate,
    db: Session = Depends(get_db),
):
    new_deviation = Deviation(**deviation.model_dump())

    db.add(new_deviation)
    db.commit()
    db.refresh(new_deviation)

    return new_deviation


@app.get("/deviations", response_model=List[DeviationResponse])
def get_deviations(db: Session = Depends(get_db)):
    return db.query(Deviation).order_by(Deviation.id.desc()).all()


@app.post(
    "/investigations",
    response_model=InvestigationResponse,
)
def create_investigation(
    investigation: InvestigationCreate,
    db: Session = Depends(get_db),
):
    deviation = (
        db.query(Deviation)
        .filter(Deviation.id == investigation.deviation_id)
        .first()
    )

    if not deviation:
        raise HTTPException(
            status_code=404,
            detail="Deviation not found",
        )

    new_investigation = Investigation(
        **investigation.model_dump()
    )

    db.add(new_investigation)
    db.commit()
    db.refresh(new_investigation)

    return new_investigation


@app.get(
    "/investigations",
    response_model=List[InvestigationResponse],
)
def get_investigations(
    deviation_id: int = None,
    db: Session = Depends(get_db),
):
    query = db.query(Investigation)

    if deviation_id is not None:
        query = query.filter(
            Investigation.deviation_id == deviation_id
        )

    return query.order_by(Investigation.id.desc()).all()


@app.post("/capas", response_model=CAPAResponse)
def create_capa(
    capa: CAPACreate,
    db: Session = Depends(get_db),
):
    investigation = (
        db.query(Investigation)
        .filter(Investigation.id == capa.investigation_id)
        .first()
    )

    if not investigation:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found",
        )

    if capa.action_type.lower() not in [
        "corrective",
        "preventive",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Action type must be corrective or preventive",
        )

    new_capa = CAPA(
        investigation_id=capa.investigation_id,
        action_type=capa.action_type.lower(),
        description=capa.description,
        justification=capa.justification,
    )

    db.add(new_capa)
    db.commit()
    db.refresh(new_capa)

    return new_capa


@app.get("/capas", response_model=List[CAPAResponse])
def get_capas(
    investigation_id: int = None,
    db: Session = Depends(get_db),
):
    query = db.query(CAPA)

    if investigation_id is not None:
        query = query.filter(
            CAPA.investigation_id == investigation_id
        )

    return query.order_by(CAPA.id.desc()).all()


@app.post("/rca/analyze", response_model=RCAResult)
def analyze_rca(request: RCARequest):
    if not request.incident_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Incident information cannot be empty",
        )

    if request.analysis_method not in ["5 Whys", "Fishbone"]:
        raise HTTPException(
            status_code=400,
            detail="Analysis method must be 5 Whys or Fishbone",
        )

    try:
        return run_rca(
            incident_text=request.incident_text,
            analysis_method=request.analysis_method,
        )
    except Exception as error:
        print("RCA analysis error:", str(error))
        raise HTTPException(
            status_code=502,
            detail="AI analysis failed. Check the backend terminal.",
        )


@app.post("/documents/extract")
async def extract_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select a file.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File size must not exceed 10 MB.",
        )

    try:
        extracted_text = extract_document_text(
            file.filename,
            content,
        )

        return {
            "filename": file.filename,
            "extracted_text": extracted_text,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )
    except Exception as error:
        print("Document extraction error:", str(error))
        raise HTTPException(
            status_code=400,
            detail="Could not read the document. Check its format.",
        )


@app.post(
    "/documents/analyze",
    response_model=DocumentRCAResponse,
)
async def analyze_document(
    file: UploadFile = File(...),
    analysis_method: str = Form("5 Whys"),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select a document.",
        )

    if analysis_method not in ["5 Whys", "Fishbone"]:
        raise HTTPException(
            status_code=400,
            detail="Choose 5 Whys or Fishbone.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File size must not exceed 10 MB.",
        )

    try:
        extracted_text = extract_document_text(
            file.filename,
            content,
        )

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text was found in the document.",
            )

        print("Extracted text length:", len(extracted_text))
        print("Extracted text preview:", repr(extracted_text[:500]))

        analysis = run_rca(
            incident_text=extracted_text,
            analysis_method=analysis_method,
        )

        return {
            "filename": file.filename,
            "extracted_text": extracted_text,
            "analysis_method": analysis_method,
            "analysis": analysis,
        }

    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )
    except Exception as error:
        print("Document RCA error:", str(error))
        raise HTTPException(
            status_code=502,
            detail="Document analysis failed. Check the backend terminal.",
        )

@app.post(
    "/documents/analyze-text",
    response_model=DocumentRCAResponse,
)
def analyze_pasted_text(request: DocumentTextAnalysisRequest):
    incident_text = request.incident_text.strip()

    if not incident_text:
        raise HTTPException(
            status_code=400,
            detail="Please paste the incident information.",
        )

    if len(incident_text.encode("utf-8")) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Pasted text must not exceed 10 MB.",
        )

    if request.analysis_method not in ["5 Whys", "Fishbone"]:
        raise HTTPException(
            status_code=400,
            detail="Choose 5 Whys or Fishbone.",
        )

    try:
        analysis = run_rca(
            incident_text=incident_text,
            analysis_method=request.analysis_method,
        )

        return {
            "filename": "Pasted incident text",
            "extracted_text": incident_text,
            "analysis_method": request.analysis_method,
            "analysis": analysis,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )
    except Exception as error:
        print("Pasted-text RCA error:", str(error))
        raise HTTPException(
            status_code=502,
            detail="Text analysis failed. Check the backend terminal.",
        )