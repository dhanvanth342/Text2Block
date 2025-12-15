"""
API router for /api/optimize-prompt endpoint.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models import OptimizePromptRequest, TutorialResponse, GenericResponse, ErrorResponse
from app.graphs.optimize_prompt import optimize_prompt_graph

router = APIRouter(prefix="/api", tags=["Optimize Prompt"])


@router.post(
    "/optimize-prompt",
    responses={
        200: {
            "description": "Successful response",
            "content": {
                "application/json": {
                    "examples": {
                        "tutorial": {
                            "summary": "Tutorial query response",
                            "value": {
                                "type": "tutorial",
                                "optimized_prompt": "You are an expert AI Architect..."
                            }
                        },
                        "generic": {
                            "summary": "Generic query response",
                            "value": {
                                "type": "generic",
                                "response": "2 + 1294 = 1296"
                            }
                        }
                    }
                }
            }
        },
        400: {"model": ErrorResponse, "description": "Missing input error"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def optimize_prompt(request: OptimizePromptRequest):
    """
    Optimize a user query for tutorial generation.
    
    This endpoint performs two-step processing:
    1. **Intent Recognition**: Classifies the query as tutorial or generic
    2. **Prompt Optimization**: If tutorial, transforms query using CO-STA blueprint
    
    ## Input Validation
    - `user_query` (required): The raw user query
    - `user_profile` (required): User profile with name, education, etc.
    
    ## Response Types
    - **Tutorial**: Returns optimized prompt for tutorial generation
    - **Generic**: Returns direct response (max 60 words)
    """
    
    # Validate required inputs
    if not request.user_query or not request.user_query.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error": True,
                "message": "Missing input: 'user_query' is required and cannot be empty",
                "details": {"missing_field": "user_query"}
            }
        )
    
    if request.user_profile is None:
        raise HTTPException(
            status_code=400,
            detail={
                "error": True,
                "message": "Missing input: 'user_profile' is required",
                "details": {"missing_field": "user_profile"}
            }
        )
    
    try:
        # Prepare initial state for the graph
        initial_state = {
            "user_query": request.user_query.strip(),
            "user_profile": request.user_profile.model_dump(),
            "is_tutorial_query": False,
            "generic_response": None,
            "optimized_prompt": None,
            "response_type": "",
            "error": None
        }
        
        # Invoke the LangGraph workflow
        result = await optimize_prompt_graph.ainvoke(initial_state)
        
        # Check for errors in the workflow
        if result.get("error"):
            raise HTTPException(
                status_code=500,
                detail={
                    "error": True,
                    "message": result["error"],
                    "details": None
                }
            )
        
        # Return appropriate response based on query type
        if result.get("response_type") == "tutorial":
            return JSONResponse(
                status_code=200,
                content={
                    "type": "tutorial",
                    "optimized_prompt": result.get("optimized_prompt", "")
                }
            )
        else:
            return JSONResponse(
                status_code=200,
                content={
                    "type": "generic",
                    "response": result.get("generic_response", "")
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"[ERROR] Exception in optimize_prompt endpoint:")
        print(error_traceback)
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message": f"Internal server error: {str(e)}",
                "details": {"traceback": error_traceback}
            }
        )
