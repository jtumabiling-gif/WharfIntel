# app/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Grab the URL from .env
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./wharfintel_dev.db"

# The "Engine" that talks to the database
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)

# The "Session" we use to run queries
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# The Base class that our database tables will inherit from
Base = declarative_base()

# Helper function to open and close DB connections for each request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()