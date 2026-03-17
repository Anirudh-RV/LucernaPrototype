# Create your models here.
import uuid
from django.db import models
from django.utils import timezone
from users.models import User
from .managers import ProjectManager, UserProjectMappingManager


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    domain = models.URLField(max_length=200, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "users.User", on_delete=models.PROTECT, related_name="created_projects"
    )
 
    objects = ProjectManager()
 
    class Meta:
        db_table = "project"
        indexes = [models.Index(fields=["created_at"])]
 
    def __str__(self):
        return f"{self.name} ({self.id})"



class UserProjectMapping(models.Model):
    # PRIVILEGE: 1 = Admin, 2 = Member
    PRIVILEGE_ADMIN = 1
    PRIVILEGE_MEMBER = 2
    PRIVILEGE_CHOICES = (
        (PRIVILEGE_ADMIN, 'Admin'),
        (PRIVILEGE_MEMBER, 'Member'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='project_mappings')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='user_mappings')
    privilege = models.PositiveSmallIntegerField(choices=PRIVILEGE_CHOICES, default=PRIVILEGE_MEMBER)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    objects = UserProjectMappingManager()


    class Meta:
        db_table = 'user_project_mapping'
        unique_together = ('user', 'project')
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['project']),
        ]

    def __str__(self):
        return f"{self.user_id} -> {self.project_id} ({self.privilege})" # type: ignore