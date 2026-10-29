"""
FCIS Cases Routes (SQLite Backed)
---------------------------------
Endpoints:
- GET  /api/cases
- POST /api/cases
- GET  /api/cases/<case_id>
- PUT  /api/cases/<case_id>
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models import Case

cases_bp = Blueprint('cases', __name__, url_prefix='/api/cases')


def _find_case(case_id_param):
    """Helper to locate a case by primary key ID or case_id string (e.g. FCIS-0001)."""
    case = None
    if str(case_id_param).isdigit():
        case = Case.query.get(int(case_id_param))
    if not case:
        case = Case.query.filter_by(case_id=str(case_id_param)).first()
    return case


@cases_bp.route('', methods=['GET'])
def list_cases():
    """List all financial crime cases from SQLite. Returns [] when no cases exist."""
    cases = Case.query.order_by(Case.id.asc()).all()
    return jsonify([c.to_dict() for c in cases]), 200


@cases_bp.route('', methods=['POST'])
def create_case():
    """Create a new financial crime case in SQLite."""
    data = request.get_json(silent=True) or {}
    
    title = (data.get('case_title') or data.get('title') or '').strip()
    scam_type = (data.get('case_type') or data.get('scam_type') or '').strip()

    if not title or not scam_type:
        return jsonify({
            "success": False,
            "error": "Case title and Scam Type are required."
        }), 400

    try:
        # Determine next unique case ID
        last_case = Case.query.order_by(Case.id.desc()).first()
        next_num = (last_case.id + 1) if last_case else 1
        case_code = f"FCIS-{next_num:04d}"

        amount = 0.0
        raw_amt = data.get('transaction_amount') or data.get('amount')
        if raw_amt is not None and str(raw_amt).strip() != '':
            try:
                amount = float(str(raw_amt).replace(',', ''))
            except (ValueError, TypeError):
                amount = 0.0

        new_case = Case(
            case_id=case_code,
            case_title=title,
            case_type=scam_type,
            complainant_name=(data.get('complainant_name') or data.get('victim_name') or 'Anonymous').strip(),
            transaction_amount=amount,
            currency=(data.get('currency') or 'USD').strip(),
            incident_description=(data.get('incident_description') or data.get('description') or '').strip(),
            evidence_notes=(data.get('evidence_notes') or '').strip(),
            status=(data.get('status') or 'received').strip(),
            date_received=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        db.session.add(new_case)
        db.session.commit()
        return jsonify(new_case.to_dict()), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Unable to create case. Please verify input data."
        }), 500


@cases_bp.route('/<case_id>', methods=['GET'])
def get_case(case_id):
    """Retrieve detailed information for a specific case from SQLite."""
    case = _find_case(case_id)
    if not case:
        return jsonify({
            "success": False,
            "error": f"Case '{case_id}' not found."
        }), 404
    return jsonify(case.to_dict()), 200


@cases_bp.route('/<case_id>', methods=['PUT'])
def update_case(case_id):
    """Update fields of an existing case in SQLite."""
    case = _find_case(case_id)
    if not case:
        return jsonify({
            "success": False,
            "error": f"Case '{case_id}' not found."
        }), 404

    data = request.get_json(silent=True) or {}
    try:
        if 'status' in data:
            case.status = data['status']
        if 'case_title' in data or 'title' in data:
            case.case_title = data.get('case_title') or data.get('title')
        if 'case_type' in data or 'scam_type' in data:
            case.case_type = data.get('case_type') or data.get('scam_type')
        if 'complainant_name' in data or 'victim_name' in data:
            case.complainant_name = data.get('complainant_name') or data.get('victim_name')
        if 'incident_description' in data or 'description' in data:
            case.incident_description = data.get('incident_description') or data.get('description')
        if 'evidence_notes' in data:
            case.evidence_notes = data['evidence_notes']
        if 'transaction_amount' in data:
            try:
                case.transaction_amount = float(str(data['transaction_amount']).replace(',', ''))
            except Exception:
                pass
        if 'currency' in data:
            case.currency = data['currency']

        case.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify(case.to_dict()), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Failed to update case in database."
        }), 500
