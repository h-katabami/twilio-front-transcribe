from common.repository.transcribe_repository import (
    exclude_test_phone_items,
    filter_items_by_status_checkpoint,
    load_logs_items,
)
from common.request.extract_event import query_params, to_bool
from common.response.http_response import error, response
from common.usecase._shared import to_log_summary


def execute(event):
    params = query_params(event)
    company = str(params.get("company") or "").strip()
    status_checkpoint = str(params.get("statusCheckpoint") or "").strip()
    exclude_test_number = to_bool(params.get("excludeTestNumber"))
    if not company:
        return error(400, "company は必須です")

    items, query_error = load_logs_items(company, params.get("startDate", ""), params.get("endDate", ""))
    if query_error:
        return query_error

    if status_checkpoint:
        items = filter_items_by_status_checkpoint(items, status_checkpoint)
    items = exclude_test_phone_items(items, exclude_test_number)
    summaries = [to_log_summary(item, company) for item in items]
    return response(200, {"items": summaries})