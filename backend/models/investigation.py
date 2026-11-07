from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

from database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)

    deviation_id = Column(
        Integer,
        ForeignKey("deviations.id"),
        nullable=False
    )

    analysis_method = Column(String(50), default="5 Whys")
    problem_statement = Column(Text, nullable=True)
    why_analysis = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    contributing_factors = Column(Text, nullable=True)
    missing_evidence = Column(Text, nullable=True)

    status = Column(String(50), default="Draft")
    created_at = Column(DateTime, server_default=func.now())
