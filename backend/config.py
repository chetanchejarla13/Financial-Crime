import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory or backend directory
env_path = Path(__file__).resolve().parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'fcis_default_secret_key_2026')
    DEBUG = os.getenv('FLASK_DEBUG', '1') == '1'
    PORT = int(os.getenv('PORT', 5000))
    HOST = os.getenv('HOST', '0.0.0.0')

    # Paths
    BASE_DIR = Path(__file__).resolve().parent
    PROJECT_ROOT = BASE_DIR.parent
    INSTANCE_FOLDER = os.path.join(PROJECT_ROOT, 'instance')
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB limit

    # Database Configuration (SQLite)
    os.makedirs(INSTANCE_FOLDER, exist_ok=True)
    db_path = os.path.join(INSTANCE_FOLDER, 'fcis.db').replace('\\', '/')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', f"sqlite:///{db_path}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Allowed extensions
    ALLOWED_EXTENSIONS = {
        'images': {'png', 'jpg', 'jpeg', 'webp'},
        'documents': {'pdf', 'doc', 'docx', 'txt'},
        'data': {'csv', 'xlsx'},
    }
    
    # Blocked dangerous extensions
    BLOCKED_EXTENSIONS = {
        'exe', 'bat', 'cmd', 'sh', 'py', 'js', 'vbs', 'msi', 'dll', 'com', 'scr', 'ps1', 'jar'
    }

    # AI Configuration (Kept server-side only; never exposed to React)
    AI_API_KEY = os.getenv('AI_API_KEY', '')
    AI_MODEL = os.getenv('AI_MODEL', 'gemini-3.1-flash-lite')
