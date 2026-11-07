import os
import json
from typing import TypedDict

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END

load_dotenv()


class RCAState(TypedDict):
    incident_text: str
    analysis_method: str
    result: dict


def analyze_incident(state: RCAState):
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise ValueError("GROQ_API_KEY is missing from .env")

    llm = ChatGroq(
        model="openai/gpt-oss-20b",
        temperature=0,
        api_key=api_key
    )

    method = state["analysis_method"]

    if method == "Fishbone":
        method_instruction = """
        Use these Fishbone categories:
        People, Equipment, Methods, Materials, Measurement,
        Environment.
        Put potential causes in the fishbone object, with
        each category as a key and a list of causes as its value.
        Set why_analysis to an empty list.
        """
    elif method == "5 Whys":
        method_instruction = """
        Perform a true 5 Whys analysis.
        Return exactly five strings in why_analysis, numbered 1 through 5.
        Each string must include both the Why question and its answer.
        Start with the observed problem in Why 1, then make each next
        question follow logically from the previous answer.
        Do not simply list five unrelated possible causes.
        Do not invent evidence or treat a hypothesis as a fact.
        If the incident information does not support a later link in the
        chain, explicitly say that the cause cannot yet be determined from
        the available evidence and identify what evidence is needed.
        Use an empty fishbone object.
        """
    else:
        method_instruction = """
        Follow the requested analysis method and do not invent evidence.
        """

    prompt = f"""
    Return ONLY one valid JSON object. Do not use Markdown
    fences or any text before or after the JSON.

    Required JSON structure:
    {{
      "summary": "Problem summary",
      "facts": ["Fact supported by incident information"],
      "why_analysis": ["Step 1"],
      "fishbone": {{
        "Equipment": ["Potential cause"]
      }},
      "hypotheses": [
        {{"category": "Equipment", "cause": "Potential cause"}}
      ],
      "contributing_factors": [],
      "missingEvidence": ["Evidence to collect"],
      "correctiveActions": [
        {{"action": "Proposed action", "reason": "Why it may help"}}
      ],
      "preventiveActions": [
        {{"action": "Proposed action", "reason": "Why it may help"}}
      ],
      "evidenceLimitations": ["What is not yet known"]
    }}

    Analysis method: {method}
    {method_instruction}

    Rules:
    - Use double quotes for JSON keys and string values.
    - Do not include trailing commas.
    - Use arrays for all list fields.
    - Use an object for fishbone.
    - Do not invent facts or claim actions have been completed.
    - Root causes are hypotheses, not confirmed findings.
    - Separate known facts from possible explanations.
    - Keep recommendations subject to qualified investigator review.
    - If information is unavailable, use an empty list.
    - Include missing evidence and limitations.

    Incident information:
    {state["incident_text"]}
    """

    last_error = None

    for attempt in range(2):
        try:
            response = llm.invoke(prompt)
            content = response.content

            if isinstance(content, list):
                content = "".join(
                    part.get("text", "")
                    for part in content
                    if isinstance(part, dict)
                )

            content = content.strip()

            if content.startswith("```"):
                content = content.split("\n", 1)[-1]
                if content.endswith("```"):
                    content = content[:-3].strip()

            start = content.find("{")
            end = content.rfind("}")

            if start == -1 or end == -1 or end < start:
                raise ValueError("The AI did not return a JSON object.")

            data = json.loads(content[start:end + 1])

            if not isinstance(data, dict):
                raise ValueError("The AI response must be a JSON object.")

            if method == "5 Whys":
                why_steps = data.get("why_analysis")
                if not isinstance(why_steps, list) or len(why_steps) != 5:
                    raise ValueError(
                        "5 Whys analysis must contain exactly five steps."
                    )
                if not all(isinstance(step, str) and step.strip() for step in why_steps):
                    raise ValueError(
                        "Each 5 Whys step must be a non-empty string."
                    )

            return {"result": data}

        except (json.JSONDecodeError, ValueError, TypeError) as error:
            last_error = error
            prompt += f"""

            Your previous response was invalid: {error}.
            Return a corrected, complete, valid JSON object only.
            """
            if method == "5 Whys":
                prompt += """
                IMPORTANT: why_analysis must be a list of exactly five
                non-empty strings numbered 1 through 5. Each string must
                contain a Why question and its answer. The steps must form
                one logical chain, not five unrelated causes. Do not invent
                facts; state when evidence is insufficient.
                """

    raise ValueError(f"Could not obtain valid JSON from AI: {last_error}")


workflow = StateGraph(RCAState)
workflow.add_node("analyze_incident", analyze_incident)
workflow.add_edge(START, "analyze_incident")
workflow.add_edge("analyze_incident", END)

rca_graph = workflow.compile()


def run_rca(incident_text: str, analysis_method: str):
    result = rca_graph.invoke({
        "incident_text": incident_text,
        "analysis_method": analysis_method,
        "result": {}
    })

    data = result["result"]

    hypotheses = data.get("hypotheses", [])
    fishbone = data.get("fishbone", {})

    categories = []
    root_causes = []

    if isinstance(hypotheses, dict):
        for category, causes in hypotheses.items():
            if category not in categories:
                categories.append(category)

            if isinstance(causes, list):
                for cause in causes:
                    if isinstance(cause, str):
                        root_causes.append({
                            "category": category,
                            "cause": cause
                        })

    elif isinstance(hypotheses, list):
        for item in hypotheses:
            if isinstance(item, dict):
                category = item.get("category", "")
                cause = item.get("cause", "")

                if category and category not in categories:
                    categories.append(category)

                if cause:
                    root_causes.append({
                        "category": category,
                        "cause": cause
                    })

            elif isinstance(item, str):
                root_causes.append({
                    "category": "",
                    "cause": item
                })

    if isinstance(fishbone, dict):
        for category, causes in fishbone.items():
            if category not in categories:
                categories.append(category)

            if isinstance(causes, list):
                for cause in causes:
                    if isinstance(cause, str):
                        root_causes.append({
                            "category": category,
                            "cause": cause
                        })

    def normalize_actions(actions):
        normalized = []

        if not isinstance(actions, list):
            return normalized

        for item in actions:
            if isinstance(item, str):
                normalized.append({
                    "action": item,
                    "justification": ""
                })
            elif isinstance(item, dict):
                normalized.append({
                    "action": item.get("action", ""),
                    "justification": (
                        item.get("justification")
                        or item.get("reason")
                        or item.get("relevance", "")
                    )
                })

        return normalized

    missing = (
        data.get("missingEvidence")
        or data.get("missing_evidence")
        or []
    )

    limitations = (
        data.get("evidenceLimitations")
        or data.get("evidence_limitations")
        or []
    )

    if isinstance(limitations, str):
        limitations = [limitations]

    if not isinstance(limitations, list):
        limitations = []

    corrective = (
        data.get("correctiveActions")
        or data.get("corrective_actions")
        or []
    )

    preventive = (
        data.get("preventiveActions")
        or data.get("preventive_actions")
        or []
    )

    return {
        "problem_statement": (
            data.get("summary")
            or data.get("problem_statement", "")
        ),
        "why_analysis": data.get("why_analysis", []),
        "facts": data.get("facts", []),
        "fishbone_categories": categories,
        "potential_root_causes": root_causes,
        "contributing_factors": data.get("contributing_factors", []),
        "missing_evidence": missing,
        "corrective_actions": normalize_actions(corrective),
        "preventive_actions": normalize_actions(preventive),
        "evidence_limitations": limitations
    }