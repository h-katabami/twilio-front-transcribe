import csv
import io
import json
import os
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.getenv("MAIN_TABLE")
LOGS_INDEX_NAME = os.getenv("TABLE_INDEX")
EXPORT_BUCKET_NAME = os.getenv("EXPORT_BUCKET")
EXPORT_PREFIX = "company"
EXPORT_URL_EXPIRES = int(os.getenv("EXPORT_URL_EXPIRES"))
JST = ZoneInfo("Asia/Tokyo")

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)
s3_client = boto3.client("s3")


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def _json_default(obj):
    if isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
        },
        "body": json.dumps(body, ensure_ascii=False, default=_json_default),
    }


def _error(status_code, message):
    return _response(status_code, {"message": message})


# ---------------------------------------------------------------------------
# Event helpers
# ---------------------------------------------------------------------------

def _parse_path(event):
    """TwilioCustomProxy が渡す specific_path、または path から末尾パスを取り出す"""
    specific_path = str(event.get("specific_path") or "").strip("/")
    if specific_path:
        return specific_path
    path = str(event.get("path") or "").strip("/")
    parts = path.split("/")
    # /services/{service_name}/{rest...} 形式に対応
    if len(parts) >= 3 and parts[0] == "services":
        return "/".join(parts[2:])
    return ""


def _query_params(event):
    params = event.get("queryStringParameters") or {}
    return {str(k): v for k, v in params.items()} if isinstance(params, dict) else {}


# ---------------------------------------------------------------------------
# DynamoDB helpers
# ---------------------------------------------------------------------------

def _paginate(kwargs):
    """ページング付き DynamoDB query"""
    items = []
    while True:
        res = table.query(**kwargs)
        items.extend(res.get("Items", []))
        lek = res.get("LastEvaluatedKey")
        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek
    return items


def _format_start(date_str):
    if not date_str:
        return "0000-01-01T00:00:00+09:00"
    return datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m-%dT00:00:00+09:00")


def _format_end(date_str):
    if not date_str:
        return "9999-12-31T23:59:59+09:00"
    return datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m-%dT23:59:59+09:00")


def _load_logs_items(company, start_date, end_date):
    try:
        start_from = _format_start(start_date)
        start_to = _format_end(end_date)
    except ValueError:
        return None, _error(400, "startDate/endDate は YYYY-MM-DD 形式で指定してください")

    items = _paginate({
        "IndexName": LOGS_INDEX_NAME,
        "KeyConditionExpression": (
            Key("PK").eq(f"CompanyName#{company}")
            & Key("start_time").between(start_from, start_to)
        ),
    })

    ordered = sorted(items, key=lambda item: str(item.get("start_time") or ""), reverse=True)
    return ordered, None


def _is_call_record(item):
    sk = str(item.get("SK") or "")
    return sk.startswith("CallSid#")


def _to_csv_cell(value):
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return str(int(value) if value % 1 == 0 else float(value))
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, default=_json_default)
    return str(value)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

def _list_companies():
    """GET /companies"""
    items = _paginate({"KeyConditionExpression": Key("PK").eq("Company")})
    companies = sorted({
        sk.split("#", 1)[1]
        for item in items
        if (sk := str(item.get("SK") or "")).startswith("CompanyName#")
    })
    return _response(200, companies)


def _to_log_summary(item, company):
    user_inputs = item.get("user_inputs") or []
    preview = " / ".join(
        v
        for ui in user_inputs
        if isinstance(ui, dict) and (v := str(ui.get("input") or "").strip())
    )
    return {
        "callSid": str(item.get("call_sid") or ""),
        "company": str(item.get("company") or company),
        "startedAt": str(item.get("start_time") or ""),
        "callFrom": str(item.get("call_from") or ""),
        "minutes": int(item.get("minutes") or 0),
        "status": str(item.get("status") or ""),
        "reviewStatus": "unreviewed",
        "inputPreview": preview,
    }


def _list_logs(event):
    """GET /logs?company=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD"""
    params = _query_params(event)
    company = str(params.get("company") or "").strip()
    status_checkpoint = str(params.get("statusCheckpoint") or "").strip()
    if not company:
        return _error(400, "company は必須です")

    items, error = _load_logs_items(company, params.get("startDate", ""), params.get("endDate", ""))
    if error:
        return error

    if status_checkpoint:
        items = _filter_items_by_status_checkpoint(items, status_checkpoint)

    summaries = [_to_log_summary(item, company) for item in items]
    return _response(200, {"items": summaries})


def _list_status_checkpoints(event):
    """GET /status-checkpoints?company=..."""
    params = _query_params(event)
    company = str(params.get("company") or "").strip()
    if not company:
        return _error(400, "company は必須です")

    result = table.get_item(Key={
        "PK": f"CompanyName#{company}",
        "SK": "ScenarioName#本番",
    })
    item = result.get("Item") or {}
    scenario = item.get("scenario") if isinstance(item.get("scenario"), list) else []

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

    return _response(200, {"items": values})


def _filter_items_by_status_checkpoint(items, status_checkpoint):
    value = str(status_checkpoint or "").strip()
    if not value:
        return items
    return [
        item
        for item in items
        if str(item.get("status") or item.get("user_status") or item.get("status_checkpoint") or "").strip() == value
    ]


