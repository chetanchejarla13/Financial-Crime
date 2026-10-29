"""
FCIS Dashboard Metrics Routes (SQLite Backed)
---------------------------------------------
Endpoints:
- GET /api/dashboard
- GET /api/dashboard/stats
"""

from flask import Blueprint, jsonify
from backend.models import Case, Report

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/api/dashboard', methods=['GET'])
@dashboard_bp.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_metrics():
    """
    Returns real statistics computed dynamically from SQLite database.
    Returns 0 for all metrics when no cases exist.
    """
    total_cases = Case.query.count()
    under_inv = Case.query.filter(Case.status.in_(['investigating', 'under_investigation'])).count()
    completed = Case.query.filter_by(status='completed').count()
    reports = Report.query.count()

    stats = {
        "total_cases": total_cases,
        "cases_received": total_cases,
        "casesReceived": total_cases,
        "under_investigation": under_inv,
        "cases_under_investigation": under_inv,
        "casesUnderInvestigation": under_inv,
        "completed_investigations": completed,
        "completedInvestigations": completed,
        "reports_generated": reports,
        "reportsGenerated": reports,
    }
    return jsonify(stats), 200
