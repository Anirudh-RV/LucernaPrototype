"""
stakeholder_views.py
--------------------
Two-phase OTP login endpoint for stakeholders.

Step 1: POST with { phone } → generates + sends OTP
Step 2: POST with { phone, otp } → verifies OTP, returns stakeholder JWT
"""

import json
import logging

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from contracts.models import StakeholderContractAccess
from .stakeholder_services import (
    find_stakeholder_by_email,
    generate_stakeholder_jwt,
    issue_otp,
    send_otp_email,
    verify_otp,
)

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name="dispatch")
class StakeholderLoginView(View):
    """
    Passwordless OTP login for stakeholders.

    Phase 1 — Request OTP:
        POST { "email": "stakeholder@example.com" }
        → Sends OTP to stakeholder's email, returns email_hint

    Phase 2 — Verify OTP:
        POST { "email": "stakeholder@example.com", "otp": "482913" }
        → Returns stakeholder JWT + stakeholder profile
    """

    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON."}, status=400)

        email_input = (body.get("email") or "").strip().lower()
        otp = (body.get("otp") or "").strip()

        if not email_input:
            return JsonResponse(
                {"error": "'email' is required."},
                status=400,
            )

        # ── Resolve stakeholder ──────────────────────────────────────────
        stakeholder = find_stakeholder_by_email(email_input)
        if not stakeholder:
            return JsonResponse(
                {"error": "Could not verify identity. Please check your email address."},
                status=403,
            )

        # email is exactly the input since that's what was matched
        email = email_input

        # ── Phase 2: Verify OTP ──────────────────────────────────────────
        if otp:
            if not verify_otp(email, otp):
                return JsonResponse(
                    {"error": "Invalid or expired OTP. Please request a new one."},
                    status=400,
                )

            # Generate stakeholder JWT
            token = generate_stakeholder_jwt(stakeholder, email)

            return JsonResponse({
                "verified": True,
                "stakeholder": {
                    "id": str(stakeholder.id),
                    "name": stakeholder.name,
                    "email": email,
                    "stakeholder_type": stakeholder.stakeholder_type,
                },
                "token": token,
            })

        # ── Phase 1: Request OTP ─────────────────────────────────────────
        otp_code = issue_otp(email)

        sent = send_otp_email(email, stakeholder.name, otp_code)
        if not sent:
            return JsonResponse(
                {"error": "Failed to send verification email. Please try again."},
                status=500,
            )

        return JsonResponse({
            "detail": "OTP sent to your registered email.",
            "email_hint": email,
        })
