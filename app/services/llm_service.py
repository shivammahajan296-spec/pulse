from __future__ import annotations

import asyncio
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

DEFAULT_ENDPOINT = "https://llmfoundry.straivedemo.com/gemini/v1beta/openai/chat/completions"


def _safe_endpoint(endpoint: str) -> str:
    if not endpoint.startswith("https://llmfoundry.straivedemo.com/"):
        raise ValueError("Only the approved Straive LLMFoundry HTTPS endpoint is allowed.")
    return endpoint


def _post(api_key: str, endpoint: str, payload: dict, timeout: int) -> tuple[int, dict]:
    request = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        return exc.code, {}


async def test_connection(api_key: str, endpoint: str, model: str) -> dict:
    endpoint = _safe_endpoint(endpoint)
    payload = {"model": model, "messages": [{"role": "user", "content": "Reply with OK."}], "max_tokens": 8}
    status, _ = await asyncio.to_thread(_post, api_key, endpoint, payload, 12)
    if 200 <= status < 300:
        return {"connected": True, "message": "Connection successful."}
    return {"connected": False, "message": f"Connection failed with provider status {status}."}


async def generate_explanation(api_key: str, endpoint: str, model: str, context: str) -> str:
    endpoint = _safe_endpoint(endpoint)
    payload = {"model": model, "messages": [{"role": "system", "content": "You are a concise manufacturing decision-support analyst. Do not invent numbers."}, {"role": "user", "content": context}], "temperature": .2, "max_tokens": 220}
    status, body = await asyncio.to_thread(_post, api_key, endpoint, payload, 20)
    if not 200 <= status < 300:
        raise RuntimeError(f"Provider returned status {status}")
    return body["choices"][0]["message"]["content"]
