"""
Financial Crime Investigation System (FCIS) - Backend Server
------------------------------------------------------------
Run with:
    python app.py
"""

import sys
import os

# Ensure backend package can be imported
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    print(f"Financial Crime Investigation System - Flask API running at http://localhost:{port}")
    app.run(host=host, port=port, debug=debug)
