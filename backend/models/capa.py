from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

from database import Base


class CAPA(Base):
    __tablename__ = "capas"

    id = Column(Integer, primary_key=True, index=True)

    investigation_id = Column(
        Integer,
        ForeignKey("investigations.id"),
        nullable=False
    )

    action_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    justification = Column(Text, nullable=True)
    status = Column(String(50), default="Proposed")
    created_at = Column(DateTime, server_default=func.now())
