from common.repository.transcribe_repository import (
    exclude_test_phone_items,
    filter_items_by_status_checkpoint,
    is_call_record,
    load_logs_items,
    resolve_company,
)
from common.request.extract_event import query_params, to_bool
from common.response.http_response import error
from common.service.export_csv_service import export_csv_to_s3, render_csv, to_csv_cell


def execute(event):
    params = query_params(event)
    company = resolve_company(params.get("company"), params.get("company_name"))
    exclude_test_number = to_bool(params.get("excludeTestNumber"))
    if not company:
        return error(400, "company または company_name は必須です")

    items, query_error = load_logs_items(company, params.get("startDate", ""), params.get("endDate", ""))
    if query_error:
        return query_error

    items = filter_items_by_status_checkpoint(items, params.get("statusCheckpoint", ""))
    items = exclude_test_phone_items(items, exclude_test_number)
    call_items = [item for item in items if is_call_record(item)]
    headers = [
        "PK",
        "SK",
        "api",
        "call_from",
        "call_sid",
        "call_to",
        "company",
        "duration",
        "inputs_point",
        "inputs_point_confirmed",
        "memo",
        "minutes",
        "recording_url",
        "start_time",
        "status",
        "ttl",
        "user_inputs",
        "call_status",
        "user_status",
    ]
    rows = [[to_csv_cell(item.get(header)) for header in headers] for item in call_items]
    csv_text = render_csv(headers, rows)
    export_response, export_error = export_csv_to_s3(csv_text, company, "calls")
    return export_error or export_response