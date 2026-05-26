from common.repository.transcribe_repository import list_company_names
from common.response.http_response import response


def execute():
    return response(200, list_company_names())