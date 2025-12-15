"""
Pydantic models for API request/response schemas.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


# ============== Request Models ==============

class UserProfile(BaseModel):
    """User profile information for personalization."""
    name: Optional[str] = Field(None, description="User's name")
    dob: Optional[str] = Field(None, description="User's date of birth")
    education: Optional[str] = Field(None, description="User's education level")
    introduction: Optional[str] = Field(None, description="User's introduction/bio")
    experience_level: Optional[str] = Field(None, description="e.g., beginner, intermediate, senior")
    
    class Config:
        extra = "allow"  # Allow additional fields


class OptimizePromptRequest(BaseModel):
    """Request body for /api/optimize-prompt endpoint."""
    user_query: str = Field(..., description="The user's raw query to be optimized")
    user_profile: UserProfile = Field(..., description="User profile information")


# ============== Response Models ==============

class TutorialResponse(BaseModel):
    """Response when query is classified as tutorial-type."""
    type: str = Field(default="tutorial", description="Response type indicator")
    optimized_prompt: str = Field(..., description="CO-STA optimized prompt")


class GenericResponse(BaseModel):
    """Response when query is classified as generic-type."""
    type: str = Field(default="generic", description="Response type indicator")
    response: str = Field(..., description="Direct response to the query (max 60 words)")


class ErrorResponse(BaseModel):
    """Error response model."""
    error: bool = Field(default=True)
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
