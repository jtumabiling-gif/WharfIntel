# models.py
from sqlalchemy import Column, Integer, String, DateTime, JSON, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 🔌 ADD THIS LINE SO SQLALCHEMY RECOGNIZES THE COLUMNS YOU ADDED IN PGADMIN
    role = Column(String, default="commander")

    # --- PERSISTENT PROGRESS FIELDS ---
    money = Column(Float, default=200000.0)
    reputation = Column(Integer, default=50)
    
    # Stores list of active boosters with expiration times
    # Example: [{"id": "boost_radar", "expiresAt": "2026-05-12T14:30:00"}]
    active_boosters = Column(JSON, default=[])
    
    # Timestamp of the last time income was collected
    last_income_collection = Column(DateTime, default=datetime.utcnow)

    shipments = relationship("Shipment", back_populates="owner")

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    cargo_name = Column(String, index=True)
    weight_kg = Column(Integer)
    destination_country = Column(String)
    scale = Column(String) 
    category = Column(String, default="Standard") # 🔥 ADD THIS
    
    # STATUS: "Preparing", "Outbound", "Arrived", "Sheltered", "Failed"
    status = Column(String, default="Preparing")
    departure_time = Column(DateTime, default=datetime.utcnow)
    route_waypoints = Column(JSON, default=[])
    # 🔥 ADD THIS: Permanent authoritative cargo health tracking
    cargo_health = Column(Float, default=100.0)
    
    # --- CHAOS ENGINE & TWO-STRIKE SYSTEM ---
    total_duration_ms = Column(Float, default=432000000.0)
    storm_time = Column(DateTime, nullable=True)
    shelter_count = Column(Integer, default=0)
    storm_event_handled = Column(Boolean, default=False)

    owner = relationship("User", back_populates="shipments")

    # --- ADD THIS TO THE VERY BOTTOM OF models.py ---
class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    event_type = Column(String, index=True)  # e.g., "AUTH", "SYSTEM", "CLIMATE"
    description = Column(String)

class InstructorInvite(Base):
    __tablename__ = "instructor_invites"

    id = Column(Integer, primary_key=True, index=True)
    code_hash = Column(String(64), unique=True, index=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    redeemed_at = Column(DateTime, nullable=True)

class VesselScenario(Base):
    __tablename__ = "vessel_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False)
    configuration = Column(JSON, nullable=False)
    status = Column(String(20), default="DEPLOYED", nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    creator = relationship("User")
    assessments = relationship("SimulationAssessment", back_populates="scenario")

class SimulationAssessment(Base):
    __tablename__ = "simulation_assessments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    scenario_id = Column(Integer, ForeignKey("vessel_scenarios.id"), nullable=True, index=True)
    scenario_name = Column(String(160), nullable=False)
    score = Column(Integer, nullable=False)
    passed = Column(Boolean, nullable=False)
    final_health = Column(Float, nullable=False)
    time_seconds = Column(Float, nullable=False)
    max_docking_speed = Column(Float, nullable=False, default=0)
    max_heel_angle = Column(Float, nullable=False)
    collisions = Column(Integer, nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    student = relationship("User")
    scenario = relationship("VesselScenario", back_populates="assessments")