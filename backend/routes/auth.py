"""
FCIS Authentication Routes (SQLite Backed)
------------------------------------------
Endpoints:
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/logout
"""

import re
import uuid
from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models import User
from backend.security import hash_password, verify_password

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password')

    # Validation
    if not email or not password:
        return jsonify({
            "success": False,
            "error": "Email and password are required."
        }), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({
            "success": False,
            "error": "Invalid email format."
        }), 400

    if confirm_password is not None and password != confirm_password:
        return jsonify({
            "success": False,
            "error": "Passwords do not match."
        }), 400

    # Query SQLite database for existing user
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({
            "success": False,
            "error": "An account with this email already exists."
        }), 409

    # Create new user in SQLite
    hashed = hash_password(password)
    user = User(
        email=email,
        password_hash=hashed,
        name=email.split('@')[0].capitalize(),
        role='investigator'
    )
    try:
        db.session.add(user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Unable to create the account. Please try again."
        }), 500

    return jsonify({
        "success": True,
        "message": "Admin account created successfully",
        "email": user.email,
        "user": {
            "id": user.id,
            "email": user.email
        }
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({
            "success": False,
            "error": "Email and password are required."
        }), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({
            "success": False,
            "error": "Invalid email or password."
        }), 401

    if not verify_password(user.password_hash, password):
        return jsonify({
            "success": False,
            "error": "Invalid email or password."
        }), 401

    # Generate session / bearer token
    token = f"fcis_tok_{user.id}_{uuid.uuid4().hex}"

    return jsonify({
        "success": True,
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email
        }
    }), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    }), 200
