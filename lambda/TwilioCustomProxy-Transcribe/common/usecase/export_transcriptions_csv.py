import json

from common.repository.transcribe_repository import (
    exclude_test_phone_items,
    filter_items_by_status_checkpoint,
    get_full_call_item,
    is_call_record,
    load_logs_items,
)
from common.request.extract_event import query_params, to_bool
from common.response.http_response import error, json_default
from common.service.app_context import logger
from common.service.export_csv_service import export_csv_to_s3, render_csv


def execute(event):
    params = query_params(event)
    company = str(params.get("company") or "").strip()
    exclude_test_number = to_bool(params.get("excludeTestNumber"))
    if not company:
        return error(400, "company は必須です")

    items, query_error = load_logs_items(company, params.get("startDate", ""), params.get("endDate", ""))
    if query_error:
        return query_error

    items = filter_items_by_status_checkpoint(items, params.get("statusCheckpoint", ""))
    items = exclude_test_phone_items(items, exclude_test_number)

    logger.info(
        "transcriptions_export_start company=%s startDate=%s endDate=%s statusCheckpoint=%s itemCount=%s",
        company,
        params.get("startDate", ""),
        params.get("endDate", ""),
        params.get("statusCheckpoint", ""),
        len(items),
    )

    headers = ["cid", "status", "recording_url", "created_time", "question_id", "input", "success"]
    rows = []
    call_item_count = 0
    hydrated_count = 0
    no_inputs_point_count = 0
    fallback_user_inputs_nonempty_count = 0
    malformed_inputs_point_count = 0
    sample_payload = []

    for item in items:
        if not is_call_record(item):
            continue

        call_item_count += 1
        full_item = get_full_call_item(item)
        if full_item is not item:
            hydrated_count += 1

        points = full_item.get("inputs_point") if isinstance(full_item.get("inputs_point"), list) else []
        user_inputs = full_item.get("user_inputs") if isinstance(full_item.get("user_inputs"), list) else []
        if not points:
            no_inputs_point_count += 1
            if user_inputs:
                fallback_user_inputs_nonempty_count += 1

        recording_urls = full_item.get("recording_url") if isinstance(full_item.get("recording_url"), list) else []
        recording_url = str(recording_urls[0] or "") if recording_urls else ""
        cid = str(full_item.get("call_sid") or "")
        status = str(full_item.get("status") or "")

        if len(sample_payload) < 5:
            sample_payload.append({
                "cid": cid,
                "status": status,
                "inputs_point_len": len(points),
                "user_inputs_len": len(user_inputs),
                "item_keys": sorted(list(full_item.keys())),
            })

        for point in points:
            if not isinstance(point, dict):
                malformed_inputs_point_count += 1
                continue
            success = point.get("success")
            success_text = "TRUE" if success is True else "FALSE" if success is False else ""
            rows.append([
                cid,
                status,
                recording_url,
                str(point.get("created_time") or ""),
                str(point.get("question_id") or ""),
                str(point.get("input") or ""),
                success_text,
            ])

    if not rows:
        logger.warning(
            "transcriptions_export_empty_rows company=%s callItemCount=%s hydratedCount=%s noInputsPointCount=%s userInputsNonEmptyWhenInputsPointEmpty=%s malformedInputsPointCount=%s sample=%s",
            company,
            call_item_count,
            hydrated_count,
            no_inputs_point_count,
            fallback_user_inputs_nonempty_count,
            malformed_inputs_point_count,
            json.dumps(sample_payload, ensure_ascii=False, default=json_default),
        )
    else:
        logger.info(
            "transcriptions_export_rows_built company=%s callItemCount=%s hydratedCount=%s rowCount=%s noInputsPointCount=%s malformedInputsPointCount=%s",
            company,
            call_item_count,
            hydrated_count,
            len(rows),
            no_inputs_point_count,
            malformed_inputs_point_count,
        )

    csv_text = render_csv(headers, rows)
    export_response, export_error = export_csv_to_s3(csv_text, company, "transcriptions")
    return export_error or export_response