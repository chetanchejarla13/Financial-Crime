"""
Financial Crime Investigation System (FCIS) - Flask API
-------------------------------------------------------
Delegates to the modular backend package in backend/
Entrypoint: python app.py or python flask_backend_template.py
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv(override=True)
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_DEBUG', '1') == '1'
    print(f"Financial Crime Investigation System - Flask API running at http://localhost:{port}")
    app.run(host=host, port=port, debug=debug)
