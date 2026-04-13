import json
import logging

from django.core.mail import send_mail
from django.http import JsonResponse
from django.views import View

from .services import UserServices

logger = logging.getLogger(__name__)


class CreateUserViewV1(View):
    """
    API endpoint to create a new user
    POST /api/user/v1/create/
    """
    
    def post(self, request):
        try:
            # Parse request body
            body = json.loads(request.body)
                        
            # Validate required fields
            required_fields = ['first_name', 'last_name', 'email', 'password']
            missing_fields = [field for field in required_fields if field not in body]
            
            if missing_fields:
                return JsonResponse({
                    'status': 0,
                    'status_description': f'missing_fields: {", ".join(missing_fields)}',
                    'response_body': None
                }, status=400)
            
            # Extract data
            first_name = body.get('first_name', '').strip()
            middle_name = body.get('middle_name', '').strip()
            last_name = body.get('last_name', '').strip()
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            
            # Validate email format (basic validation)
            if '@' not in email:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'invalid_email_format',
                    'response_body': None
                }, status=400)
            
            # Validate password length
            if len(password) < 6:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'password_too_short',
                    'response_body': None
                }, status=400)
            
            # Call service to create user
            result = UserServices.create_user(
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                email=email,
                password=password
            )
            
            # Return response based on service result
            if result['status'] == 1:
                return JsonResponse(result, status=200)
            else:
                return JsonResponse(result, status=400)
            
        except json.JSONDecodeError:
            return JsonResponse({
                'status': 0,
                'status_description': 'invalid_json',
                'response_body': None
            }, status=400)
        
        except Exception as e:
            return JsonResponse({
                'status': 0,
                'status_description': f'server_error: {str(e)}',
                'response_body': None
            }, status=400)


class LoginViewV1(View):
    """
    API endpoint to login a user
    POST /api/user/v1/login/
    """

    def post(self, request):
        try:
            body = json.loads(request.body)

            email = body.get('email', '').strip().lower()
            password = body.get('Password', '') or body.get('password', '')

            if not email or not password:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'login_failed',
                }, status=401)

            result = UserServices.login_user(email=email, password=password)

            if result['status'] == 1:
                return JsonResponse(result, status=200)
            else:
                return JsonResponse(result, status=401)

        except json.JSONDecodeError:
            return JsonResponse({
                'status': 0,
                'status_description': 'login_failed',
            }, status=401)

        except Exception:
            return JsonResponse({
                'status': 0,
                'status_description': 'login_failed',
            }, status=401)


class StakeholderLoginViewV1(View):
    """
    Stakeholder portal: OTP by email only at sign-in (not persisted on Stakeholder).

    Step 1 — send OTP
      - Identifier is an email: must match a StakeholderContractAccess.notification email;
        OTP is sent to that address.
      - Identifier is a phone: JSON must include ``otp_delivery_email`` matching one of
        that stakeholder's access notification emails; OTP is sent there.

    Step 2 — POST JSON { "identifier": "<same>", "otp": "<code>" } then JWT.

    POST /api/user/v1/stakeholder-login/
    """

    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse(
                {"status": 0, "status_description": "invalid_json"},
                status=400,
            )

        identifier = (body.get("identifier") or body.get("email") or "").strip()
        otp = (body.get("otp") or "").strip()

        if not identifier:
            return JsonResponse(
                {"status": 0, "status_description": "missing_identifier"},
                status=400,
            )

        if otp:
            if not UserServices.verify_stakeholder_portal_otp(identifier, otp):
                return JsonResponse(
                    {"status": 0, "status_description": "invalid_or_expired_otp"},
                    status=401,
                )
            
            from users.models import User
            if "@" in identifier:
                email = identifier.lower()
                first_name = identifier.split("@")[0]
            else:
                email = f"{identifier}@stakeholder.local"
                first_name = identifier
                
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create(
                    first_name=first_name,
                    last_name="",
                    email=email,
                    password="stakeholder_no_login"
                )

            jwt_token = UserServices.generate_jwt_token(user)
            return JsonResponse(
                {
                    "status": 1,
                    "status_description": "login_success",
                    "response": {
                        "user": {
                            "id": str(user.id),
                            "first_name": user.first_name,
                            "middle_name": user.middle_name,
                            "last_name": user.last_name,
                            "email": user.email,
                            "created_at": user.created_at.isoformat(),
                            "updated_at": user.updated_at.isoformat(),
                        },
                        "jwt_token": jwt_token,
                    },
                },
                status=200,
            )

        send_to = ""
        ident = identifier.strip()
        if "@" in ident:
            send_to = ident.lower()
        else:
            delivery = (body.get("otp_delivery_email") or "").strip()
            if not delivery:
                return JsonResponse(
                    {
                        "status": 0,
                        "status_description": "missing_otp_delivery_email",
                    },
                    status=400,
                )
            send_to = delivery.lower()

        code = UserServices.issue_stakeholder_portal_otp(identifier)
        logger.info(f"Generated Stakeholder OTP for {identifier}: {code} (Sending to {send_to})")
        
        import os
        import requests

        brevo_api_key = os.getenv("BREVO_API_KEY")
        brevo_from_email = os.getenv("BREVO_FROM_EMAIL", os.getenv("DEFAULT_FROM_EMAIL", "no-reply@lucerna.com"))
        brevo_from_name = os.getenv("BREVO_FROM_NAME", os.getenv("DEFAULT_FROM_NAME", "Lucerna OTP"))

        if not brevo_api_key:
            logger.error("BREVO_API_KEY is not configured.")
            return JsonResponse({"status": 0, "status_description": "email_not_configured"}, status=500)

        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": brevo_api_key,
            "content-type": "application/json"
        }
        payload = {
            "sender": {"name": brevo_from_name, "email": brevo_from_email},
            "to": [{"email": send_to}],
            "subject": "Your Lucerna verification code",
            "htmlContent": f"<html><body><h2>Verification</h2><p>Your Lucerna OTP code is: <strong>{code}</strong></p><p>If you did not request this, you can ignore this message.</p></body></html>"
        }
        
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            resp.raise_for_status()
        except Exception as exc:
            logger.exception("Brevo API email failed: %s", exc)
            return JsonResponse(
                {
                    "status": 0,
                    "status_description": "otp_email_failed",
                },
                status=500,
            )

        return JsonResponse(
            {
                "status": 1,
                "status_description": "otp_sent",
                "response": {
                    "detail": "OTP sent to the verified email address.",
                },
            },
            status=200,
        )


