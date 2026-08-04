"""LangGraph single-node graph template.

Returns a predefined response. Replace logic and configuration as needed.
"""

from __future__ import annotations

from typing import Any, Dict

from utils.state import State
from utils.context import Context
from langgraph.graph import StateGraph
from langgraph.runtime import Runtime

import logging
import asyncio
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint

from tool.search import load_search_tools

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def call_model(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    """Process input and returns output.

    Can use runtime context to alter behavior.
    """
    hf_token = runtime.context.get("hf_token")
    
    if not hf_token:
        raise ValueError("Hugging Face token is required but not provided in context")

    # Initialize the model with the token from runtime context
    # Using asyncio.to_thread to avoid blocking calls in async context
    llm = await asyncio.to_thread(
        HuggingFaceEndpoint,
        repo_id="meta-llama/Llama-3.1-8B-Instruct",
        huggingfacehub_api_token=hf_token,
    )
    
    model = ChatHuggingFace(llm=llm)

    search_tools = await load_search_tools()

    logger.info(f"Tools: {search_tools}")

    model_with_tools = model.bind_tools(search_tools)

    logger.info(f"State:{state}")

    messages = state["messages"]
    content = ""
    async for chunk in model_with_tools.astream(messages):
        logger.info(f"Chunk:{chunk}")
        if chunk.content:
            content += chunk.content

    logger.info(f"Response:{content}")

    # Return only the new assistant message; the add_messages reducer appends
    # it to the persisted thread history.
    return {"messages": [{"role": "assistant", "content": content}]}

# Define the graph
graph = (
    StateGraph(State, context_schema=Context)
    .add_node(call_model)
    .add_edge("__start__", "call_model")
    .compile(name="New Graph")
)
