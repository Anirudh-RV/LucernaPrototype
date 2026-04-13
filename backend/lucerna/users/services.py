import jwt
import random
import string
from datetime import datetime, timedelta
from typing import Union

from django.contrib.auth.hashers import check_password
from django.core.cache import cache

from contracts.models import Stakeholder, StakeholderContractAccess

from .constants import JWT_SECRET, JWT_VALIDITY_DAYS
from .models import User

Entity = Union[User, Stakeholder]

JWT_ROLE_USER = "user"
JWT_ROLE_STAKEHOLDER = "stakeholder"

STAKEHOLDER_PORTAL_OTP_PREFIX = "stakeholder_portal_login_otp"
STAKEHOLDER_PORTAL_OTP_TTL_SECONDS = 5 * 60
OTP_LENGTH = 6


class UserServices:

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        return phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

    @staticmethod
    def _stakeholder_portal_otp_cache_key(identifier: str) -> str:
        return f"{STAKEHOLDER_PORTAL_OTP_PREFIX}:{identifier}"

    @staticmethod
    def _generate_otp() -> str:
        return "".join(random.choices(string.digits, k=OTP_LENGTH))

    @staticmethod
    def find_stakeholder_by_identifier(identifier: str) -> Stakeholder | None:
        raw = (identifier or "").strip()
        if not raw:
            return None
        if "@" in raw:
            access = (
                StakeholderContractAccess.objects.filter(email__iexact=raw.lower())
                .exclude(email__exact="")
                .select_related("stakeholder")
                .first()
            )
            return access.stakeholder if access else None
        normalized = UserServices._normalize_phone(raw)
        qs = Stakeholder.objects.filter(phone=raw)
        if qs.exists():
            return qs.first()
        for s in Stakeholder.objects.iterator():
            if UserServices._normalize_phone(s.phone) == normalized:
                return s
        return None

    @staticmethod
    def stakeholder_access_has_email(stakeholder: Stakeholder, email: str) -> bool:
        """True if this address matches a non-empty notification email on an access rule."""
        e = (email or "").strip().lower()
        if not e:
            return False
        return StakeholderContractAccess.objects.filter(
            stakeholder=stakeholder,
        ).exclude(email__exact="").filter(email__iexact=e).exists()

    @staticmethod
    def stakeholder_to_login_v1_user_dict(stakeholder: Stakeholder) -> dict:
        """Shape matches LoginViewV1 `response.user` for dashboard parity."""
        return {
            "id": str(stakeholder.id),
            "first_name": stakeholder.name or "",
            "middle_name": "",
            "last_name": "",
            "email": "",
            "role": "stakeholder",
            "created_at": stakeholder.created_at.isoformat(),
            "updated_at": stakeholder.updated_at.isoformat(),
        }

    @staticmethod
    def entity_to_authenticate_user_dict(entity: Entity) -> dict:
        """Response body for /api/user/v1/authenticate/ (User or Stakeholder)."""
        if isinstance(entity, User):
            return {
                "id": str(entity.id),
                "first_name": entity.first_name,
                "middle_name": entity.middle_name,
                "last_name": entity.last_name,
                "email": entity.email,
                "created_at": entity.created_at.isoformat(),
                "updated_at": entity.updated_at.isoformat(),
            }
        if isinstance(entity, Stakeholder):
            d = UserServices.stakeholder_to_login_v1_user_dict(entity)
            d["role"] = JWT_ROLE_STAKEHOLDER
            d["phone"] = entity.phone
            return d
        raise TypeError("entity must be User or Stakeholder")

    @staticmethod
    def issue_stakeholder_portal_otp(identifier: str) -> str:
        otp = UserServices._generate_otp()
        cache.set(
            UserServices._stakeholder_portal_otp_cache_key(identifier),
            otp,
            timeout=STAKEHOLDER_PORTAL_OTP_TTL_SECONDS,
        )
        return otp

    @staticmethod
    def verify_stakeholder_portal_otp(identifier: str, otp: str) -> bool:
        key = UserServices._stakeholder_portal_otp_cache_key(identifier)
        cached = cache.get(key)
        if cached is None or cached != (otp or "").strip():
            return False
        cache.delete(key)
        return True

    @staticmethod
    def create_user(first_name, middle_name, last_name, email, password):
        """
        Create a new user and return user data with JWT token
        """
        try:
            # Check if user already exists
            if User.objects.filter(email=email).exists():
                return {
                    'status': 0,
                    'status_description': 'user_already_exists',
                    'response_body': None
                }

            # Create user
            user = User.objects.create(
                first_name=first_name,
                middle_name=middle_name,
                last_name=last_name,
                email=email,
                password=password  # Will be hashed automatically by the model
            )

            # Generate JWT token
            jwt_token = UserServices.generate_jwt_token(user)

            # Prepare response
            return {
                'status': 1,
                'status_description': 'user_created',
                'response_body': {
                    'user': {
                        'id': str(user.id),
                        'first_name': user.first_name,
                        'middle_name': user.middle_name,
                        'last_name': user.last_name,
                        'email': user.email,
                        'created_at': user.created_at.isoformat(),
                        'updated_at': user.updated_at.isoformat(),
                    },
                    'jwt_token': jwt_token
                }
            }

        except Exception as e:
            return {
                'status': 0,
                'status_description': f'error: {str(e)}',
                'response_body': None
            }

    @staticmethod
    def login_user(email, password):
        """
        Authenticate user by email and password, return user data with JWT token
        """
        try:
            user = User.objects.filter(email=email).first()

            if not user or not check_password(password, user.password):
                return {
                    'status': 0,
                    'status_description': 'login_failed',
                }

            jwt_token = UserServices.generate_jwt_token(user)

            return {
                'status': 1,
                'status_description': 'login_success',
                'response': {
                    'user': {
                        'id': str(user.id),
                        'first_name': user.first_name,
                        'middle_name': user.middle_name,
                        'last_name': user.last_name,
                        'email': user.email,
                        'created_at': user.created_at.isoformat(),
                        'updated_at': user.updated_at.isoformat(),
                    },
                    'jwt_token': jwt_token
                }
            }

        except Exception as e:
            return {
                'status': 0,
                'status_description': 'login_failed',
            }

    @staticmethod
    def generate_jwt_token(entity: Entity) -> str:
        """
        Issue a JWT for either a dashboard User or a Stakeholder (portal).
        Includes role so get_entity_from_token can load the correct row.
        """
        if isinstance(entity, User):
            role = JWT_ROLE_USER
        elif isinstance(entity, Stakeholder):
            role = JWT_ROLE_STAKEHOLDER
        else:
            raise TypeError("entity must be users.User or contracts.Stakeholder")

        entity_id = str(entity.id)
        if isinstance(entity, User):
            email = entity.email
        else:
            email = ""

        payload = {
            "user_id": entity_id,
            "entity_id": entity_id,
            "role": role,
            "email": email,
            "exp": datetime.utcnow() + timedelta(days=JWT_VALIDITY_DAYS),
            "iat": datetime.utcnow(),
        }

        return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    @staticmethod
    def get_entity_from_token(token) -> Entity | None:
        """
        Decode JWT, read role, return the matching User or Stakeholder instance.
        Tokens without role default to dashboard User (backward compatible).
        """
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except (jwt.ExpiredSignatureError, jwt.DecodeError):
            return None

        role = payload.get("role") or JWT_ROLE_USER
        entity_id = payload.get("entity_id") or payload.get("user_id")
        if not entity_id:
            return None

        try:
            if role == JWT_ROLE_STAKEHOLDER:
                return Stakeholder.objects.get(id=entity_id)
            return User.objects.get(id=entity_id)
        except (User.DoesNotExist, Stakeholder.DoesNotExist):
            return None

    @staticmethod
    def get_user_from_token(token):
        """
        Decode JWT and return the User object only (no Stakeholder).
        """
        entity = UserServices.get_entity_from_token(token)
        return entity if isinstance(entity, User) else None

    @staticmethod
    def update_user_profile(user, first_name, middle_name, last_name):
        """
        Update basic user profile fields.
        """
        try:
            user.first_name = first_name
            user.middle_name = middle_name
            user.last_name = last_name
            user.save()

            return {
                'status': 1,
                'status_description': 'user_profile_updated',
                'response_body': {
                    'user': {
                        'id': str(user.id),
                        'first_name': user.first_name,
                        'middle_name': user.middle_name,
                        'last_name': user.last_name,
                        'email': user.email,
                        'created_at': user.created_at.isoformat(),
                        'updated_at': user.updated_at.isoformat(),
                    }
                }
            }
        except Exception as e:
            return {
                'status': 0,
                'status_description': f'error: {str(e)}',
                'response_body': None
            }

    @staticmethod
    def update_user_password(user, password):
        """
        Update user password (hashes automatically in model save).
        """
        try:
            user.password = password
            user.save()

            return {
                'status': 1,
                'status_description': 'password_updated',
                'response_body': None
            }
        except Exception as e:
            return {
                'status': 0,
                'status_description': f'error: {str(e)}',
                'response_body': None
            }
