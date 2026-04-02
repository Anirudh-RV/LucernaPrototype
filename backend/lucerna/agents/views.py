"""
stakeholders/agent_auth_views.py
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

OTP_LENGTH       = 6
OTP_TTL_SECONDS  = 10 * 60
OTP_CACHE_PREFIX = "agent_otp"

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _otp_cache_key(stakeholder_id: str, contract_id: str) -> str:
    return f"{OTP_CACHE_PREFIX}:{stakeholder_id}:{contract_id}"


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def _normalize_phone(phone: str) -> str:
    return phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")


def _find_stakeholder_by_phone(phone: str) -> Stakeholder | None:
    normalized = _normalize_phone(phone)
    qs = Stakeholder.objects.filter(phone=phone)
    if qs.exists():
        return qs.first()
    for s in Stakeholder.objects.all():
        if _normalize_phone(s.phone) == normalized:
            return s
    return None


def _find_contract_row(
    stakeholder: Stakeholder, contract_id_value: str
) -> tuple[TableDefinition | None, dict | None, StakeholderContractAccess | None]:
    access_records = StakeholderContractAccess.objects.filter(
        stakeholder=stakeholder
    ).select_related("table_definition__project").prefetch_related("table_definition__columns")

    tables_to_search: list[tuple[TableDefinition, StakeholderContractAccess]] = []

    for access in access_records:
        if access.table_definition is not None:
            if not access.table_definition.is_created:
                continue
            if access.all_contracts:
                project_tables = TableDefinition.objects.filter(
                    project=access.table_definition.project, is_created=True  # ✅
                ).prefetch_related("columns")
                for td in project_tables:
                    tables_to_search.append((td, access))
            else:
                tables_to_search.append((access.table_definition, access))
        else:
            # table_definition is null — no project to derive, skip
            continue

    seen_ids: set = set()
    unique_tables = []
    for td, access in tables_to_search:
        if td.id not in seen_ids:
            seen_ids.add(td.id)
            unique_tables.append((td, access))

    for td, access in unique_tables:
        contract_id_cols = [
            c.column_name for c in td.columns.all()
            if c.column_type == ColumnType.CONTRACT_ID
        ]
        if not contract_id_cols:
            continue
        try:
            rows = SchemaUtils.fetch_rows(td, filters={contract_id_cols[0]: contract_id_value})
        except Exception:
            continue
        if rows:
            return td, rows[0], access

    return None, None, None


def _stakeholder_can_access_row(
    stakeholder: Stakeholder, row_db_id: int, access: StakeholderContractAccess | None
) -> bool:
    """
    Use the already-resolved access record from _find_contract_row.
    Falls back to querying if not provided.
    """
    if access is None:
        # Try to find any access record for this stakeholder
        access = StakeholderContractAccess.objects.filter(
            stakeholder=stakeholder
        ).first()

    if access is None:
        return False

    if access.all_contracts:
        return True

    return row_db_id in (access.contract_row_ids or [])


def _send_otp_email_brevo(to_email: str, to_name: str, otp: str) -> bool:
    api_key    = os.getenv("BREVO_API_KEY", "")
    from_email = os.getenv("BREVO_FROM_EMAIL", "admin@zhuhana.com")
    from_name  = os.getenv("BREVO_FROM_NAME", "Lucerna")

    if not api_key:
        logger.error("BREVO_API_KEY not configured")
        return False

    payload = {
        "sender":      {"name": from_name, "email": from_email},
        "to":          [{"email": to_email, "name": to_name}],
        "subject":     "Your verification code",
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
            headers={"api-key": api_key, "Content-Type": "application/json"},
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
    AUTO_TYPES  = {ColumnType.UUID, ColumnType.CONTRACT_ID}
    SYSTEM_COLS = {"id", "created_at", "updated_at"}

    columns_meta = {c.column_name: c for c in td.columns.all()}

    readable_fields: dict = {}
    editable_fields: dict = {}

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
        "created_at":      str(row.get("created_at", "")),
        "updated_at":      str(row.get("updated_at", "")),
    }


# ─── Views ────────────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name="dispatch")
class SendOTPView(View):
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
            return JsonResponse(
                {"error": "Could not verify identity. Please check your details."},
                status=403,
            )

        # 2. Find the contract row + access record
        td, row, access = _find_contract_row(stakeholder, contract_id)
        if row is None:
            return JsonResponse(
                {"error": "Contract not found or not accessible."},
                status=403,
            )

        # 3. Check row-level access using the resolved access record
        if not _stakeholder_can_access_row(stakeholder, row["id"], access):
            return JsonResponse(
                {"error": "Contract not accessible."},
                status=403,
            )

        # 4. Get email from the access record (email now lives on StakeholderContractAccess)
        email = access.email if access else ""
        if not email:
            return JsonResponse(
                {"error": "No email address on file for this contract."},
                status=403,
            )

        # 5. Generate + cache OTP
        otp       = _generate_otp()
        cache_key = _otp_cache_key(str(stakeholder.id), contract_id)
        cache.set(cache_key, otp, timeout=OTP_TTL_SECONDS)

        # 6. Send email
        sent = _send_otp_email_brevo(email, stakeholder.name, otp)
        if not sent:
            cache.delete(cache_key)
            return JsonResponse(
                {"error": "Failed to send verification email. Please try again."},
                status=500,
            )

        parts      = email.split("@")
        email_hint = parts[0][0] + "***@" + parts[1] if len(parts) == 2 else "***"

        return JsonResponse({
            "detail":     "OTP sent to stakeholder email.",
            "email_hint": email_hint,
        })


@method_decorator(csrf_exempt, name="dispatch")
class VerifyOTPView(View):
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

        # 1. Resolve stakeholder
        stakeholder = _find_stakeholder_by_phone(phone)
        if not stakeholder:
            return JsonResponse(
                {"error": "Could not verify identity."},
                status=403,
            )

        # 2. Validate OTP
        cache_key  = _otp_cache_key(str(stakeholder.id), contract_id)
        cached_otp = cache.get(cache_key)

        if cached_otp is None:
            return JsonResponse(
                {"error": "OTP expired or not found. Please request a new one."},
                status=400,
            )
        if cached_otp != otp:
            return JsonResponse({"error": "Invalid OTP."}, status=400)

        # 3. Re-verify contract access (defence in depth) — now returns 3-tuple
        td, row, access = _find_contract_row(stakeholder, contract_id)
        if row is None or not _stakeholder_can_access_row(stakeholder, row["id"], access):
            return JsonResponse(
                {"error": "Contract not found or not accessible."},
                status=403,
            )

        # 4. Consume OTP — one-time use
        cache.delete(cache_key)

        # 5. Build response — email comes from access record, not stakeholder
        email = access.email if access else ""

        return JsonResponse({
            "verified": True,
            "stakeholder": {
                "id":    str(stakeholder.id),
                "name":  stakeholder.name,
                "email": email,
                "phone": stakeholder.phone,
            },
            "contract": _serialize_contract_row(td, row),
        })