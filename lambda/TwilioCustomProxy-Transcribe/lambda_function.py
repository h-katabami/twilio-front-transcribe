from common.request.extract_event import parse_path
from common.usecase.export_calls_csv import execute as export_calls_csv
from common.usecase.export_transcriptions_csv import execute as export_transcriptions_csv
from common.usecase.get_companies import execute as list_companies
from common.usecase.get_log_detail import execute as get_log_detail
from common.usecase.get_logs import execute as list_logs
from common.usecase.get_status_checkpoints import execute as list_status_checkpoints
from common.response.http_response import error, response

def lambda_handler(event, context):
    method = str(event.get("httpMethod") or "GET").upper()
    path = parse_path(event)

    if method == "OPTIONS":
        return response(200, {"ok": True})

    if path == "companies" and method == "GET":
        return list_companies()

    if path == "logs" and method == "GET":
        return list_logs(event)

    if path == "status-checkpoints" and method == "GET":
        return list_status_checkpoints(event)

    if path == "logs/csv/calls" and method == "GET":
        return export_calls_csv(event)

    if path == "logs/csv/transcriptions" and method == "GET":
        return export_transcriptions_csv(event)

    if path.startswith("logs/") and method == "GET":
        call_sid = path[len("logs/"):]
        return get_log_detail(call_sid, event)

    return error(404, f"Not Found: {method} /{path}")

