import logging
from django.db import models, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class ProjectManager(models.Manager):
    def create_project(self, *, name: str, description: str, domain: str, user) -> "Project":  # type: ignore # noqa: F821
        """
        Creates a Project and the corresponding UserProjectMapping (admin privilege)
        in a single atomic transaction.
        """
        with transaction.atomic():
            project = self.create(
                name=name,
                description=description,
                domain=domain,
                created_by=user,
            )
            # Avoid a circular import — UserProjectMapping lives in the same app
            from .models import UserProjectMapping  # noqa: PLC0415

            UserProjectMapping.objects.create(
                user=user,
                project=project,
                privilege=UserProjectMapping.PRIVILEGE_ADMIN,
                created_at=timezone.now(),
            )
            logger.info("ProjectManager: created project=%s (%s) for user=%s", project.name, project.id, user.id)
            return project
        
class UserProjectMappingManager(models.Manager):
    def get_projects_for_user(self, *, user) -> models.QuerySet:
        """
        Returns active mappings with their related projects for a user,
        newest project first.
        """
        return (
            self.select_related("project")
            .filter(user=user, is_active=True, project__is_active=True)
            .order_by("-project__created_at")
        )