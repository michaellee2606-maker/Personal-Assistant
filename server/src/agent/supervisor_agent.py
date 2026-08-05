import asyncio

from langchain.agents import create_agent
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint

from tool.search import load_search_tools

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_supervisor_agent(hf_token: str):
    """Initialize the supervisor agent."""
    # Initialize the model with the token from runtime context
    # Using asyncio.to_thread to avoid blocking calls in async context
    llm = await asyncio.to_thread(
        HuggingFaceEndpoint,
        repo_id="meta-llama/Llama-3.1-8B-Instruct",
        huggingfacehub_api_token=hf_token,
    )
    
    model = ChatHuggingFace(llm=llm)
    
    search_tools = await load_search_tools()

    logger.debug(f"Tools: {search_tools}")

    supervisor_agent = create_agent(
        model=model,
        tools=search_tools,
    )

    return supervisor_agent
    