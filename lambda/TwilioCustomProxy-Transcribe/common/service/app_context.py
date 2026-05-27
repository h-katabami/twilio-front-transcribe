import logging
import os
from zoneinfo import ZoneInfo

import boto3

TABLE_NAME = os.getenv("MAIN_TABLE")
COMPANY_NAME_TABLE_NAME = os.getenv("COMPANY_NAME_TABLE")
LOGS_INDEX_NAME = os.getenv("TABLE_INDEX")
EXPORT_BUCKET_NAME = os.getenv("EXPORT_BUCKET")
EXPORT_PREFIX = "company"
EXPORT_URL_EXPIRES = int(os.getenv("EXPORT_URL_EXPIRES"))
JST = ZoneInfo("Asia/Tokyo")
TEST_PHONE_NUMBER = "+819078252706"

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)
company_name_table = dynamodb.Table(COMPANY_NAME_TABLE_NAME)
s3_client = boto3.client("s3")
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
