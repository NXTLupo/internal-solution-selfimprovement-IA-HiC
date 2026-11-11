"""LLM-based merge of similar pros/cons points across chunk results.

History: this module streamed from util/llm_models/deepseek.py, which became a stub that
returns "". Iterating "" yields nothing, so the merge never received a reply. It now calls
the service's Claude client (util/llm_models/claude.py), which owns the model default and
the fallback chain.

Contract: for input that contains at least one non-empty point, the result never contains
an empty point string. An empty model reply raises LLMMergeError instead of returning
nothing; a reply that is not a JSON mapping returns the input points unmerged.
"""
from typing import Dict, List, Optional
import json
from util.llm_models.claude import get_claude_completion_with_json, get_claude_model
from util.prompts.reddit_prompt import get_point_merger_prompt

CATEGORIES = ("positive", "negative")


class LLMMergeError(RuntimeError):
    """Raised when the LLM merge cannot produce a usable answer."""


def extract_points(chunk_results: List[Dict]) -> List[str]:
    """Extract every non-empty point string from the chunk results."""
    points = []
    for chunk in chunk_results or []:
        if not isinstance(chunk, dict):
            continue
        for category in CATEGORIES:
            for item in chunk.get(category) or []:
                point = item.get("point") if isinstance(item, dict) else None
                if isinstance(point, str) and point.strip():
                    points.append(point)
    return points


def _parse_mapping(response: str) -> Optional[Dict[str, Dict[str, str]]]:
    """Parse the model reply into {"positive": {original: merged}, "negative": {...}}.

    Accepts the nested per-category shape get_point_merger_prompt asks for, or a flat
    {original: merged} object (applied to both categories). Entries whose key or target is
    not a non-empty string are dropped, so a blank target can never replace a point.
    Returns None when the reply holds no JSON object.
    """
    text = (response or "").strip()
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()
    text = text.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            return None
        try:
            data = json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            return None
    if not isinstance(data, dict):
        return None

    if any(isinstance(data.get(c), dict) for c in CATEGORIES):
        raw = {c: data.get(c) if isinstance(data.get(c), dict) else {} for c in CATEGORIES}
    else:
        raw = {c: data for c in CATEGORIES}

    mapping = {}
    for category in CATEGORIES:
        mapping[category] = {
            original.strip(): target.strip()
            for original, target in raw[category].items()
            if isinstance(original, str) and isinstance(target, str)
            and original.strip() and target.strip()
        }
    return mapping


def _frequency(item: Dict) -> int:
    try:
        return int(item.get("frequency", 1))
    except (TypeError, ValueError):
        return 1


def _apply_mapping(chunk_results: List[Dict], mapping: Dict[str, Dict[str, str]]) -> Dict:
    """Group items by merged point within each category, summing frequency and evidence.

    Points the mapping does not name pass through under their own text; identical point
    texts are combined. Positive and negative points are never merged with each other.
    """
    groups = {category: {} for category in CATEGORIES}
    for chunk in chunk_results or []:
        if not isinstance(chunk, dict):
            continue
        for category in CATEGORIES:
            for item in chunk.get(category) or []:
                if not isinstance(item, dict):
                    continue
                point = item.get("point")
                if not isinstance(point, str) or not point.strip():
                    continue
                target = mapping[category].get(point.strip()) or point
                entry = groups[category].setdefault(
                    target, {"point": target, "frequency": 0, "evidence": {}}
                )
                entry["frequency"] += _frequency(item)
                evidence = item.get("evidence")
                if isinstance(evidence, dict):
                    entry["evidence"].update(evidence)
    return {category: list(groups[category].values()) for category in CATEGORIES}


def merge_similar_points(chunk_results: List[Dict], merge_prompt: str = None) -> Dict:
    """Merge similar points across multiple chunk results with one Claude call.

    `merge_prompt` defaults to get_point_merger_prompt(chunk_results).
    Raises LLMMergeError when the model returns an empty reply.
    """
    points = extract_points(chunk_results)
    print(f"[merge_llm] Extracted {len(points)} points to merge")
    if not points:
        return {"positive": [], "negative": []}

    if not merge_prompt:
        merge_prompt = get_point_merger_prompt(chunk_results)

    model = get_claude_model()
    print(f"[merge_llm] Sending merge prompt to Claude (model={model})")
    response = get_claude_completion_with_json(
        messages=[{"role": "user", "content": merge_prompt}]
    )
    if not response or not response.strip():
        raise LLMMergeError(
            f"LLM merge received an empty reply from Claude (model={model}) for "
            f"{len(points)} points. The [claude.py] log line above names the error and request id."
        )

    mapping = _parse_mapping(response)
    if mapping is None:
        print("[merge_llm] Reply was not a JSON mapping, returning points unmerged. "
              f"Reply start: {response[:200]}")
        mapping = {category: {} for category in CATEGORIES}

    result = _apply_mapping(chunk_results, mapping)
    for category in CATEGORIES:
        for item in result[category]:
            if not item["point"].strip():
                raise LLMMergeError(f"LLM merge produced an empty {category} point")
    if not result["positive"] and not result["negative"]:
        raise LLMMergeError(f"LLM merge produced no points from {len(points)} input points")

    print(f"[merge_llm] Merge complete: {len(result['positive'])} positive, {len(result['negative'])} negative")
    return result


def test_merge():
    """Manual smoke run against the live model: python -m util.text_processing.merge_ds"""
    test_chunks = [
        {
            "positive": [
                {"point": "The app is fast", "frequency": 2,
                 "evidence": {"post1": "quote1", "post2": "quote2"}},
                {"point": "Accurate health monitoring (e.g., pregnancy detection, cycle tracking)", "frequency": 3,
                 "evidence": {"post17": "my oura ring picked it up immediately with higher than normal temps"}},
            ],
            "negative": [],
        },
        {
            "positive": [
                {"point": "Quick performance", "frequency": 1, "evidence": {"post3": "quote3"}},
                {"point": "Effective health monitoring (e.g., detecting illnesses, hormonal changes)", "frequency": 5,
                 "evidence": {"post4": "my oura ring diagnosed me with low progesterone"}},
            ],
            "negative": [],
        },
    ]
    merged = merge_similar_points(test_chunks)
    print(json.dumps(merged, indent=2))


if __name__ == "__main__":
    test_merge()