class UserAuthenticateViewV1(View):
    """
    API endpoint to authenticate user via Token
    POST /api/user/v1/authenticate/
    """
    
    def post(self, request):
        try:
            # 1. Get Token from Header 
            # Django converts "X-LUCERNA-USER-TOKEN" to "HTTP_X_LUCERNA_USER_TOKEN"
            token = request.META.get('HTTP_X_LUCERNA_USER_TOKEN')
            
            if not token:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'missing_token',
                    'response_body': None
                }, status=400)
            
            # 2. Validate Token & resolve User or Stakeholder
            entity = UserServices.get_entity_from_token(token)

            if not entity:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'invalid_token',
                    'response_body': None
                }, status=401)

            # 3. Success Response
            return JsonResponse({
                'status': 1,
                'status_description': 'user_authenticated',
                'response_body': {
                    'user': UserServices.entity_to_authenticate_user_dict(entity),
                }
            }, status=200)

        except Exception as e:
            return JsonResponse({
                'status': 0,
                'status_description': f'server_error: {str(e)}',
                'response_body': None
            }, status=500)


class UserEditViewV1(View):
    """
    API endpoint to update current user profile
    PUT /api/user/v1/edit/
    Header: X-LUCERNA-USER-TOKEN
    """

    def put(self, request):
        try:
            token = request.META.get('HTTP_X_LUCERNA_USER_TOKEN')
            if not token:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'missing_token',
                    'response_body': None
                }, status=400)

            user = UserServices.get_user_from_token(token)
            if not user:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'invalid_token',
                    'response_body': None
                }, status=401)

            body = json.loads(request.body)
            first_name = body.get('first_name', '').strip()
            middle_name = body.get('middle_name', '').strip()
            last_name = body.get('last_name', '').strip()

            if not first_name or not last_name:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'missing_required_fields',
                    'response_body': None
                }, status=400)

            result = UserServices.update_user_profile(
                user=user,
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name
            )

            if result['status'] == 1:
                return JsonResponse(result, status=200)
            return JsonResponse(result, status=400)

        except json.JSONDecodeError:
            return JsonResponse({
                'status': 0,
                'status_description': 'invalid_json',
                'response_body': None
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'status': 0,
                'status_description': f'server_error: {str(e)}',
                'response_body': None
            }, status=500)


class UserPasswordUpdateViewV1(View):
    """
    API endpoint to update current user password
    PUT /api/user/v1/reset-password/update/
    Header: X-LUCERNA-USER-TOKEN
    """

    def put(self, request):
        try:
            token = request.META.get('HTTP_X_LUCERNA_USER_TOKEN')
            if not token:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'missing_token',
                    'response_body': None
                }, status=400)

            user = UserServices.get_user_from_token(token)
            if not user:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'invalid_token',
                    'response_body': None
                }, status=401)

            body = json.loads(request.body)
            password = body.get('password', '')

            if not password:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'missing_password',
                    'response_body': None
                }, status=400)

            if len(password) < 6:
                return JsonResponse({
                    'status': 0,
                    'status_description': 'password_too_short',
                    'response_body': None
                }, status=400)

            result = UserServices.update_user_password(user=user, password=password)
            if result['status'] == 1:
                return JsonResponse(result, status=200)
            return JsonResponse(result, status=400)

        except json.JSONDecodeError:
            return JsonResponse({
                'status': 0,
                'status_description': 'invalid_json',
                'response_body': None
            }, status=400)
        except Exception as e:
            return JsonResponse({
                'status': 0,
                'status_description': f'server_error: {str(e)}',
                'response_body': None
            }, status=500)
