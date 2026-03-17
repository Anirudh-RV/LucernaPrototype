from django.contrib import admin
from .models import Project, UserProjectMapping


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'is_active', 'created_at', 'domain')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'name', 'description', 'domain')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Ownership', {
            'fields': ('created_by',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(UserProjectMapping)
class UserProjectMappingAdmin(admin.ModelAdmin):
    list_display = ('user', 'project', 'privilege', 'is_active', 'created_at')
    list_filter = ('privilege', 'is_active', 'created_at')
    search_fields = ('user__email', 'project__name')
    readonly_fields = ('created_at', 'updated_at')