"""
stakeholders/urls.py
"""
from django.urls import path
from .views import SendOTPView, VerifyOTPView
from decorators import auth_required

urlpatterns = [
    
    # ── Agent endpoints (no user auth — Bolna calls these directly) ──
    # Authentication is handled by OTP verification, not session/token.
    # Protect these at the network/firewall level or add an AGENT_SECRET
    # header check in production.
    path("send-otp/",   auth_required(SendOTPView.as_view()),   name="agent-send-otp"),
    path("verify-otp/", auth_required(VerifyOTPView.as_view()), name="agent-verify-otp"),
]