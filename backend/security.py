"""
FCIS Security Utilities
-----------------------
Password hashing and verification helpers using PBKDF2-HMAC-SHA256 with timing-safe comparison.
"""

import hashlib
import secrets


def hash_password(password: str, salt: str = None) -> str:
    """Hash password securely using PBKDF2 with SHA-256 and salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"


def verify_password(stored_hash: str, password: str) -> bool:
    """Verify password against stored hash with timing-safe comparison."""
    if not stored_hash or not password:
        return False
    if '$' in stored_hash:
        salt, key_hex = stored_hash.split('$', 1)
        test_key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return secrets.compare_digest(test_key.hex(), key_hex)
    else:
        test_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        return secrets.compare_digest(test_hash, stored_hash)
