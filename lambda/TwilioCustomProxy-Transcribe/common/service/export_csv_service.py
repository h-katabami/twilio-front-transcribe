import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal

from common.response.http_response import error, json_default, response
from common.service.app_context import EXPORT_BUCKET_NAME, EXPORT_PREFIX, EXPORT_URL_EXPIRES, JST, s3_client


def to_csv_cell(value):
    if value is None:
        return ""
    if isinstance(value, Decimal):
        return str(int(value) if value % 1 == 0 else float(value))
    if isinstance(value, (dict, list)):
        import json
        return json.dumps(value, ensure_ascii=False, default=json_default)
    return str(value)


def render_csv(headers, rows):
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\r\n")
    writer.writerow(headers)
    writer.writerows(rows)
    return buffer.getvalue()


def export_csv_to_s3(csv_text, company, kind):
    if not EXPORT_BUCKET_NAME:
        return None, error(500, "EXPORT_BUCKET が設定されていません")

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

    return response(200, {
        "downloadUrl": download_url,
        "key": object_key,
        "expiresAt": (now + timedelta(seconds=EXPORT_URL_EXPIRES)).isoformat(timespec="seconds"),
    }), None
