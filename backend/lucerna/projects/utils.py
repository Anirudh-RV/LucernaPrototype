import logging

from .models import Project, UserProjectMapping
from .data_classes import ProjectCreateResult, ProjectListResult

logger = logging.getLogger(__name__)


class ProjectUtils:
    @staticmethod
    def validate_create_project_payload(payload: dict):
        """
        Inline validator for create project request payload.
        Returns (is_valid: bool, data_or_errors: dict)
        """
        errors = []
        if not isinstance(payload, dict):
            return False, {"errors": ["invalid_json"]}

        # project_name
        name = payload.get("project_name")
        if name is None:
            errors.append("project_name is required")
        else:
            if not isinstance(name, str):
                errors.append("project_name must be a string")
            else:
                name = name.strip()
                if not name:
                    errors.append("project_name is required")
                elif len(name) > 255:
                    errors.append("project_name too long (max 255)")

        # project_description (optional)
        desc = payload.get("project_description", "")
        if desc is None:
            desc = ""
        if not isinstance(desc, str):
            errors.append("project_description must be a string")
        elif len(desc) > 300:
            errors.append("project_description max 300 characters")

        if errors:
            return False, {"errors": errors}
        
        domain = payload.get("project_domain", "")

        return True, {"project_name": name, "project_description": desc, "project_domain": domain}

    @staticmethod
    def create_project(*, payload: dict, user) -> ProjectCreateResult:
        """
        Validates the payload and delegates DB work to the ProjectManager.
        Returns a ProjectCreateResult — never raises.
        """
        # --- Validation ---
        try:
            is_valid, result = ProjectUtils.validate_create_project_payload(payload)
        except Exception as exc:
            logger.exception("ProjectService: validation raised an unexpected exception")
            return ProjectCreateResult(
                success=False,
                error_code="project_creation_failed",
                errors=[str(exc)],
            )

        if not is_valid:
            logger.warning("ProjectService: payload validation failed: %s", result)
            return ProjectCreateResult(
                success=False,
                error_code="project_creation_failed",
                errors=result.get("errors", []),
            )

        project_name: str = result.get("project_name", "").strip() # type: ignore
        project_description: str = result.get("project_description", "").strip() # type: ignore
        project_domain: str = result.get("project_domain", "") # type: ignore

        if not project_name:
            return ProjectCreateResult(
                success=False,
                error_code="project_creation_failed",
                errors=["project_name_missing"],
            )

        try:
            project = Project.objects.create_project( # type: ignore
                name=project_name,
                description=project_description,
                domain=project_domain,
                user=user,
            )
        except Exception as exc:
            logger.exception("ProjectService: DB exception while creating project")
            return ProjectCreateResult(
                success=False,
                error_code="project_creation_failed",
                errors=[str(exc)],
            )

        return ProjectCreateResult(success=True, project=project)
    

    @staticmethod
    def list_projects(*, user) -> ProjectListResult:
        """
        Fetches all active projects for a user and serializes them.
        Returns a ProjectListResult — never raises.
        """
        try:
            mappings = UserProjectMapping.objects.get_projects_for_user(user=user) # type: ignore
            projects = [
                {
                    "id": str(mapping.project.id),
                    "name": mapping.project.name,
                    "description": mapping.project.description,
                    "domain": mapping.project.domain,
                    "created_at": mapping.project.created_at.isoformat(),
                    "updated_at": mapping.project.updated_at.isoformat(),
                    "is_active": mapping.project.is_active,
                    "created_by": str(mapping.project.created_by_id),  # type: ignore
                    "privilege": mapping.privilege,
                }
                for mapping in mappings
            ]
        except Exception as exc:
            logger.exception("ProjectService: failed to list projects for user=%s", user.id)
            return ProjectListResult(
                success=False,
                error_code="projects_list_failed",
                errors=[str(exc)],
            )
 
        return ProjectListResult(success=True, projects=projects)