def parse_path(event):
    """TwilioCustomProxy が渡す specific_path、または path から末尾パスを取り出す"""
    specific_path = str(event.get("specific_path") or "").strip("/")
    if specific_path:
        return specific_path
    path = str(event.get("path") or "").strip("/")
    parts = path.split("/")
    if len(parts) >= 3 and parts[0] == "services":
        return "/".join(parts[2:])
    return ""


def query_params(event):
    params = event.get("queryStringParameters") or {}
    return {str(k): v for k, v in params.items()} if isinstance(params, dict) else {}


def to_bool(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}
