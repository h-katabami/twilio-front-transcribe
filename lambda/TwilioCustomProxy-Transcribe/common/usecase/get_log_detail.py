from common.repository.transcribe_repository import get_log_item
from common.request.extract_event import query_params
from common.response.http_response import error, response
from common.usecase._shared import to_history


def execute(call_sid, event):
    params = query_params(event)
    company = str(params.get("company") or "").strip()
    if not company:
        return error(400, "company は必須です")

    item = get_log_item(company, call_sid)
    if not item:
        return error(404, "レコードが見つかりません")

    return response(200, {
        "callSid": str(item.get("call_sid") or call_sid),
        "history": to_history(item),
        "transcriptionsByInput": {},
        "commentsByInput": {},
        "correctnessByInput": {},
        "reviewComment": str(item.get("review_comment") or ""),
        "reviewStatus": str(item.get("review_status") or "unreviewed"),
    })