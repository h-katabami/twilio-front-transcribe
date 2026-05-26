def to_log_summary(item, company):
    user_inputs = item.get("user_inputs") or []
    preview = " / ".join(
        value
        for ui in user_inputs
        if isinstance(ui, dict) and (value := str(ui.get("input") or "").strip())
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


def to_history(item):
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