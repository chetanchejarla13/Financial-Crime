"""
FCIS Evidence Upload Routes (SQLite Backed)
-------------------------------------------
Endpoints:
- POST /api/cases/<case_id>/evidence
- GET  /api/cases/<case_id>/evidence
"""

import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from backend.config import Config
from backend.database import db
from backend.models import Case, Evidence

evidence_bp = Blueprint('evidence', __name__, url_prefix='/api/cases')


def _find_case(case_id_param):
    """Helper to locate a case by primary key ID or case_id string."""
    case = None
    if str(case_id_param).isdigit():
        case = Case.query.get(int(case_id_param))
    if not case:
        case = Case.query.filter_by(case_id=str(case_id_param)).first()
    return case


def get_file_type_category(filename: str) -> str:
    ext = (filename or '').rsplit('.', 1)[-1].lower()
    if ext in Config.ALLOWED_EXTENSIONS['images']:
        return 'Image'
    elif ext in ['pdf']:
        return 'PDF'
    elif ext in Config.ALLOWED_EXTENSIONS['documents']:
        return 'Document'
    elif ext in Config.ALLOWED_EXTENSIONS['data']:
        return 'Data'
    return 'File'


def is_allowed_file(filename: str) -> bool:
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[-1].lower()
    if ext in Config.BLOCKED_EXTENSIONS:
        return False
    all_allowed = (
        Config.ALLOWED_EXTENSIONS['images']
        | Config.ALLOWED_EXTENSIONS['documents']
        | Config.ALLOWED_EXTENSIONS['data']
    )
    return ext in all_allowed


@evidence_bp.route('/<case_id>/evidence', methods=['POST'])
def upload_evidence(case_id):
    """
    Upload evidence files associated with a case and store metadata in SQLite.
    Accepts multipart/form-data with any file field name ('files', 'file', etc.).
    """
    case = _find_case(case_id)
    if not case:
        return jsonify({
            "success": False,
            "error": f"Case '{case_id}' not found."
        }), 404

    # Ensure uploads directory exists
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    uploaded_files = []
    if request.files:
        for k in request.files:
            uploaded_files.extend(request.files.getlist(k))

    if not uploaded_files or len(uploaded_files) == 0:
        return jsonify({
            "success": False,
            "error": "No files provided in upload payload."
        }), 400

    saved_evidence = []
    rejected_files = []

    for f in uploaded_files:
        if not f or not f.filename:
            continue

        raw_filename = f.filename
        if not is_allowed_file(raw_filename):
            rejected_files.append({
                "filename": raw_filename,
                "reason": "File type not supported. Allowed: PNG, JPG, WEBP, PDF, DOC, DOCX, TXT, CSV, XLSX"
            })
            continue

        clean_name = secure_filename(raw_filename)
        safe_prefix = f"case_{case.id}_{uuid.uuid4().hex[:8]}"
        saved_filename = f"{safe_prefix}_{clean_name}"
        save_path = os.path.join(Config.UPLOAD_FOLDER, saved_filename)

        try:
            f.save(save_path)
            file_size = os.path.getsize(save_path) if os.path.exists(save_path) else 0

            evidence_record = Evidence(
                case_id=case.id,
                filename=saved_filename,
                original_name=raw_filename,
                file_type=get_file_type_category(raw_filename),
                file_size=file_size,
                file_path=f"uploads/{saved_filename}",
                uploaded_at=datetime.now(timezone.utc)
            )

            db.session.add(evidence_record)
            db.session.commit()
            saved_evidence.append(evidence_record.to_dict())
        except Exception:
            db.session.rollback()
            rejected_files.append({
                "filename": raw_filename,
                "reason": "Failed to write file or record to database."
            })

    status_code = 201 if saved_evidence else 400
    return jsonify({
        "success": bool(saved_evidence),
        "case_id": case.id,
        "case_code": case.case_id,
        "uploaded_count": len(saved_evidence),
        "evidence": saved_evidence,
        "rejected": rejected_files,
    }), status_code


@evidence_bp.route('/<case_id>/evidence', methods=['GET'])
def list_case_evidence(case_id):
    """Retrieve all evidence files associated with a case from SQLite."""
    case = _find_case(case_id)
    if not case:
        return jsonify({
            "success": False,
            "error": f"Case '{case_id}' not found."
        }), 404

    evidence_records = Evidence.query.filter_by(case_id=case.id).order_by(Evidence.id.asc()).all()
    evidence_list = [e.to_dict() for e in evidence_records]

    return jsonify({
        "success": True,
        "case_id": case.id,
        "case_code": case.case_id,
        "evidence": evidence_list,
    }), 200
