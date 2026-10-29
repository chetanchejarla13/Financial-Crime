"""
FCIS SQLAlchemy Models
----------------------
Database models for Users, Cases, Evidence, Investigations, and Reports.
Uses SQLite instance/fcis.db as requested.
"""

import json
from datetime import datetime, timezone
from backend.database import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='investigator')
    name = db.Column(db.String(100), default='Investigator')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Case(db.Model):
    __tablename__ = 'cases'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    case_title = db.Column(db.String(255), nullable=False)
    case_type = db.Column(db.String(100), nullable=False)
    complainant_name = db.Column(db.String(255), nullable=False)
    transaction_amount = db.Column(db.Float, default=0.0)
    currency = db.Column(db.String(10), default='USD')
    incident_description = db.Column(db.Text)
    evidence_notes = db.Column(db.Text)
    status = db.Column(db.String(50), default='received')
    date_received = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    evidence = db.relationship('Evidence', backref='case_ref', lazy=True, cascade='all, delete-orphan')
    investigation = db.relationship('Investigation', backref='case_ref', uselist=False, lazy=True, cascade='all, delete-orphan')
    report = db.relationship('Report', backref='case_ref', uselist=False, lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "case_title": self.case_title,
            "title": self.case_title,  # Frontend alias
            "case_type": self.case_type,
            "scam_type": self.case_type,  # Frontend alias
            "complainant_name": self.complainant_name,
            "victim_name": self.complainant_name,  # Frontend alias
            "transaction_amount": self.transaction_amount,
            "currency": self.currency,
            "incident_description": self.incident_description,
            "description": self.incident_description,  # Frontend alias
            "evidence_notes": self.evidence_notes,
            "status": self.status,
            "date_received": self.date_received.isoformat() if self.date_received else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Evidence(db.Model):
    __tablename__ = 'evidence'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.id', ondelete='CASCADE'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255))
    file_type = db.Column(db.String(100))
    file_size = db.Column(db.Integer, default=0)
    file_path = db.Column(db.String(500))
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "case_id": self.case_id,
            "filename": self.filename,
            "original_name": self.original_name or self.filename,
            "file_type": self.file_type or "document",
            "file_size": self.file_size or 0,
            "size": self.file_size or 0,  # Frontend alias
            "file_path": self.file_path,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None
        }


class Investigation(db.Model):
    __tablename__ = 'investigations'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)
    status = db.Column(db.String(50), default='Not Started')
    findings = db.Column(db.Text)
    ai_analysis = db.Column(db.Text)
    important_details = db.Column(db.Text)  # JSON-encoded dict
    suspicious_indicators = db.Column(db.Text)  # JSON-encoded list
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self, case_code=None):
        details = {}
        if self.important_details:
            try:
                details = json.loads(self.important_details)
            except Exception:
                details = {}

        indicators = []
        if self.suspicious_indicators:
            try:
                indicators = json.loads(self.suspicious_indicators)
            except Exception:
                indicators = []

        return {
            "id": self.id,
            "case_id": self.case_id,
            "case_code": case_code or f"FCIS-{self.case_id:04d}",
            "status": self.status,
            "findings": self.findings,
            "ai_analysis": self.ai_analysis,
            "important_details": details,
            "extracted_details": details,
            "suspicious_indicators": indicators,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.Integer, db.ForeignKey('cases.id', ondelete='CASCADE'), unique=True, nullable=False, index=True)
    report_id = db.Column(db.String(50), nullable=False)
    report_content = db.Column(db.Text)  # JSON-encoded dossier or markdown text
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        content = {}
        if self.report_content:
            try:
                content = json.loads(self.report_content)
            except Exception:
                content = {"content": self.report_content}

        return {
            "id": self.id,
            "case_id": self.case_id,
            "report_id": self.report_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            **content
        }
