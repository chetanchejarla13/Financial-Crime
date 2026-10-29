"""
FCIS AI Investigation Service
-----------------------------
Integrates server-side AI reasoning for financial crime inquiries.
Keeps all provider credentials securely on the backend (never exposed to React).
Grounded strictly in actual case telemetry, victim statements, and evidence artifacts.
Zero hallucinated/invented data.
"""

import os
import json
import base64
import urllib.request
import urllib.error
import uuid
from datetime import datetime, timezone
from backend.config import Config


class AIService:
    def __init__(self):
        pass

    def get_api_key(self) -> str:
        """Fetch API key from environment dynamically."""
        try:
            from dotenv import load_dotenv
            from pathlib import Path
            env_file = Path(__file__).resolve().parent.parent.parent / '.env'
            if env_file.exists():
                load_dotenv(dotenv_path=env_file, override=True)
        except Exception:
            pass
        return (os.getenv('AI_API_KEY') or Config.AI_API_KEY or '').strip()

    def get_model(self) -> str:
        """Fetch AI model name from environment dynamically."""
        return (os.getenv('AI_MODEL') or Config.AI_MODEL or 'gemini-3.1-flash-lite').strip()

    def is_configured(self) -> bool:
        """Returns True if external AI provider credentials are configured."""
        return bool(self.get_api_key())

    def analyze_investigation_query(
        self,
        case: dict,
        query: str,
        investigation: dict = None,
        evidence_list: list = None,
        uploaded_files: list = None,
        conversation_history: list = None,
    ) -> dict:
        """
        Analyzes the investigator's prompt grounded in real case telemetry and evidence.
        Returns a structured dictionary:
        {
            "success": True/False,
            "status_code": 200/400/401/429/503/504,
            "response": "...",
            "case_id": "...",
            "message_id": "..."
        }
        """
        # Validate query
        if not query or not query.strip():
            return {
                "success": False,
                "status_code": 400,
                "error": "Query message cannot be empty."
            }

        api_key = self.get_api_key()

        # If AI API key is not configured, return clear error without fake AI answer
        if not api_key:
            return {
                "success": False,
                "status_code": 503,
                "error": "AI service is not configured"
            }

        # Validate case
        if not case or not isinstance(case, dict):
            return {
                "success": False,
                "status_code": 404,
                "error": "Case information is required."
            }

        message_id = f"msg_{uuid.uuid4().hex[:12]}"
        case_code = case.get("case_id", f"FCIS-{case.get('id', 0):04d}")
        amount_str = f"{case.get('currency', 'USD')} {case.get('transaction_amount', 0):,.2f}" if case.get('transaction_amount') else "N/A"
        victim = case.get("victim_name") or "Reporting Party"
        scam = case.get("scam_type") or "Financial Crime"
        description = case.get("description") or "No incident narrative provided."
        notes = case.get("evidence_notes") or "No primary evidence notes logged."
        status = case.get("status") or "received"

        prior_findings = "None recorded yet."
        if investigation and investigation.get("findings"):
            prior_findings = str(investigation.get("findings"))
        elif investigation and investigation.get("ai_analysis"):
            prior_findings = str(investigation.get("ai_analysis"))

        # Combine evidence metadata
        all_evidence = []
        if evidence_list:
            all_evidence.extend(evidence_list)
        if uploaded_files:
            all_evidence.extend(uploaded_files)

        evidence_names = [e.get("original_name") or e.get("filename") or str(e) for e in all_evidence]
        evidence_str = ", ".join([f"`{n}`" for n in evidence_names]) if evidence_names else "None attached"

        # Evidence content extraction and attachment processing
        evidence_text_blocks = []
        inline_parts = []

        for item in all_evidence:
            fname = item.get("filename")
            orig_name = item.get("original_name") or fname
            if not fname:
                continue

            fpath = os.path.join(Config.UPLOAD_FOLDER, fname)
            if not os.path.exists(fpath):
                continue

            ext = fname.rsplit(".", 1)[-1].lower() if "." in fname else ""

            # Text-readable documents: extract available text
            if ext in ["txt", "csv", "log", "json"]:
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read(4000)
                        evidence_text_blocks.append(f"\n--- ATTACHED EVIDENCE TEXT CONTENT ({orig_name}) ---\n{content}\n-----------------------------------------------------\n")
                except Exception:
                    evidence_text_blocks.append(f"\nThe file '{orig_name}' was uploaded successfully, but its contents could not be analyzed by the AI.\n")

            # Images and PDFs: pass as inline binary data if under 4MB
            elif ext in ["png", "jpg", "jpeg", "webp", "pdf"]:
                try:
                    fsize = os.path.getsize(fpath)
                    if fsize <= 4 * 1024 * 1024:
                        with open(fpath, "rb") as f:
                            b64_data = base64.b64encode(f.read()).decode("utf-8")
                        mime_map = {
                            "png": "image/png",
                            "jpg": "image/jpeg",
                            "jpeg": "image/jpeg",
                            "webp": "image/webp",
                            "pdf": "application/pdf"
                        }
                        inline_parts.append({
                            "inlineData": {
                                "mimeType": mime_map.get(ext, "application/octet-stream"),
                                "data": b64_data
                            }
                        })
                        evidence_text_blocks.append(f"\n[Attached Evidence Document/Media Verified and Loaded for Analysis: {orig_name}]\n")
                    else:
                        evidence_text_blocks.append(f"\nThe file '{orig_name}' was uploaded successfully, but its contents could not be analyzed by the AI (exceeds size limit).\n")
                except Exception:
                    evidence_text_blocks.append(f"\nThe file '{orig_name}' was uploaded successfully, but its contents could not be analyzed by the AI.\n")
            else:
                evidence_text_blocks.append(f"\nThe file '{orig_name}' was uploaded successfully, but its contents could not be analyzed by the AI.\n")

        # System prompt focused on financial crime investigation assistance
        system_context = (
            "You are the senior forensic investigator and AI investigation assistant in the Financial Crime Investigation System (FCIS).\n\n"
            "Operational Mandate & Rules:\n"
            "- You assist the investigator with objective, evidence-based financial crime analysis.\n"
            "- Analyze the provided case information and evidence carefully.\n"
            "- Identify potentially suspicious patterns, anomalies, and modus operandi.\n"
            "- Summarize relevant evidence and highlight inconsistencies or unusual details.\n"
            "- Suggest constructive investigation questions and next evidentiary steps.\n"
            "- Explain your reasoning clearly and logically.\n"
            "- Carefully distinguish verified evidence from unverified assumptions or allegations.\n"
            "- NEVER invent evidence, transaction amounts, names, or events not present in the provided case dossier.\n"
            "- NEVER claim something is confirmed when the provided evidence does not establish it.\n"
            "- You are an investigation assistant, not the final decision-maker. Do not accuse any person or entity without verified supporting evidence.\n\n"
            "=== ACTIVE CASE DOSSIER ===\n"
            f"- Case Identifier: {case_code}\n"
            f"- Case Title: {case.get('title', 'Untitled')}\n"
            f"- Scheme Classification: {scam}\n"
            f"- Victim / Reporting Party: {victim}\n"
            f"- Disputed Transaction Value: {amount_str}\n"
            f"- Currency: {case.get('currency', 'USD')}\n"
            f"- Incident Narrative: {description}\n"
            f"- Evidence Notes: {notes}\n"
            f"- Current Case Status: {status}\n"
            f"- Prior Investigation Findings: {prior_findings}\n"
            f"- Attached Evidence Manifest: {evidence_str}\n"
        )

        evidence_section = "".join(evidence_text_blocks)
        user_prompt_text = f"{system_context}\n{evidence_section}\nInvestigator Question: {query}"

        parts = [{"text": user_prompt_text}]
        for inp in inline_parts:
            parts.append(inp)

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": parts
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024,
            }
        }

        # Model candidates
        preferred_model = self.get_model()
        model_candidates = [preferred_model]
        for fallback in ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest']:
            if fallback not in model_candidates:
                model_candidates.append(fallback)

        last_error = "Unable to process the investigation request."
        last_status = 500

        for model in model_candidates:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )

                # 15s timeout to prevent hanging
                with urllib.request.urlopen(req, timeout=15) as resp:
                    if resp.status == 200:
                        resp_data = json.loads(resp.read().decode('utf-8'))
                        candidates = resp_data.get('candidates', [])
                        if candidates:
                            parts_out = candidates[0].get('content', {}).get('parts', [])
                            if parts_out:
                                ai_text = parts_out[0].get('text', '').strip()
                                return {
                                    "success": True,
                                    "status_code": 200,
                                    "response": ai_text,
                                    "case_id": case.get("id"),
                                    "case_code": case_code,
                                    "message_id": message_id,
                                    "model_used": model,
                                    "timestamp": datetime.now(timezone.utc).isoformat(),
                                }
            except urllib.error.HTTPError as http_err:
                error_body = ""
                try:
                    error_body = http_err.read().decode('utf-8')
                except Exception:
                    pass

                # If 400 (e.g. malformed inline binary file) and inline_parts were included, retry with text-only prompt
                if http_err.code == 400 and inline_parts:
                    try:
                        fallback_text = f"{user_prompt_text}\n[Notice: The file was uploaded successfully, but its contents could not be analyzed by the AI.]"
                        fallback_payload = {
                            "contents": [{"role": "user", "parts": [{"text": fallback_text}]}],
                            "generationConfig": payload["generationConfig"]
                        }
                        req_fallback = urllib.request.Request(
                            url,
                            data=json.dumps(fallback_payload).encode('utf-8'),
                            headers={'Content-Type': 'application/json'},
                            method='POST'
                        )
                        with urllib.request.urlopen(req_fallback, timeout=15) as resp_fb:
                            if resp_fb.status == 200:
                                fb_data = json.loads(resp_fb.read().decode('utf-8'))
                                candidates = fb_data.get('candidates', [])
                                if candidates:
                                    parts_out = candidates[0].get('content', {}).get('parts', [])
                                    if parts_out:
                                        return {
                                            "success": True,
                                            "status_code": 200,
                                            "response": parts_out[0].get('text', '').strip(),
                                            "case_id": case.get("id"),
                                            "case_code": case_code,
                                            "message_id": message_id,
                                            "model_used": model,
                                            "timestamp": datetime.now(timezone.utc).isoformat(),
                                        }
                    except Exception:
                        pass

                # If 404 (model retired), continue to next candidate
                if http_err.code == 404:
                    last_error = "Configured AI model is not supported."
                    last_status = 404
                    continue

                # If 400 or 403 API key invalid
                if http_err.code in [400, 403] and ("API_KEY_INVALID" in error_body or "API key not valid" in error_body):
                    return {
                        "success": False,
                        "status_code": 401,
                        "error": "AI authentication failed. Invalid API key."
                    }

                # If 429 quota/rate limit exceeded
                if http_err.code == 429:
                    return {
                        "success": False,
                        "status_code": 429,
                        "error": "AI service quota or rate limit exceeded. Please try again shortly."
                    }

                # If 503 / 500
                if http_err.code in [500, 502, 503]:
                    last_error = "AI service is temporarily unavailable."
                    last_status = 503
                    continue

                last_error = f"AI service request failed (HTTP {http_err.code})."
                last_status = http_err.code

            except urllib.error.URLError:
                return {
                    "success": False,
                    "status_code": 504,
                    "error": "AI service is temporarily unavailable or timed out."
                }
            except TimeoutError:
                return {
                    "success": False,
                    "status_code": 504,
                    "error": "AI service request timed out."
                }
            except Exception as e:
                last_error = "Unable to process the investigation request."
                last_status = 500

        return {
            "success": False,
            "status_code": last_status,
            "error": last_error
        }


ai_service = AIService()
