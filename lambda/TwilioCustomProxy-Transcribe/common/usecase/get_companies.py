from common.repository.transcribe_repository import list_company_name_items
from common.response.http_response import response


def execute():
    return response(200, {"results": list_company_name_items()})