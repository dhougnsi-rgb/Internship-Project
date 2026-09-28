"""
Input validation utilities for the DjoHealth API.
Provides common validation functions and regex patterns.
"""

import re
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# Regex patterns
EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
PHONE_PATTERN = r'^\+?[1-9]\d{1,14}$'
PASSWORD_PATTERN = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
NAME_PATTERN = r'^[a-zA-Z\sàáâäãåāăăçćčđďèéêëēėęěǵḧîïíīįìłḿñńňôöòóœøōõṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż]{2,50}$'


def validate_email(email: str) -> bool:
    """Validate email format."""
    return re.match(EMAIL_PATTERN, email) is not None


def validate_phone(phone: str) -> bool:
    """Validate phone number format (international format)."""
    return re.match(PHONE_PATTERN, phone) is not None


def validate_password_strength(password: str) -> tuple[bool, list[str]]:
    """
    Validate password strength.
    Returns (is_valid, list_of_errors).
    """
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one digit")
    
    if not re.search(r'[@$!%*?&]', password):
        errors.append("Password must contain at least one special character (@$!%*?&)")
    
    return len(errors) == 0, errors


def validate_name(name: str) -> bool:
    """Validate name format (letters and spaces only, 2-50 characters)."""
    return re.match(NAME_PATTERN, name) is not None


def sanitize_string(input_string: str, max_length: int = 1000) -> str:
    """
    Sanitize string input by removing potentially harmful characters.
    Limits length to prevent DoS attacks.
    """
    if not input_string:
        return ""
    
    # Remove null bytes and control characters except newlines and tabs
    sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', input_string)
    
    # Limit length
    return sanitized[:max_length]


def validate_age(age: Optional[int]) -> bool:
    """Validate age (must be between 0 and 150)."""
    if age is None:
        return True
    return 0 <= age <= 150


def validate_category(category: str, allowed_categories: set[str]) -> bool:
    """Validate category against allowed values."""
    return category in allowed_categories


class ValidationMixin(BaseModel):
    """Mixin class for common validation fields."""
    
    @field_validator('email', check_fields=False)
    @classmethod
    def email_validation(cls, v: str) -> str:
        if not validate_email(v):
            raise ValueError('Invalid email format')
        return v.lower()
    
    @field_validator('phone_number', check_fields=False)
    @classmethod
    def phone_validation(cls, v: Optional[str]) -> Optional[str]:
        if v and not validate_phone(v):
            raise ValueError('Invalid phone number format. Use international format (e.g., +237123456789)')
        return v
    
    @field_validator('name', check_fields=False)
    @classmethod
    def name_validation(cls, v: str) -> str:
        if not validate_name(v):
            raise ValueError('Name must contain only letters and spaces (2-50 characters)')
        return v.strip()
    
    @field_validator('password', check_fields=False)
    @classmethod
    def password_validation(cls, v: str) -> str:
        is_valid, errors = validate_password_strength(v)
        if not is_valid:
            raise ValueError('; '.join(errors))
        return v


def sanitize_input(data: dict, max_string_length: int = 1000) -> dict:
    """
    Sanitize all string values in a dictionary.
    Useful for cleaning user input before processing.
    """
    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            sanitized[key] = sanitize_string(value, max_string_length)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_input(value, max_string_length)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_string(item, max_string_length) if isinstance(item, str) else item
                for item in value
            ]
        else:
            sanitized[key] = value
    return sanitized