def _to_history(item):
    def _str_list(val):
        return [str(v) for v in val] if isinstance(val, list) else []

    return {
        "call_sid": str(item.get("call_sid") or ""),
        "company": str(item.get("company") or ""),
        "start_time": str(item.get("start_time") or ""),
        "call_from": str(item.get("call_from") or ""),
        "call_to": str(item.get("call_to") or ""),
        "duration": str(item.get("duration") or ""),
        "minutes": int(item.get("minutes") or 0),
        "status": str(item.get("status") or ""),
        "user_status": str(item.get("user_status") or ""),
        "memo": str(item.get("memo") or ""),
        "recording_url": _str_list(item.get("recording_url")),
        "user_inputs": item.get("user_inputs") or [],
        "inputs_point": item.get("inputs_point") or [],
        "inputs_point_confirmed": item.get("inputs_point_confirmed") or [],
    }


def _get_log_detail(call_sid, event):
    """GET /logs/{callSid}?company=..."""
    params = _query_params(event)
    company = str(params.get("company") or "").strip()
    if not company:
        return _error(400, "company は必須です")

    result = table.get_item(Key={
        "PK": f"CompanyName#{company}",
        "SK": f"CallSid#{call_sid}",
    })
    item = result.get("Item")
    if not item:
        return _error(404, "レコードが見つかりません")

    return _response(200, {
        "callSid": str(item.get("call_sid") or call_sid),
        "history": _to_history(item),
        "transcriptionsByInput": {},
        "commentsByInput": {},
        "correctnessByInput": {},
        "reviewComment": str(item.get("review_comment") or ""),
        "reviewStatus": str(item.get("review_status") or "unreviewed"),
    })


def _render_csv(headers, rows):
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\r\n")
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue()


def _export_csv_to_s3(csv_text, company, kind):
    if not EXPORT_BUCKET_NAME:
        return None, _error(500, "EXPORT_BUCKET が設定されていません")

    now = datetime.now(JST)
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    day_folder = now.strftime("%Y-%m-%d")
    safe_company = company.strip().replace("/", "_")
    safe_prefix = EXPORT_PREFIX.strip("/")
    object_name = f"{safe_company}_{kind}_{timestamp}.csv"
    object_key = f"{safe_prefix}/{safe_company}/{day_folder}/{object_name}" if safe_prefix else object_name

    s3_client.put_object(
        Bucket=EXPORT_BUCKET_NAME,
        Key=object_key,
        Body=csv_text.encode("utf-8-sig"),
        ContentType="text/csv; charset=utf-8",
        ContentDisposition=f"attachment; filename={object_name}",
    )

    download_url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": EXPORT_BUCKET_NAME, "Key": object_key},
        ExpiresIn=EXPORT_URL_EXPIRES,
    )

    return _response(200, {
        "downloadUrl": download_url,
        "key": object_key,
        "expiresAt": (now + timedelta(seconds=EXPORT_URL_EXPIRES)).isoformat(timespec="seconds"),
    }), None


def _export_calls_csv(event):
    """GET /logs/csv/calls?company=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD"""
    params = _query_params(event)
    company = str(params.get("company") or "").strip()
    if not company:
        return _error(400, "company は必須です")

    items, error = _load_logs_items(company, params.get("startDate", ""), params.get("endDate", ""))
    if error:
        return error
    items = _filter_items_by_status_checkpoint(items, params.get("statusCheckpoint", ""))

    call_items = [item for item in items if _is_call_record(item)]
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
    rows = [[_to_csv_cell(item.get(header)) for header in headers] for item in call_items]

    csv_text = _render_csv(headers, rows)
    response, export_error = _export_csv_to_s3(csv_text, company, "calls")
    return export_error or response


def _export_transcriptions_csv(event):
    """GET /logs/csv/transcriptions?company=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD"""
    params = _query_params(event)
    company = str(params.get("company") or "").strip()
    if not company:
        return _error(400, "company は必須です")

    items, error = _load_logs_items(company, params.get("startDate", ""), params.get("endDate", ""))
    if error:
        return error
    items = _filter_items_by_status_checkpoint(items, params.get("statusCheckpoint", ""))

    headers = [
        "cid",
        "status",
        "recording_url",
        "created_time",
        "question_id",
        "input",
        "success",
    ]

    rows = []
    for item in items:
        if not _is_call_record(item):
            continue

        points = item.get("inputs_point") if isinstance(item.get("inputs_point"), list) else []
        recording_urls = item.get("recording_url") if isinstance(item.get("recording_url"), list) else []
        recording_url = str(recording_urls[0] or "") if recording_urls else ""
        cid = str(item.get("call_sid") or "")
        status = str(item.get("status") or "")

        for point in points:
            if not isinstance(point, dict):
                continue
            rows.append([
                cid,
                status,
                recording_url,
                str(point.get("created_time") or ""),
                str(point.get("question_id") or ""),
                str(point.get("input") or ""),
                "TRUE",
            ])

    csv_text = _render_csv(headers, rows)
    response, export_error = _export_csv_to_s3(csv_text, company, "transcriptions")
    return export_error or response


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

def lambda_handler(event, context):
    method = str(event.get("httpMethod") or "GET").upper()
    path = _parse_path(event)

    if method == "OPTIONS":
        return _response(200, {"ok": True})

    if path == "companies" and method == "GET":
        return _list_companies()

    if path == "logs" and method == "GET":
        return _list_logs(event)

    if path == "status-checkpoints" and method == "GET":
        return _list_status_checkpoints(event)

    if path == "logs/csv/calls" and method == "GET":
        return _export_calls_csv(event)

    if path == "logs/csv/transcriptions" and method == "GET":
        return _export_transcriptions_csv(event)

    if path.startswith("logs/") and method == "GET":
        call_sid = path[len("logs/"):]
        return _get_log_detail(call_sid, event)

    return _error(404, f"Not Found: {method} /{path}")
