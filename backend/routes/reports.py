"""
FCIS Report Routes (SQLite Backed)
----------------------------------
Endpoints:
- GET  /api/cases/<case_id>/report
- POST /api/cases/<case_id>/report

Compatibility routes for existing React frontend:
- GET  /api/reports/<case_id>
- POST /api/reports/<case_id>/generate
"""

import json
from datetime import datetime, timezone
from flask import Blueprint, jsonify
from backend.database import db
from backend.models import Case, Evidence, Investigation, Report

reports_bp = Blueprint('reports', __name__)


def _find_case(case_id_param):
    """Helper to locate a case by primary key ID or case_id string."""
    case = None
    if str(case_id_param).isdigit():
        case = Case.query.get(int(case_id_param))
    if not case:
        case = Case.query.filter_by(case_id=str(case_id_param)).first()
    return case


@reports_bp.route('/api/cases/<case_id>/report', methods=['GET'])
@reports_bp.route('/api/reports/<case_id>', methods=['GET'])
def get_case_report(case_id):
    """Retrieve existing final investigation report from SQLite."""
    case = _find_case(case_id)
    if not case:
        return jsonify({
            "success": False,
            "error": f"Case '{case_id}' not found."
        }), 404

    report = Report.query.filter_by(case_id=case.id).first()
    if not report:
        return jsonify({
            "success": False,
            "error": "No investigation report has been generated for this case yet."
        }), 404

    return jsonify(report.to_dict()), 200


@reports_bp.route('/api/cases/<case_id>/report', methods=['POST'])
@reports_bp.route('/api/reports/<case_id>/generate', methods=['POST'])
def generate_case_report(case_id):
    """Generate final report and save to SQLite."""
    case = _find_case(case_id)
    if not case:
        return jsonify({
            "success": False,
            "error": f"Case '{case_id}' not found."
        }), 404

    inv = Investigation.query.filter_by(case_id=case.id).first()
    evidence_records = Evidence.query.filter_by(case_id=case.id).all()
    
    amount_str = f"{case.currency} {case.transaction_amount:,.2f}" if case.transaction_amount else "N/A"
    victim = case.complainant_name or 'Reporting Party'
    scam = case.case_type or 'Financial Crime'

    findings_text = inv.findings if inv and inv.findings else (
        f"Direct administrative incident review completed. "
        f"Documented loss stands at {amount_str} attributed to {scam} operational tactics."
    )

    evidence_summary = (
        f"Evidentiary packet contains {len(evidence_records)} verified artifact(s). "
        f"Primary case notes: \"{case.evidence_notes or 'None recorded'}\"."
    )

    executive_summary = (
        f"Formal investigation brief regarding {scam} incident affecting complainant {victim}. "
        f"Total calculated financial impact stands at {amount_str}. "
        f"Evidentiary telemetry correlates reported diversion with unauthorized accounts."
    )

    recommendations = (
        "1. Issue formal law enforcement referral with evidentiary packet.\n"
        "2. Transmit notification to recipient financial institution for asset freezing / recovery.\n"
        "3. Archive telemetry signatures in internal fraud intelligence database."
    )

    report_id_str = f"REP-{case.id:04d}"

    report_payload = {
        "report_id": report_id_str,
        "case_id": case.id,
        "case_code": case.case_id,
        "case_title": case.case_title,
        "title": f"Investigation Dossier: {case.case_title}",
        "scam_type": scam,
        "victim_name": victim,
        "victim": victim,
        "complainant_name": victim,
        "transaction_amount": case.transaction_amount,
        "total_loss": case.transaction_amount,
        "currency": case.currency,
        "executive_summary": executive_summary,
        "findings": findings_text,
        "evidence_summary": evidence_summary,
        "recommendations": recommendations,
    }

    try:
        report = Report.query.filter_by(case_id=case.id).first()
        if not report:
            report = Report(case_id=case.id, report_id=report_id_str)
            db.session.add(report)

        report.report_id = report_id_str
        report.report_content = json.dumps(report_payload)
        report.updated_at = datetime.now(timezone.utc)

        # Mark case as completed in SQLite
        case.status = "completed"
        case.updated_at = datetime.now(timezone.utc)

        db.session.commit()
        return jsonify(report.to_dict()), 201

    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Failed to save generated report to database."
        }), 500
