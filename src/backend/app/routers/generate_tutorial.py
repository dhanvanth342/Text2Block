"""
API router for /api/generate-tutorial endpoint.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.graphs.generate_tutorial import generate_tutorial_graph

router = APIRouter(prefix="/api", tags=["Generate Tutorial"])


# ============== Request/Response Models ==============

class GenerateTutorialRequest(BaseModel):
    """Request body for /api/generate-tutorial endpoint."""
    prompt: str = Field(..., description="The optimized prompt from /api/optimize-prompt")


class ImageStoryResponse(BaseModel):
    """Response for Step 1: Image Story generation."""
    image_retrieval_story: str = Field(..., description="Up to 3 image concepts to retrieve")
    image_retrieval_reasoning: str = Field(..., description="Why these images are important")
    diagram_generation_story: str = Field(..., description="Up to 3 diagram concepts to generate")
    diagram_generation_reasoning: str = Field(..., description="Why these diagrams are important")


class ErrorResponse(BaseModel):
    """Error response model."""
    error: bool = Field(default=True)
    message: str = Field(..., description="Error message")


# ============== Endpoint ==============

@router.post(
    "/generate-tutorial",
    response_model=ImageStoryResponse,
    responses={
        200: {
            "description": "Successful response with image stories",
            "model": ImageStoryResponse
        },
        400: {"model": ErrorResponse, "description": "Missing input error"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def generate_tutorial(request: GenerateTutorialRequest):
    """
    Generate visual content plan for a tutorial.
    
    This endpoint currently implements Step 1:
    - **Image Retrieval Story**: What images to search for via Google Custom Search
    - **Diagram Generation Story**: What diagrams to generate using DOT code
    
    ## Input
    - `prompt` (required): The optimized prompt from /api/optimize-prompt
    
    ## Output
    Returns a visual content plan with 4 fields:
    - `image_retrieval_story`: Up to 3 image concepts to retrieve
    - `image_retrieval_reasoning`: Why these images enhance the tutorial
    - `diagram_generation_story`: Up to 3 diagram concepts to generate
    - `diagram_generation_reasoning`: Why these diagrams are needed
    
    ## Future Steps (not yet implemented)
    - Step 2: Retrieve images from Pinecone
    - Step 3: Generate DOT code for diagrams
    - Step 4: Compile diagrams with Graphviz
    - Step 5: Generate final tutorial content
    """
    
    # Validate input
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error": True,
                "message": "Missing input: 'prompt' is required and cannot be empty"
            }
        )
    
    try:
        # Prepare initial state for the graph
        initial_state = {
            "prompt": request.prompt.strip(),
            "image_retrieval_story": None,
            "image_retrieval_reasoning": None,
            "diagram_generation_story": None,
            "diagram_generation_reasoning": None,
            "error": None
        }
        
        # Invoke the LangGraph workflow
        result = await generate_tutorial_graph.ainvoke(initial_state)
        
        # Check for errors
        if result.get("error"):
            raise HTTPException(
                status_code=500,
                detail={
                    "error": True,
                    "message": result["error"]
                }
            )
        
        # Return the image story response
        return JSONResponse(
            status_code=200,
            content={
                "image_retrieval_story": result.get("image_retrieval_story", ""),
                "image_retrieval_reasoning": result.get("image_retrieval_reasoning", ""),
                "diagram_generation_story": result.get("diagram_generation_story", ""),
                "diagram_generation_reasoning": result.get("diagram_generation_reasoning", "")
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"[ERROR] Exception in generate_tutorial endpoint:")
        print(error_traceback)
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message": f"Internal server error: {str(e)}"
            }
        )
