from datetime import date
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Sequence(Base):
    __tablename__ = "ir_sequences"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False, index=True)
    prefix = Column(String, default="")
    suffix = Column(String, default="")
    padding = Column(Integer, default=4)
    number_increment = Column(Integer, default=1)
    number_next = Column(Integer, default=1)
    use_date_range = Column(Boolean, default=False)

    ranges = relationship("SequenceDateRange", back_populates="sequence", cascade="all, delete-orphan")


class SequenceDateRange(Base):
    __tablename__ = "sequence_date_ranges"

    id = Column(Integer, primary_key=True, index=True)
    sequence_id = Column(Integer, ForeignKey("ir_sequences.id", ondelete="CASCADE"), nullable=False)
    date_from = Column(Date, nullable=False)
    date_to = Column(Date, nullable=False)
    number_next = Column(Integer, default=1)

    sequence = relationship("Sequence", back_populates="ranges")
