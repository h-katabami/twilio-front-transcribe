from datetime import datetime

from boto3.dynamodb.conditions import Key

from common.response.http_response import error
from common.service.app_context import LOGS_INDEX_NAME, TEST_PHONE_NUMBER, logger, table


def paginate(kwargs):
    items = []
    while True:
        res = table.query(**kwargs)
        items.extend(res.get("Items", []))
        lek = res.get("LastEvaluatedKey")
        if not lek:
            break
        kwargs["ExclusiveStartKey"] = lek
    return items


def format_start(date_str):
    if not date_str:
        return "0000-01-01T00:00:00+09:00"
    return datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m-%dT00:00:00+09:00")


def format_end(date_str):
    if not date_str:
        return "9999-12-31T23:59:59+09:00"
    return datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m-%dT23:59:59+09:00")


def load_logs_items(company, start_date, end_date):
    try:
        start_from = format_start(start_date)
        start_to = format_end(end_date)
    except ValueError:
        return None, error(400, "startDate/endDate は YYYY-MM-DD 形式で指定してください")

    items = paginate({
        "IndexName": LOGS_INDEX_NAME,
        "KeyConditionExpression": (
            Key("PK").eq(f"CompanyName#{company}")
            & Key("start_time").between(start_from, start_to)
        ),
    })
    ordered = sorted(items, key=lambda item: str(item.get("start_time") or ""), reverse=True)
    return ordered, None


def list_company_names():
    items = paginate({"KeyConditionExpression": Key("PK").eq("Company")})
    return sorted({
        sk.split("#", 1)[1]
        for item in items
        if (sk := str(item.get("SK") or "")).startswith("CompanyName#")
    })


def load_status_scenario(company):
    result = table.get_item(Key={
        "PK": f"CompanyName#{company}",
        "SK": "ScenarioName#本番",
    })
    item = result.get("Item") or {}
    return item.get("scenario") if isinstance(item.get("scenario"), list) else []


def get_log_item(company, call_sid):
    result = table.get_item(Key={
        "PK": f"CompanyName#{company}",
        "SK": f"CallSid#{call_sid}",
    })
    return result.get("Item")


def is_call_record(item):
    sk = str(item.get("SK") or "")
    return sk.startswith("CallSid#")


def get_full_call_item(item):
    if not is_call_record(item):
        return item

    has_points = isinstance(item.get("inputs_point"), list)
    has_user_inputs = isinstance(item.get("user_inputs"), list)
    has_recording_urls = isinstance(item.get("recording_url"), list)
    if has_points or has_user_inputs or has_recording_urls:
        return item

    pk = str(item.get("PK") or "")
    sk = str(item.get("SK") or "")
    if not pk or not sk:
        return item

    try:
        res = table.get_item(Key={"PK": pk, "SK": sk})
    except Exception:
        logger.exception("failed_to_get_full_call_item pk=%s sk=%s", pk, sk)
        return item

    full_item = res.get("Item")
    if not isinstance(full_item, dict):
        return item
    return full_item


def filter_items_by_status_checkpoint(items, status_checkpoint):
    value = str(status_checkpoint or "").strip()
    if not value:
        return items
    return [
        item
        for item in items
        if str(item.get("status") or item.get("user_status") or item.get("status_checkpoint") or "").strip() == value
    ]


def matches_test_phone(item):
    call_from = str(item.get("call_from") or "").strip()
    call_to = str(item.get("call_to") or "").strip()
    return call_from == TEST_PHONE_NUMBER or call_to == TEST_PHONE_NUMBER


def exclude_test_phone_items(items, exclude_test_number):
    if not exclude_test_number:
        return items

    filtered = []
    removed_count = 0
    hydrated_count = 0

    for item in items:
        if not is_call_record(item):
            filtered.append(item)
            continue

        target_item = item
        call_from = str(item.get("call_from") or "").strip()
        call_to = str(item.get("call_to") or "").strip()
        if not call_from and not call_to:
            full_item = get_full_call_item(item)
            if full_item is not item:
                hydrated_count += 1
                target_item = full_item

        if matches_test_phone(target_item):
            removed_count += 1
            continue

        filtered.append(item)

    logger.info(
        "exclude_test_phone applied=%s before=%s after=%s removed=%s hydrated=%s",
        exclude_test_number,
        len(items),
        len(filtered),
        removed_count,
        hydrated_count,
    )

    return filtered
