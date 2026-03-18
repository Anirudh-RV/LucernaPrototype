from django.contrib import admin
from django.utils.html import format_html
from .models import (
    TableDefinition,
    ColumnDefinition,
    TableCreationLog,
    Stakeholder,
    StakeholderContractAccess,
)

# -------------------------
# Inlines
# -------------------------
class ColumnDefinitionInline(admin.TabularInline):
    model = ColumnDefinition
    extra = 0
    fields = (
        "column_name",
        "display_name",
        "column_type",
        "is_required",
        "is_unique",
        "order",
    )
    readonly_fields = ()
    ordering = ("order", "created_at")
    show_change_link = True


class StakeholderContractAccessInline(admin.StackedInline):
    model = StakeholderContractAccess
    extra = 0
    fields = ("table_definition", "all_contracts", "contract_row_ids", "updated_at")
    readonly_fields = ("updated_at",)


# -------------------------
# ModelAdmin definitions
# -------------------------
@admin.register(TableDefinition)
class TableDefinitionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "pg_table_name",
        "project",
        "is_created",
        "created_by",
        "created_at",
        "updated_at",
    )
    list_filter = ("project", "is_created", "created_by")
    search_fields = ("name", "slug", "pg_table_name")
    readonly_fields = ("pg_table_name", "is_created", "created_at", "updated_at")
    prepopulated_fields = {"slug": ("name",)}
    inlines = (ColumnDefinitionInline,)
    ordering = ("-created_at",)
    fieldsets = (
        (None, {"fields": ("name", "slug", "description", "project", "created_by")}),
        ("System", {"fields": ("pg_table_name", "is_created", "created_at", "updated_at")}),
    )


@admin.register(ColumnDefinition)
class ColumnDefinitionAdmin(admin.ModelAdmin):
    list_display = (
        "short_table",
        "column_name",
        "display_name",
        "column_type",
        "is_required",
        "is_unique",
        "order",
    )
    list_filter = ("column_type", "is_required", "is_unique")
    search_fields = ("column_name", "display_name", "table_definition__name")
    ordering = ("table_definition", "order", "created_at")
    list_editable = ("order",)
    raw_id_fields = ("table_definition",)

    def short_table(self, obj):
        return format_html(
            "<strong>{}</strong><br><small>{}</small>",
            obj.table_definition.name,
            obj.table_definition.pg_table_name,
        )
    short_table.short_description = "Table"


@admin.register(TableCreationLog)
class TableCreationLogAdmin(admin.ModelAdmin):
    list_display = ("table_definition", "operation", "performed_by", "performed_at", "success")
    list_filter = ("operation", "success", "performed_by")
    search_fields = ("table_definition__name", "detail")
    readonly_fields = ("performed_at",)
    ordering = ("-performed_at",)


@admin.register(Stakeholder)
class StakeholderAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "email", "phone", "created_by", "updated_at")
    search_fields = ("name", "email", "phone", "project__name")
    list_filter = ("project",)
    inlines = (StakeholderContractAccessInline,)
    raw_id_fields = ("project", "created_by")


@admin.register(StakeholderContractAccess)
class StakeholderContractAccessAdmin(admin.ModelAdmin):
    list_display = ("stakeholder", "table_definition", "all_contracts", "rows_count", "updated_at")
    list_filter = ("all_contracts", "table_definition")
    search_fields = ("stakeholder__name", "stakeholder__email", "table_definition__name")
    readonly_fields = ("updated_at",)

    def rows_count(self, obj):
        if obj.all_contracts:
            return format_html("<em>all</em>")
        return len(obj.contract_row_ids or [])
    rows_count.short_description = "Allowed rows"