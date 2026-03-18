"""
stakeholders/agent_auth_views.py
─────────────────────────────────
Two unauthenticated endpoints consumed by the Bolna AI agent:

  POST /api/agent/send-otp/
      body: { "phone": "+14155551234", "contract_id": "USAF-B65B2E07" }
      → finds stakeholder by phone, verifies contract access,
        sends OTP email via Brevo, stores OTP in Django cache

  POST /api/agent/verify-otp/
      body: { "phone": "+14155551234", "contract_id": "USAF-B65B2E07", "otp": "481920" }
      → validates OTP, returns full contract row + editable column definitions
"""

from __future__ import annotations
import os
import logging
import random
import string

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from contracts.models import ColumnType, TableDefinition
from contracts.schema_utils import SchemaUtils

from contracts.models import Stakeholder, StakeholderContractAccess

logger = logging.getLogger(__name__)

# ─── Tunables ────────────────────────────────────────────────────────────────

OTP_LENGTH      = 6          # digits
OTP_TTL_SECONDS = 10 * 60    # 10 minutes
OTP_CACHE_PREFIX = "agent_otp"

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _otp_cache_key(stakeholder_id: str, contract_id: str) -> str:
    return f"{OTP_CACHE_PREFIX}:{stakeholder_id}:{contract_id}"


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def _normalize_phone(phone: str) -> str:
    """Strip spaces/dashes for loose matching."""
    return phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")


def _find_stakeholder_by_phone(phone: str) -> Stakeholder | None:
    """
    Match on normalized phone. Tries exact match first, then normalized.
    """
    normalized = _normalize_phone(phone)
    # Exact match
    qs = Stakeholder.objects.filter(phone=phone).select_related("contract_access")
    if qs.exists():
        return qs.first()
    # Normalized match — fetch all and compare (phone list is small)
    for s in Stakeholder.objects.select_related("contract_access").all():
        if _normalize_phone(s.phone) == normalized:
            return s
    return None


def _find_contract_row(stakeholder: Stakeholder, contract_id_value: str) -> tuple[TableDefinition | None, dict | None]:
    """
    Search all table definitions in the stakeholder's project for a row
    whose contract_id column matches `contract_id_value`.

    Returns (table_definition, row_dict) or (None, None).
    """
    tables = TableDefinition.objects.filter(
        project=stakeholder.project, is_created=True
    ).prefetch_related("columns")

    for td in tables:
        # Find the contract_id column(s)
        contract_id_cols = [
            c.column_name for c in td.columns.all()
            if c.column_type == ColumnType.CONTRACT_ID
        ]
        if not contract_id_cols:
            continue

        # Fetch rows matching this contract_id value
        try:
            rows = SchemaUtils.fetch_rows(
                td,
                filters={contract_id_cols[0]: contract_id_value}
            )
        except Exception:
            continue

        if rows:
            return td, rows[0]

    return None, None


def _stakeholder_can_access_row(stakeholder: Stakeholder, row_db_id: int) -> bool:
    """
    Check StakeholderContractAccess for this stakeholder.
    """
    try:
        access = stakeholder.contract_access
    except StakeholderContractAccess.DoesNotExist:
        return False

    if access.all_contracts:
        return True

    return row_db_id in (access.contract_row_ids or [])


