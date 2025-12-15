"""
LangGraph workflow for the generate-tutorial endpoint.
Step 1: Generate image retrieval and diagram generation stories.
"""

import logging
from typing import Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END

from app.llm import call_openrouter_llm, IMAGE_STORY_SCHEMA
from app.prompts import IMAGE_STORY_PROMPT

logger = logging.getLogger(__name__)


# ============== State Definition ==============

class GenerateTutorialState(TypedDict):
    """State schema for the generate-tutorial workflow."""
    # Input fields
    prompt: str
    
    # Step 1: Image Story outputs
    image_retrieval_story: Optional[str]
    image_retrieval_reasoning: Optional[str]
    diagram_generation_story: Optional[str]
    diagram_generation_reasoning: Optional[str]
    
    # Metadata
    error: Optional[str]


# ============== Node Functions ==============

async def image_story_node(state: GenerateTutorialState) -> dict:
    """
    Step 1: Generate image retrieval and diagram generation stories.
    
    Analyzes the tutorial prompt and creates a visual content plan:
    - What images to retrieve from the web
    - What diagrams to generate using DOT code
    """
    prompt = state["prompt"]
    
    logger.info(f"Generating image story for prompt: {prompt[:50]}...")
    
    try:
        # Call LLM with structured output schema
        result = await call_openrouter_llm(
            system_prompt=IMAGE_STORY_PROMPT,
            user_message=prompt,
            response_schema=IMAGE_STORY_SCHEMA,
            temperature=0.7,
            max_tokens=1500
        )
        
        logger.debug(f"Image story result: {result}")
        
        return {
            "image_retrieval_story": result.get("image_retrieval_story", ""),
            "image_retrieval_reasoning": result.get("image_retrieval_reasoning", ""),
            "diagram_generation_story": result.get("diagram_generation_story", ""),
            "diagram_generation_reasoning": result.get("diagram_generation_reasoning", "")
        }
        
    except Exception as e:
        logger.error(f"Image story generation failed: {str(e)}")
        return {
            "error": f"Image story generation failed: {str(e)}"
        }


# ============== Graph Builder ==============

def build_generate_tutorial_graph():
    """
    Build and compile the generate-tutorial LangGraph workflow.
    
    Current Flow (Step 1 only):
        START -> image_story -> END
    
    Future steps will be added:
        - Image retrieval from Pinecone
        - DOT code generation
        - Image compilation with Graphviz
        - Tutorial content generation
    
    Returns:
        Compiled StateGraph ready for invocation
    """
    # Initialize the graph with state schema
    builder = StateGraph(GenerateTutorialState)
    
    # Add nodes
    builder.add_node("image_story", image_story_node)
    
    # Add edges (simple linear flow for Step 1)
    builder.add_edge(START, "image_story")
    builder.add_edge("image_story", END)
    
    # Compile and return
    return builder.compile()


# Create the compiled graph instance
generate_tutorial_graph = build_generate_tutorial_graph()
