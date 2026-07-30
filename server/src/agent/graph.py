"""LangGraph single-node graph template.

Returns a predefined response. Replace logic and configuration as needed.
"""

from __future__ import annotations

from typing import Annotated, Any, Dict

from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langgraph.runtime import Runtime
from typing_extensions import TypedDict

import logging
import asyncio
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Context(TypedDict):
    """Context parameters for the agent.

    Set these when creating assistants OR when invoking the graph.
    See: https://langchain-ai.github.io/langgraph/cloud/how-tos/configuration_cloud/
    """

    hf_token: str
    my_configurable_param: str


class State(TypedDict):
    """Input state for the agent.

    Defines the initial structure of incoming data.
    See: https://langchain-ai.github.io/langgraph/concepts/low_level/#state
    """

    # add_messages appends new messages to the checkpointed history instead of
    # overwriting it, so each run only needs to send the new human message.
    messages: Annotated[list, add_messages]


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

    logger.info(f"State:{state}")

    messages = state["messages"]
    content = ""
    async for chunk in model.astream(messages):
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
