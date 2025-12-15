"""
LangGraph workflow for the optimize-prompt endpoint.
Implements Intent Recognition -> (Conditional) -> Prompt Optimization flow.
"""

import json
import logging
from typing import Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END

from app.llm import call_openrouter_llm, parse_json_response
from app.prompts import INTENT_RECOGNITION_PROMPT, PROMPT_OPTIMIZATION_PROMPT

logger = logging.getLogger(__name__)


# ============== State Definition ==============

class OptimizePromptState(TypedDict):
    """State schema for the optimize-prompt workflow."""
    # Input fields
    user_query: str
    user_profile: dict
    
    # Intent recognition outputs
    is_tutorial_query: bool
    generic_response: Optional[str]
    
    # Prompt optimization outputs
    optimized_prompt: Optional[str]
    
    # Response metadata
    response_type: str  # "tutorial" or "generic"
    error: Optional[str]


# ============== Node Functions ==============

async def intent_recognition_node(state: OptimizePromptState) -> dict:
    """
    Node 1: Classify the user query as tutorial or generic.
    
    Uses LLM to analyze the query and determine if it requires
    a full tutorial or can be answered with a short response.
    """
    user_query = state["user_query"]
    user_profile = state["user_profile"]
    
    logger.info(f"Intent recognition for query: {user_query[:50]}...")
    
    # Format the system prompt with user profile context
    system_prompt = INTENT_RECOGNITION_PROMPT.format(
        user_profile=json.dumps(user_profile, indent=2)
    )
    
    try:
        # Call LLM for intent classification
        response = await call_openrouter_llm(
            system_prompt=system_prompt,
            user_message=user_query,
            temperature=0.3,  # Lower temperature for classification
            max_tokens=200
        )
        
        logger.debug(f"Intent recognition raw response: {response}")
        
        # DEBUG: Print raw response to console for troubleshooting
        print(f"[DEBUG] Raw LLM Response (repr): {repr(response)}")
        print(f"[DEBUG] Raw LLM Response: {response}")
        
        # Parse the JSON response
        result = parse_json_response(response)
        
        tutorial_query_value = result.get("tutorial_query", "false")
        generic_query_value = result.get("generic_query", "false")
        
        # Handle various response formats
        is_tutorial = str(tutorial_query_value).lower() in ["true", "yes", "1"]
        
        if is_tutorial:
            logger.info("Query classified as: TUTORIAL")
            return {
                "is_tutorial_query": True,
                "generic_response": None,
                "response_type": "tutorial"
            }
        else:
            # Get the generic response
            generic_response = generic_query_value if generic_query_value and str(generic_query_value).lower() != "false" else "I couldn't process this query."
            logger.info(f"Query classified as: GENERIC - {str(generic_response)[:50]}...")
            return {
                "is_tutorial_query": False,
                "generic_response": str(generic_response),
                "response_type": "generic"
            }
            
    except Exception as e:
        logger.error(f"Intent recognition failed: {str(e)}")
        return {
            "error": f"Intent recognition failed: {str(e)}",
            "is_tutorial_query": False,
            "response_type": "error"
        }


async def prompt_optimization_node(state: OptimizePromptState) -> dict:
    """
    Node 2: Optimize the user query using CO-STA blueprint.
    
    Transforms a raw tutorial query into a structured, detailed
    prompt suitable for high-quality tutorial generation.
    """
    user_query = state["user_query"]
    user_profile = state["user_profile"]
    
    logger.info(f"Optimizing prompt for query: {user_query[:50]}...")
    
    # Format the system prompt with user profile
    system_prompt = PROMPT_OPTIMIZATION_PROMPT.format(
        user_profile=json.dumps(user_profile, indent=2)
    )
    
    try:
        # Call LLM for prompt optimization
        response = await call_openrouter_llm(
            system_prompt=system_prompt,
            user_message=user_query,
            temperature=0.7,
            max_tokens=400
        )
        
        logger.debug(f"Prompt optimization raw response: {response}")
        
        # Parse the JSON response
        result = parse_json_response(response)
        
        optimized_prompt = result.get("optimized_prompt", "")
        
        if not optimized_prompt:
            raise ValueError("Empty optimized_prompt in response")
        
        logger.info(f"Prompt optimized successfully: {optimized_prompt[:50]}...")
        
        return {
            "optimized_prompt": optimized_prompt,
            "response_type": "tutorial"
        }
        
    except Exception as e:
        logger.error(f"Prompt optimization failed: {str(e)}")
        return {
            "error": f"Prompt optimization failed: {str(e)}",
            "response_type": "error"
        }


# ============== Routing Function ==============

def route_by_intent(state: OptimizePromptState) -> str:
    """
    Conditional edge routing based on intent classification.
    
    If the query is a tutorial query, proceed to optimization.
    Otherwise, skip to END (return generic response).
    """
    if state.get("error"):
        logger.info("Routing to END due to error")
        return END
    
    if state.get("is_tutorial_query"):
        logger.info("Routing to prompt_optimization")
        return "prompt_optimization"
    
    logger.info("Routing to END (generic response)")
    return END


# ============== Graph Builder ==============

def build_optimize_prompt_graph():
    """
    Build and compile the optimize-prompt LangGraph workflow.
    
    Flow:
        START -> intent_recognition -> (conditional)
            - if tutorial_query: prompt_optimization -> END
            - if generic_query: END (with generic_response)
    
    Returns:
        Compiled StateGraph ready for invocation
    """
    # Initialize the graph with state schema
    builder = StateGraph(OptimizePromptState)
    
    # Add nodes
    builder.add_node("intent_recognition", intent_recognition_node)
    builder.add_node("prompt_optimization", prompt_optimization_node)
    
    # Add edges
    builder.add_edge(START, "intent_recognition")
    builder.add_conditional_edges(
        "intent_recognition",
        route_by_intent,
        {
            "prompt_optimization": "prompt_optimization",
            END: END
        }
    )
    builder.add_edge("prompt_optimization", END)
    
    # Compile and return
    return builder.compile()


# Create the compiled graph instance
optimize_prompt_graph = build_optimize_prompt_graph()
