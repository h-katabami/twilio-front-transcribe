from common.repository.transcribe_repository import load_status_scenario
from common.request.extract_event import query_params
from common.response.http_response import error, response


def execute(event):
    params = query_params(event)
    company = str(params.get("company") or "").strip()
    if not company:
        return error(400, "company は必須です")

    scenario = load_status_scenario(company)
    values = []
    seen = set()
    for node in scenario:
        if not isinstance(node, dict):
            continue
        value = str(node.get("status_checkpoint") or "").strip()
        if not value or value in seen:
            continue
        seen.add(value)
        values.append(value)

    return response(200, {"items": values})