"""
Debug script to test LLM connection and JSON parsing.
Run this directly to diagnose issues: python -m app.debug_llm
"""

import asyncio
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.llm import call_openrouter_llm, parse_json_response
from app.prompts import INTENT_RECOGNITION_PROMPT


async def test_llm_connection():
    """Test basic LLM connection and response parsing."""
    
    print("=" * 60)
    print("Text2Blocks LLM Debug Script")
    print("=" * 60)
    
    # Check API key
    print(f"\n1. Checking API Key...")
    if not settings.OPENROUTER_API_KEY:
        print("   ❌ ERROR: OPENROUTER_API_KEY is not set in .env")
        return
    print(f"   ✓ API Key found (starts with: {settings.OPENROUTER_API_KEY[:10]}...)")
    
    # Check model
    print(f"\n2. Model: {settings.DEFAULT_MODEL}")
    
    # Test query
    test_query = "2 + 1294"
    test_profile = {"name": "Test User"}
    
    print(f"\n3. Test Query: '{test_query}'")
    
    # Format prompt
    system_prompt = INTENT_RECOGNITION_PROMPT.format(
        user_profile=json.dumps(test_profile, indent=2)
    )
    
    print(f"\n4. Calling OpenRouter API...")
    
    try:
        raw_response = await call_openrouter_llm(
            system_prompt=system_prompt,
            user_message=test_query,
            temperature=0.3,
            max_tokens=200
        )
        
        print(f"\n5. Raw LLM Response:")
        print("-" * 40)
        print(repr(raw_response))  # Show escape characters
        print("-" * 40)
        print(raw_response)  # Show formatted
        print("-" * 40)
        
        print(f"\n6. Attempting to parse JSON...")
        parsed = parse_json_response(raw_response)
        print(f"   ✓ Parsed successfully!")
        print(f"   Result: {json.dumps(parsed, indent=2)}")
        
    except Exception as e:
        print(f"\n   ❌ ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_llm_connection())
