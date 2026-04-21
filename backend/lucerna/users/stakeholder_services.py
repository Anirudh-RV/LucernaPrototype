"""
stakeholder_services.py
-----------------------
Shared OTP + JWT utilities for stakeholder authentication.
Keeps stakeholder auth completely separate from the User auth system.
"""

import os
import random
import string
import logging
from datetime import datetime, timedelta

import jwt
import requests
from django.core.cache import cache

from contracts.models import Stakeholder

logger = logging.getLogger(__name__)

# ─── Tunables ────────────────────────────────────────────────────────────────

OTP_LENGTH = 6
OTP_TTL_SECONDS = 10 * 60  # 10 minutes
OTP_CACHE_PREFIX = "stakeholder_login_otp"

STAKEHOLDER_JWT_SECRET = os.getenv("JWT_SECRET", "some-jwt-secret")
STAKEHOLDER_JWT_EXPIRY_HOURS = 24


# ─── OTP helpers ─────────────────────────────────────────────────────────────

def generate_otp() -> str:
    """Generate a random 6-digit OTP."""
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


def issue_otp(identifier: str) -> str:
    """
    Generate an OTP for the given identifier (e.g. phone number),
    cache it with a TTL, and return the OTP string.
    """
    otp = generate_otp()
    cache_key = f"{OTP_CACHE_PREFIX}:{identifier}"
    cache.set(cache_key, otp, timeout=OTP_TTL_SECONDS)
    logger.info("OTP issued for identifier=%s", identifier)
    return otp


def verify_otp(identifier: str, otp: str) -> bool:
    """
    Validate the submitted OTP against the cached value.
    Deletes the cache key on success (one-time use).
    Returns True if valid, False otherwise.
    """
    cache_key = f"{OTP_CACHE_PREFIX}:{identifier}"
    cached_otp = cache.get(cache_key)

    if cached_otp is None:
        return False

    if cached_otp != otp:
        return False

    # Consume — one time use
    cache.delete(cache_key)
    return True


# ─── Stakeholder JWT ─────────────────────────────────────────────────────────

def generate_stakeholder_jwt(stakeholder: Stakeholder, email: str) -> str:
    """
    Sign a short-lived JWT for a verified stakeholder.
    The token carries `type: stakeholder` so it can never be confused
    with a User JWT. Includes the authenticated email.
    """
    payload = {
        "stakeholder_id": str(stakeholder.id),
        "email": email,
        "type": "stakeholder",
        "exp": datetime.utcnow() + timedelta(hours=STAKEHOLDER_JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, STAKEHOLDER_JWT_SECRET, algorithm="HS256")


def get_stakeholder_from_token(token: str) -> Stakeholder | None:
    """
    Decode a stakeholder JWT and return the Stakeholder object.
    Returns None if the token is invalid, expired, or type != 'stakeholder'.
    """
    try:
        payload = jwt.decode(token, STAKEHOLDER_JWT_SECRET, algorithms=["HS256"])

        if payload.get("type") != "stakeholder":
            return None

        stakeholder_id = payload.get("stakeholder_id")
        return Stakeholder.objects.get(id=stakeholder_id)

    except (jwt.ExpiredSignatureError, jwt.DecodeError, Stakeholder.DoesNotExist):
        return None


# ─── Email lookup ────────────────────────────────────────────────────────────

from contracts.models import StakeholderContractAccess

def find_stakeholder_by_email(email: str) -> Stakeholder | None:
    """
    Look up a stakeholder by examining StakeholderContractAccess records.
    Finds the first Stakeholder that has an access rule with the given email.
    """
    email = email.lower().strip()
    access = StakeholderContractAccess.objects.filter(email__iexact=email).first()
    if access:
        return access.stakeholder
    return None


# ─── Email delivery (Brevo) ─────────────────────────────────────────────────

def send_otp_email(to_email: str, to_name: str, otp: str) -> bool:
    """Send an OTP verification email via the Brevo SMTP API."""
    api_key = os.getenv("BREVO_API_KEY", "")
    from_email = os.getenv("BREVO_FROM_EMAIL", "admin@zhuhana.com")
    from_name = os.getenv("BREVO_FROM_NAME", "Lucerna")

    if not api_key:
        logger.error("BREVO_API_KEY not configured")
        return False

    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email, "name": to_name}],
        "subject": "Your Lucerna verification code",
        "htmlContent": f"""
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#1a1a2e">Your verification code</h2>
              <p>Use the code below to log in to the Lucerna stakeholder portal.</p>
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
