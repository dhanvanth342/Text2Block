# LangGraph Summary - StateGraph & Core Syntax

## Overview
LangGraph is a library for building stateful, multi-actor applications with LLMs. It uses a graph-based approach where **State**, **Nodes**, and **Edges** define the workflow.

---

## Core Concepts

### 1. State
- A shared data structure representing the current snapshot of your application
- Typically defined using `TypedDict`, `dataclass`, or Pydantic `BaseModel`

```python
from typing_extensions import TypedDict

class State(TypedDict):
    user_query: str
    optimized_prompt: str
    is_tutorial_query: bool
```

### 2. StateGraph
- The main class for building graph-based workflows
- Initialized with a state schema

```python
from langgraph.graph import StateGraph, START, END

builder = StateGraph(State)
```

**With input/output schemas:**
```python
builder = StateGraph(
    OverallState,
    input_schema=InputState,
    output_schema=OutputState
)
```

---

## Nodes

### Defining Nodes
Nodes are functions that:
1. Receive the current state as input
2. Perform computation or side-effects
3. Return an updated state (partial dict with keys to update)

```python
def my_node(state: State):
    # Process state
    return {"optimized_prompt": "new value"}
```

### Adding Nodes
```python
builder.add_node("node_name", my_node)

# Or infer name from function
builder.add_node(my_node)  # Name becomes "my_node"
```

### Special Nodes
- **START**: Virtual node representing the entry point
- **END**: Virtual node representing graph completion

```python
from langgraph.graph import START, END
```

---

## Edges

### Normal Edges
Fixed transition from one node to another:
```python
builder.add_edge("node_a", "node_b")
builder.add_edge(START, "first_node")
builder.add_edge("last_node", END)
```

### Conditional Edges
Dynamic routing based on state:
```python
def routing_function(state: State) -> str:
    if state["is_tutorial_query"]:
        return "optimize_prompt_node"
    else:
        return END

builder.add_conditional_edges(
    "intent_recognition_node",
    routing_function
)

# With explicit mapping:
builder.add_conditional_edges(
    "node_a",
    routing_function,
    {True: "node_b", False: "node_c"}
)
```

### Conditional Entry Point
```python
builder.add_conditional_edges(START, routing_function)
```

---

## Compiling the Graph

After defining nodes and edges, compile to create an executable graph:

```python
graph = builder.compile()
```

### Compile Options
```python
graph = builder.compile(
    checkpointer=checkpointer,  # For persistence
    cache=InMemoryCache()       # For node caching
)
```

---

## Invoking the Graph

### Synchronous
```python
result = graph.invoke({"user_query": "explain RAG"})
```

### Async
```python
result = await graph.ainvoke({"user_query": "explain RAG"})
```

---

## Complete Example

```python
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END

# 1. Define State
class State(TypedDict):
    user_query: str
    is_tutorial: bool
    response: str

# 2. Define Nodes
def intent_recognition(state: State):
    # Call LLM to classify intent
    is_tutorial = True  # Simplified
    return {"is_tutorial": is_tutorial}

def optimize_prompt(state: State):
    # Call LLM to optimize prompt
    return {"response": "optimized prompt here"}

def generic_response(state: State):
    # Return generic response
    return {"response": "generic answer here"}

# 3. Define Routing
def route_by_intent(state: State) -> str:
    if state["is_tutorial"]:
        return "optimize_prompt"
    return "generic_response"

# 4. Build Graph
builder = StateGraph(State)
builder.add_node("intent_recognition", intent_recognition)
builder.add_node("optimize_prompt", optimize_prompt)
builder.add_node("generic_response", generic_response)

builder.add_edge(START, "intent_recognition")
builder.add_conditional_edges(
    "intent_recognition",
    route_by_intent
)
builder.add_edge("optimize_prompt", END)
builder.add_edge("generic_response", END)

# 5. Compile
graph = builder.compile()

# 6. Run
result = graph.invoke({"user_query": "explain how RAG works"})
```

---

## Key Takeaways for Text2Blocks Project

1. **State drives everything** - Define your state schema with all fields needed across nodes
2. **Nodes are pure functions** - Each node reads state, does work, returns partial state update
3. **Conditional edges for branching** - Use `add_conditional_edges` for intent-based routing
4. **Compile before use** - Call `.compile()` to finalize the graph
5. **Invoke to run** - Use `.invoke()` with initial state dict
