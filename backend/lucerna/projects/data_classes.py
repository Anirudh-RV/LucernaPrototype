from dataclasses import dataclass, field
from typing import Optional
from .models import Project

@dataclass
class ProjectCreateResult:
    success: bool
    project: Optional[Project] = None
    error_code: Optional[str] = None
    errors: list[str] = field(default_factory=list)
    

@dataclass
class ProjectListResult:
    success: bool
    projects: list[dict] = field(default_factory=list)
    error_code: Optional[str] = None
    errors: list[str] = field(default_factory=list)
    