def _send_otp_email_brevo(to_email: str, to_name: str, otp: str) -> bool:
    """
    Send OTP via Brevo (formerly Sendinblue) transactional email API.
    Requires BREVO_API_KEY and BREVO_FROM_EMAIL in settings.
    """
    api_key    = os.getenv("BREVO_API_KEY", "")
    from_email = os.getenv("BREVO_FROM_EMAIL", "admin@zhuhana.com")
    from_name  = os.getenv("BREVO_FROM_NAME", "Lucerna")

    if not api_key:
        logger.error("BREVO_API_KEY not configured")
        return False

    payload = {
        "sender":     {"name": from_name, "email": from_email},
        "to":         [{"email": to_email, "name": to_name}],
        "subject":    "Your verification code",
        "htmlContent": f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#1a1a2e">Your verification code</h2>
              <p>Use the code below to verify your identity with our contract assistant.</p>
              <div style="
                font-size:36px;font-weight:700;letter-spacing:8px;
                color:#1565c0;padding:24px;background:#f0f4ff;
                border-radius:8px;text-align:center;margin:24px 0
              ">{otp}</div>
              <p style="color:#666;font-size:13px">
                This code expires in 10 minutes. Do not share it with anyone.
              </p>
            </div>
        """,
    }

    try:
        resp = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={
                "api-key":      api_key,
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        if resp.status_code not in (200, 201):
            logger.error("Brevo error %s: %s", resp.status_code, resp.text)
            return False
        return True
    except requests.RequestException as exc:
        logger.exception("Brevo request failed: %s", exc)
        return False


def _serialize_contract_row(td: TableDefinition, row: dict) -> dict:
    """
    Return the contract row data annotated with column metadata,
    split into readable_fields and editable_fields so the agent
    knows what it can and cannot change.
    """
    AUTO_TYPES   = {ColumnType.UUID, ColumnType.CONTRACT_ID}
    SYSTEM_COLS  = {"id", "created_at", "updated_at"}

    columns_meta = {c.column_name: c for c in td.columns.all()}

    readable_fields  = {}
    editable_fields  = {}

    for col_name, value in row.items():
        if col_name in SYSTEM_COLS:
            continue
        col = columns_meta.get(col_name)
        if col is None:
            continue

        entry = {
            "value":        value,
            "display_name": col.display_name,
            "type":         col.column_type,
        }

        if col.column_type in AUTO_TYPES:
            readable_fields[col_name] = entry
        else:
            editable_fields[col_name] = entry

    return {
        "row_id":          row.get("id"),
        "contract_id":     next(
            (row[c] for c, meta in columns_meta.items() if meta.column_type == ColumnType.CONTRACT_ID),
            None,
        ),
        "table_name":      td.name,
        "readable_fields": readable_fields,
        "editable_fields": editable_fields,
        # ISO timestamps for context
        "created_at":      str(row.get("created_at", "")),
        "updated_at":      str(row.get("updated_at", "")),
    }


# ─── Views ────────────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name="dispatch")
class SendOTPView(View):
    """
    POST /api/agent/send-otp/

    Request body:
        {
            "phone":       "+14155551234",
            "contract_id": "USAF-B65B2E07"
        }

    Success (200):
        {
            "detail": "OTP sent to stakeholder email.",
            "email_hint": "j***@example.com"   ← masked for voice readback
        }

    Errors:
        400 — missing fields
        403 — stakeholder not found or no access to this contract
        500 — email send failure
    """

    def post(self, request):
        import json
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        phone       = (body.get("phone") or "").strip()
        contract_id = (body.get("contract_id") or "").strip()

        if not phone or not contract_id:
            return JsonResponse(
                {"error": "'phone' and 'contract_id' are required."},
                status=400,
            )

        # 1. Resolve stakeholder
        stakeholder = _find_stakeholder_by_phone(phone)
        if not stakeholder:
            # Deliberately vague — don't reveal whether phone exists
            return JsonResponse(
                {"error": "Could not verify identity. Please check your details."},
                status=403,
            )

        if not stakeholder.email:
            return JsonResponse(
                {"error": "No email address on file for this stakeholder."},
                status=403,
            )

        # 2. Find the contract row
        td, row = _find_contract_row(stakeholder, contract_id)
        if row is None:
            return JsonResponse(
                {"error": "Contract not found or not accessible."},
                status=403,
            )

        # 3. Check access
        if not _stakeholder_can_access_row(stakeholder, row["id"]):
            return JsonResponse(
                {"error": "Contract not found or not accessible."},
                status=403,
            )

        # 4. Generate + cache OTP
        otp      = _generate_otp()
        cache_key = _otp_cache_key(str(stakeholder.id), contract_id)
        cache.set(cache_key, otp, timeout=OTP_TTL_SECONDS)

        # 5. Send email
        sent = _send_otp_email_brevo(stakeholder.email, stakeholder.name, otp)
        if not sent:
            cache.delete(cache_key)
            return JsonResponse(
                {"error": "Failed to send verification email. Please try again."},
                status=500,
            )

        # Mask email for voice readback: j***@example.com
        parts      = stakeholder.email.split("@")
        email_hint = parts[0][0] + "***@" + parts[1] if len(parts) == 2 else "***"

        return JsonResponse({
            "detail":     "OTP sent to stakeholder email.",
            "email_hint": email_hint,
        })


@method_decorator(csrf_exempt, name="dispatch")
class VerifyOTPView(View):
    """
    POST /api/agent/verify-otp/

    Request body:
        {
            "phone":       "+14155551234",
            "contract_id": "USAF-B65B2E07",
            "otp":         "481920"
        }

    Success (200):
        {
            "verified": true,
            "stakeholder": { "id": "...", "name": "...", "email": "..." },
            "contract": {
                "row_id": 1,
                "contract_id": "USAF-B65B2E07",
                "table_name": "Contracts",
                "readable_fields": { ... },
                "editable_fields": { ... },
                "created_at": "...",
                "updated_at": "..."
            }
        }

    Errors:
        400 — missing fields / invalid OTP
        403 — stakeholder / contract not found or no access
    """

    def post(self, request):
        import json
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        phone       = (body.get("phone") or "").strip()
        contract_id = (body.get("contract_id") or "").strip()
        otp         = (body.get("otp") or "").strip()

        if not phone or not contract_id or not otp:
            return JsonResponse(
                {"error": "'phone', 'contract_id', and 'otp' are required."},
                status=400,
            )

        # 1. Resolve stakeholder (same as SendOTP)
        stakeholder = _find_stakeholder_by_phone(phone)
        if not stakeholder:
            return JsonResponse(
                {"error": "Could not verify identity."},
                status=403,
            )

        # 2. Validate OTP from cache
        cache_key   = _otp_cache_key(str(stakeholder.id), contract_id)
        cached_otp  = cache.get(cache_key)

        if cached_otp is None:
            return JsonResponse(
                {"error": "OTP expired or not found. Please request a new one."},
                status=400,
            )

        if cached_otp != otp:
            return JsonResponse(
                {"error": "Invalid OTP."},
                status=400,
            )

        # 3. Re-verify contract access (defence in depth)
        td, row = _find_contract_row(stakeholder, contract_id)
        if row is None or not _stakeholder_can_access_row(stakeholder, row["id"]):
            return JsonResponse(
                {"error": "Contract not found or not accessible."},
                status=403,
            )

        # 4. Consume the OTP — one-time use
        cache.delete(cache_key)

        # 5. Build response
        return JsonResponse({
            "verified": True,
            "stakeholder": {
                "id":    str(stakeholder.id),
                "name":  stakeholder.name,
                "email": stakeholder.email,
                "phone": stakeholder.phone,
            },
            "contract": _serialize_contract_row(td, row),
        })