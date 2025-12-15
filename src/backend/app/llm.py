"""
LLM integration module using OpenRouter API.
Provides functions to call Gemini 2.5 Flash via OpenRouter.
"""

import json
import re
import httpx
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


async def call_openrouter_llm(
    system_prompt: str,
    user_message: str,
    model: Optional[str] = None,
    temperature: float = 0.7,
    max_tokens: int = 500
) -> str:
    """
    Call OpenRouter API with the given prompts.
    
    Args:
        system_prompt: The system instruction for the LLM
        user_message: The user's message/query
        model: Model to use (defaults to settings.DEFAULT_MODEL)
        temperature: Sampling temperature
        max_tokens: Maximum tokens in response
        
    Returns:
        The LLM's response text
    """
    model = model or settings.DEFAULT_MODEL
    
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://text2blocks.app",
        "X-Title": "Text2Blocks"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    logger.debug(f"Calling OpenRouter with model: {model}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        logger.debug(f"LLM Response: {content[:200]}...")
        return content


def parse_json_response(response_text: str) -> dict:
    """
    Parse JSON from LLM response, handling potential formatting issues.
    
    This function handles:
    - Direct JSON responses
    - JSON wrapped in markdown code blocks
    - JSON with extra whitespace/newlines
    - Partial JSON extraction
    
    Args:
        response_text: Raw text response from LLM
        
    Returns:
        Parsed JSON as dictionary
        
    Raises:
        ValueError: If JSON cannot be parsed
    """
    if not response_text:
        raise ValueError("Empty response text")
    
    # Clean up the response - remove extra whitespace
    cleaned = response_text.strip()
    
    # Try direct parse first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    
    # Try to extract JSON from markdown code blocks
    # Pattern: ```json ... ``` or ``` ... ```
    code_block_patterns = [
        r'```json\s*([\s\S]*?)\s*```',  # ```json ... ```
        r'```\s*([\s\S]*?)\s*```',       # ``` ... ```
    ]
    
    for pattern in code_block_patterns:
        match = re.search(pattern, cleaned, re.IGNORECASE)
        if match:
            try:
                json_str = match.group(1).strip()
                return json.loads(json_str)
            except json.JSONDecodeError:
                continue
    
    # Try to find JSON object pattern { ... }
    # Find the first { and last } to extract JSON
    first_brace = cleaned.find('{')
    last_brace = cleaned.rfind('}')
    
    if first_brace >= 0 and last_brace > first_brace:
        json_str = cleaned[first_brace:last_brace + 1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # Try cleaning up common issues
            # Remove any trailing commas before closing braces
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*]', ']', json_str)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass
    
    # Log the problematic response for debugging
    logger.error(f"Failed to parse JSON from response: {response_text[:500]}")
    raise ValueError(f"Could not parse JSON from response. First 100 chars: {response_text[:100]}")
