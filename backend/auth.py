# ======================================================
# MyVault - auth.py
# Authentication / Password Hashing / JWT
# ======================================================

import os

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext


# ======================================================
# PASSWORD SECURITY CONFIGURATION
# ======================================================

# Keep PBKDF2-SHA256 for compatibility with
# passwords already stored in your database.

pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto"
)


# Password limits
#
# Minimum: 8 characters
# Maximum: 128 characters
#
# The maximum also helps prevent unnecessarily expensive
# password hashing requests.

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


# ======================================================
# HASH PASSWORD
# ======================================================

def hash_password(password: str) -> str:
    """
    Securely hash a plain-text password.
    """

    if not isinstance(password, str):
        raise ValueError(
            "Password must be a string."
        )

    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(
            f"Password must contain at least "
            f"{MIN_PASSWORD_LENGTH} characters."
        )

    if len(password) > MAX_PASSWORD_LENGTH:
        raise ValueError(
            f"Password must not exceed "
            f"{MAX_PASSWORD_LENGTH} characters."
        )

    return pwd_context.hash(password)


# ======================================================
# VERIFY PASSWORD
# ======================================================

def verify_password(
    password: str,
    hashed_password: str
) -> bool:
    """
    Verify a plain-text password against
    the stored password hash.

    Returns False instead of exposing password
    hashing errors to the API.
    """

    if not isinstance(password, str):
        return False

    if not isinstance(hashed_password, str):
        return False

    if not hashed_password:
        return False

    try:

        return pwd_context.verify(
            password,
            hashed_password
        )

    except Exception:

        # Never expose internal password-hashing
        # errors to the client.

        return False


# ======================================================
# JWT CONFIGURATION
# ======================================================

SECRET_KEY = os.getenv(
    "MYVAULT_SECRET_KEY"
)


# ------------------------------------------------------
# Secret key must exist
# ------------------------------------------------------

if not SECRET_KEY:

    raise RuntimeError(
        "MYVAULT_SECRET_KEY environment variable "
        "is not configured."
    )


# ------------------------------------------------------
# Reject obvious placeholder secrets
# ------------------------------------------------------

PLACEHOLDER_SECRETS = {
    "PASTE_YOUR_GENERATED_SECRET_HERE",
    "PASTE_THE_GENERATED_VALUE_HERE",
    "CHANGE_THIS_SECRET_KEY",
    "CHANGE_THIS_SECRET_KEY_BEFORE_PRODUCTION",
}


if SECRET_KEY in PLACEHOLDER_SECRETS:

    raise RuntimeError(
        "MYVAULT_SECRET_KEY is still using a "
        "placeholder value. Generate a secure "
        "random secret and configure it."
    )


# ------------------------------------------------------
# Require a sufficiently long secret
# ------------------------------------------------------

if len(SECRET_KEY) < 32:

    raise RuntimeError(
        "MYVAULT_SECRET_KEY must be at least "
        "32 characters long."
    )


# ======================================================
# JWT SETTINGS
# ======================================================

ALGORITHM = "HS256"


ACCESS_TOKEN_EXPIRE_MINUTES = 30


TOKEN_TYPE = "access"


# ======================================================
# CREATE ACCESS TOKEN
# ======================================================

def create_access_token(
    user_id: int
) -> str:
    """
    Create a JWT access token for a valid user ID.
    """

    # --------------------------------------------------
    # Validate user ID
    # --------------------------------------------------

    if not isinstance(user_id, int):

        raise ValueError(
            "Invalid user ID."
        )


    if isinstance(user_id, bool):

        raise ValueError(
            "Invalid user ID."
        )


    if user_id <= 0:

        raise ValueError(
            "Invalid user ID."
        )


    # --------------------------------------------------
    # Current UTC time
    # --------------------------------------------------

    now = datetime.now(
        timezone.utc
    )


    # --------------------------------------------------
    # Expiration
    # --------------------------------------------------

    expire = (
        now
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )


    # --------------------------------------------------
    # JWT payload
    # --------------------------------------------------

    payload = {

        # User ID
        "sub": str(user_id),

        # Token type
        "type": TOKEN_TYPE,

        # Issued-at time
        "iat": now,

        # Expiration time
        "exp": expire,
    }


    # --------------------------------------------------
    # Encode JWT
    # --------------------------------------------------

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


    return token


# ======================================================
# VERIFY ACCESS TOKEN
# ======================================================

def verify_access_token(
    token: str
) -> int:
    """
    Verify a MyVault JWT access token.

    Returns:
        int: authenticated user ID

    Raises:
        ValueError: invalid or expired token
    """

    # --------------------------------------------------
    # Validate token input
    # --------------------------------------------------

    if not isinstance(token, str):

        raise ValueError(
            "Missing access token"
        )


    token = token.strip()


    if not token:

        raise ValueError(
            "Missing access token"
        )


    # --------------------------------------------------
    # Decode and verify JWT
    # --------------------------------------------------

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )


        # ------------------------------------------------
        # Verify token type
        # ------------------------------------------------

        token_type = payload.get(
            "type"
        )


        if token_type != TOKEN_TYPE:

            raise ValueError(
                "Invalid token type"
            )


        # ------------------------------------------------
        # Get user ID
        # ------------------------------------------------

        user_id = payload.get(
            "sub"
        )


        if user_id is None:

            raise ValueError(
                "Missing user ID"
            )


        # ------------------------------------------------
        # Convert user ID
        # ------------------------------------------------

        user_id = int(user_id)


        # ------------------------------------------------
        # Validate user ID
        # ------------------------------------------------

        if user_id <= 0:

            raise ValueError(
                "Invalid user ID"
            )


        return user_id


    # --------------------------------------------------
    # Normalize all JWT validation failures
    # --------------------------------------------------

    except (
        JWTError,
        ValueError,
        TypeError,
        OverflowError
    ):

        raise ValueError(
            "Invalid or expired token"
        )


# ======================================================
# OPTIONAL TOKEN VALIDATION HELPER
# ======================================================

def is_token_valid(
    token: str
) -> bool:
    """
    Return True when a JWT access token is valid.
    """

    try:

        verify_access_token(
            token
        )

        return True

    except ValueError:

        return False