import json
from django.http import JsonResponse
from django.views import View

from .models import  UserProjectMapping
from .utils import ProjectUtils
from lucerna.logger import logger


class ProjectCreateView(View):
    """
    POST /api/project/v1/create/
    Body: { "project_name": "...", "project_description": "...", "project_domain": "..." }
    """
 
    def post(self, request, *args, **kwargs):
        logger.info("ProjectCreateView: user=%s email=%s", request.user.id, request.user.email)
 
        try:
            payload = json.loads(request.body or "{}")
        except json.JSONDecodeError:
            logger.warning("ProjectCreateView: invalid JSON")
            return JsonResponse(
                {"status": 0, "status_description": "invalid_json"},
                status=400,
            )
 
        result = ProjectUtils.create_project(payload=payload, user=request.user)
 
        if not result.success:
            return JsonResponse(
                {
                    "status": 0,
                    "status_description": result.error_code,
                    "errors": result.errors,
                },
                status=400,
            )
 
        project = result.project
        return JsonResponse(
            {
                "status": 1,
                "status_description": "project_created",
                "response_body": {
                    "project": {
                        "id": str(project.id), # type: ignore
                        "name": project.name, # type: ignore
                        "description": project.description, # type: ignore
                        "domain": project.domain, # type: ignore
                    }
                },
            },
            status=201,
        )

class ProjectListView(View):
    """
    GET /api/project/v1/list/
    """
 
    def get(self, request, *args, **kwargs):
        logger.info("ProjectListView: user=%s", request.user.id)
 
        result = ProjectUtils.list_projects(user=request.user)
 
        if not result.success:
            return JsonResponse(
                {
                    "status": 0,
                    "status_description": result.error_code,
                    "errors": result.errors,
                },
                status=500,
            )
 
        return JsonResponse(
            {
                "status": 1,
                "status_description": "projects_listed",
                "response_body": {"projects": result.projects},
            },
            status=200,
        )
 