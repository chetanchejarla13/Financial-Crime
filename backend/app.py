"""
FCIS - Financial Crime Investigation System Backend (SQLite Edition)
-------------------------------------------------------------------
Architecture: React + Vite (Frontend) -> Flask REST API -> SQLite Database (instance/fcis.db)
"""

import os
import sys
from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS

# Add parent directory to path if running directly from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import Config
from backend.database import db
import backend.models
from backend.models import User
from backend.security import hash_password
from backend.routes.auth import auth_bp
from backend.routes.cases import cases_bp
from backend.routes.evidence import evidence_bp
from backend.routes.investigation import investigation_bp
from backend.routes.reports import reports_bp
from backend.routes.dashboard import dashboard_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for React frontend
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    )

    # Ensure instance and uploads directories exist
    os.makedirs(app.config.get('INSTANCE_FOLDER', 'instance'), exist_ok=True)
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)

    # Initialize SQLAlchemy with SQLite
    db.init_app(app)

    # Automatically initialize SQLite database tables
    with app.app_context():
        db.create_all()

        # Seed initial admin user if not present
        admin_email = 'chetanchejarla@fcri.net'
        if not User.query.filter_by(email=admin_email).first():
            admin = User(
                email=admin_email,
                password_hash=hash_password('chetan@2007'),
                name='Chetan Chejarla (Admin)',
                role='admin'
            )
            db.session.add(admin)
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()

    # ---------------- API Health & Root Verification ----------------
    @app.route('/api', methods=['GET'])
    @app.route('/api/', methods=['GET'])
    def api_root():
        """
        API Health verification endpoint.
        Returns {"status": "ok"} as required.
        """
        return jsonify({"status": "ok"}), 200

    @app.route('/api/health', methods=['GET'])
    def api_health():
        return jsonify({
            "status": "ok",
            "service": "Flask REST API (SQLite)",
            "system": "Financial Crime Investigation System"
        }), 200

    # ---------------- Register Blueprints ----------------
    app.register_blueprint(auth_bp)
    app.register_blueprint(cases_bp)
    app.register_blueprint(evidence_bp)
    app.register_blueprint(investigation_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(dashboard_bp)

    # ---------------- Consistent JSON Error Handlers ----------------
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({
            "success": False,
            "error": "Invalid request payload. Please verify your input."
        }), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({
            "success": False,
            "error": "Invalid email or password."
        }), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({
            "success": False,
            "error": "Access denied."
        }), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "success": False,
            "error": "Resource not found."
        }), 404

    @app.errorhandler(409)
    def conflict(e):
        return jsonify({
            "success": False,
            "error": "Resource conflict. An item with this identifier already exists."
        }), 409

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            "success": False,
            "error": "Unable to connect to the investigation server. Please try again."
        }), 500

    return app


app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    print(f"FCIS Flask API (SQLite) running at http://localhost:{port}")
    app.run(host=host, port=port, debug=debug)
