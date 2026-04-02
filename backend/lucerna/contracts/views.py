"""
views.py — contracts app
All views are Django class-based views (no DRF).
JSON in, JSON out.
"""

import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils.text import slugify

from .models import ColumnDefinition, ColumnType, TableDefinition, Stakeholder, StakeholderContractAccess
from .schema_utils import SchemaUtils
from projects.models import Project


@method_decorator(csrf_exempt, name="dispatch")
class TableDefinitionListCreateView(View):

    def get(self, request):
        qs = TableDefinition.objects.select_related("project", "created_by").prefetch_related("columns")
        project_id = request.GET.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)

        data = [
            {
                "id":            str(td.id),
                "project":       str(td.project_id),
                "project_name":  td.project.name,
                "name":          td.name,
                "slug":          td.slug,
                "description":   td.description,
                "pg_table_name": td.pg_table_name,
                "is_created":    td.is_created,
                "column_count":  td.columns.count(),
                "created_at":    td.created_at.isoformat(),
            }
            for td in qs.order_by("-created_at")
        ]
        return JsonResponse({"count": len(data), "results": data})

    def post(self, request):
        body, err = SchemaUtils.parse_body(request)
        if err:
            return err

        # Required fields
        name = body.get("name", "").strip()
        project_id = body.get("project")
        if not name or not project_id:
            return JsonResponse({"error": "'name' and 'project' are required."}, status=400)

        slug = body.get("slug") or slugify(name).replace("-", "_")
        columns_data = body.get("columns", [])

        # Validate project exists
        from projects.models import Project
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return JsonResponse({"error": "Project not found."}, status=404)

        # Check slug uniqueness within project
        if TableDefinition.objects.filter(project=project, slug=slug).exists():
            return JsonResponse({"error": f"Slug '{slug}' already exists in this project."}, status=400)

        td = TableDefinition.objects.create(
            project=project,
            name=name,
            slug=slug,
            description=body.get("description", ""),
            created_by=request.user,
        )

        created_columns = []
        for idx, col in enumerate(columns_data):
            col_name = col.get("column_name", "").strip()
            col_type = col.get("column_type", ColumnType.VARCHAR)
            if not col_name:
                continue
            cd = ColumnDefinition.objects.create(
                table_definition=td,
                column_name=col_name,
                display_name=col.get("display_name", col_name),
                column_type=col_type,
                is_required=col.get("is_required", False),
                is_unique=col.get("is_unique", False),
                default_value=col.get("default_value"),
                contract_id_prefix=col.get("contract_id_prefix"),
                max_digits=col.get("max_digits", 15),
                decimal_places=col.get("decimal_places", 2),
                order=col.get("order", idx),
            )
            created_columns.append({"id": str(cd.id), "column_name": cd.column_name})

        return JsonResponse(
            {
                "id":            str(td.id),
                "pg_table_name": td.pg_table_name,
                "slug":          td.slug,
                "columns":       created_columns,
            },
            status=201,
        )


@method_decorator(csrf_exempt, name="dispatch")
class TableDefinitionDetailView(View):

    def _get_object(self, pk):
        try:
            return TableDefinition.objects.select_related("project").prefetch_related("columns").get(pk=pk)
        except TableDefinition.DoesNotExist:
            return None

    def get(self, request, pk):
        td = self._get_object(pk)
        if not td:
            return JsonResponse({"error": "Not found."}, status=404)

        columns = [
            {
                "id":                  str(c.id),
                "column_name":         c.column_name,
                "display_name":        c.display_name,
                "column_type":         c.column_type,
                "column_type_display": c.get_column_type_display(),
                "is_required":         c.is_required,
                "is_unique":           c.is_unique,
                "default_value":       c.default_value,
                "contract_id_prefix":  c.contract_id_prefix,
                "max_digits":          c.max_digits,
                "decimal_places":      c.decimal_places,
                "order":               c.order,
            }
            for c in td.columns.order_by("order", "created_at")
        ]

        return JsonResponse(
            {
                "id":            str(td.id),
                "project":       str(td.project_id),
                "project_name":  td.project.name,
                "name":          td.name,
                "slug":          td.slug,
                "description":   td.description,
                "pg_table_name": td.pg_table_name,
                "is_created":    td.is_created,
                "columns":       columns,
                "created_at":    td.created_at.isoformat(),
                "updated_at":    td.updated_at.isoformat(),
            }
        )

    def patch(self, request, pk):
        td = self._get_object(pk)
        if not td:
            return JsonResponse({"error": "Not found."}, status=404)

        body, err = SchemaUtils.parse_body(request)
        if err:
            return err

        # Only allow updating name and description — slug/pg_table_name are immutable
        if "name" in body:
            td.name = body["name"].strip()
        if "description" in body:
            td.description = body["description"]
        td.save(update_fields=["name", "description", "updated_at"])

        return JsonResponse({"id": str(td.id), "name": td.name, "description": td.description})

    def delete(self, request, pk):
        td = self._get_object(pk)
        if not td:
            return JsonResponse({"error": "Not found."}, status=404)
        if td.is_created:
            return JsonResponse(
                {"error": "Drop the Postgres table first before deleting this definition."},
                status=400,
            )
        td.delete()
        return JsonResponse({"detail": "Deleted."}, status=200)


@method_decorator(csrf_exempt, name="dispatch")
class CreateTableView(View):

    def post(self, request, pk):
        try:
            td = TableDefinition.objects.get(pk=pk)
        except TableDefinition.DoesNotExist:
            return JsonResponse({"error": "Not found."}, status=404)

        if td.is_created:
            return JsonResponse(
                {"detail": "Table already exists.", "pg_table_name": td.pg_table_name},
                status=200,
            )

        try:
            SchemaUtils.create_table(td, performed_by=request.user)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=500)

        return JsonResponse(
            {"detail": "Table created successfully.", "pg_table_name": td.pg_table_name},
            status=201,
        )


@method_decorator(csrf_exempt, name="dispatch")
class DropTableView(View):

    def post(self, request, pk):
        try:
            td = TableDefinition.objects.get(pk=pk)
        except TableDefinition.DoesNotExist:
            return JsonResponse({"error": "Not found."}, status=404)

        if not td.is_created:
            return JsonResponse({"error": "Table does not exist in Postgres."}, status=400)

        try:
            SchemaUtils.drop_table(td, performed_by=request.user)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=500)

        return JsonResponse({"detail": "Table dropped."})


@method_decorator(csrf_exempt, name="dispatch")
class TableRowsView(View):

    def _get_table(self, pk):
        try:
            return TableDefinition.objects.get(pk=pk)
        except TableDefinition.DoesNotExist:
            return None

    def get(self, request, pk):
        td = self._get_table(pk)
        if not td:
            return JsonResponse({"error": "Not found."}, status=404)
        if not td.is_created:
            return JsonResponse({"error": "Table has not been created yet."}, status=400)

        filters = {k: v for k, v in request.GET.items()}
        try:
            rows = SchemaUtils.fetch_rows(td, filters or None)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=500)

        return JsonResponse({"count": len(rows), "results": rows})

    def post(self, request, pk):
        td = self._get_table(pk)
        if not td:
            return JsonResponse({"error": "Not found."}, status=404)
        if not td.is_created:
            return JsonResponse({"error": "Table has not been created yet."}, status=400)

        body, err = SchemaUtils.parse_body(request)
        if err:
            return err

        valid_columns = set(td.columns.values_list("column_name", flat=True))
        unknown = set(body.keys()) - valid_columns
        if unknown:
            return JsonResponse({"error": f"Unknown columns: {', '.join(sorted(unknown))}"}, status=400)

        # Exclude auto-generated types from required check
        AUTO_TYPES = {ColumnType.CONTRACT_ID, ColumnType.UUID}
        required = set(
            td.columns
            .filter(is_required=True)
            .exclude(column_type__in=AUTO_TYPES)
            .values_list("column_name", flat=True)
        )
        missing = required - set(body.keys())
        if missing:
            return JsonResponse({"error": f"Required columns missing: {', '.join(sorted(missing))}"}, status=400)

        try:
            row_id = SchemaUtils.insert_row(td, body)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=500)

        return JsonResponse({"id": row_id}, status=201)

@method_decorator(csrf_exempt, name="dispatch")
class ColumnDefinitionCreateView(View):

    def post(self, request):
        body, err = SchemaUtils.parse_body(request)
        if err:
            return err

        table_definition_id = body.get("table_definition")
        column_name = body.get("column_name", "").strip()
        if not table_definition_id or not column_name:
            return JsonResponse({"error": "'table_definition' and 'column_name' are required."}, status=400)

        try:
            td = TableDefinition.objects.get(pk=table_definition_id)
        except TableDefinition.DoesNotExist:
            return JsonResponse({"error": "TableDefinition not found."}, status=404)

        if ColumnDefinition.objects.filter(table_definition=td, column_name=column_name).exists():
            return JsonResponse({"error": f"Column '{column_name}' already exists."}, status=400)

        col = ColumnDefinition.objects.create(
            table_definition=td,
            column_name=column_name,
            display_name=body.get("display_name", column_name),
            column_type=body.get("column_type", ColumnType.VARCHAR),
            is_required=body.get("is_required", False),
            is_unique=body.get("is_unique", False),
            default_value=body.get("default_value"),
            contract_id_prefix=body.get("contract_id_prefix"),
            max_digits=body.get("max_digits", 15),
            decimal_places=body.get("decimal_places", 2),
            order=body.get("order", 0),
        )

        return JsonResponse(
            {
                "id":                 str(col.id),
                "column_name":        col.column_name,
                "display_name":       col.display_name,
                "column_type":        col.column_type,
                "column_type_display":col.get_column_type_display(),
                "is_required":        col.is_required,
                "is_unique":          col.is_unique,
                "order":              col.order,
            },
            status=201,
        )


@method_decorator(csrf_exempt, name="dispatch")
class ColumnDefinitionDetailView(View):

    def _get_object(self, pk):
        try:
            return ColumnDefinition.objects.select_related("table_definition").get(pk=pk)
        except ColumnDefinition.DoesNotExist:
            return None

    def get(self, request, pk):
        col = self._get_object(pk)
        if not col:
            return JsonResponse({"error": "Not found."}, status=404)

        return JsonResponse(
            {
                "id":                  str(col.id),
                "table_definition":    str(col.table_definition_id),
                "column_name":         col.column_name,
                "display_name":        col.display_name,
                "column_type":         col.column_type,
                "column_type_display": col.get_column_type_display(),
                "is_required":         col.is_required,
                "is_unique":           col.is_unique,
                "default_value":       col.default_value,
                "contract_id_prefix":  col.contract_id_prefix,
                "max_digits":          col.max_digits,
                "decimal_places":      col.decimal_places,
                "order":               col.order,
                "created_at":          col.created_at.isoformat(),
                "updated_at":          col.updated_at.isoformat(),
            }
        )

    def patch(self, request, pk):
        col = self._get_object(pk)
        if not col:
            return JsonResponse({"error": "Not found."}, status=404)

        body, err = SchemaUtils.parse_body(request)
        if err:
            return err

        # column_name and column_type are immutable once the PG table is created
        td = col.table_definition
        mutable_always = ["display_name", "is_required", "is_unique", "default_value",
                          "contract_id_prefix", "max_digits", "decimal_places", "order"]
        mutable_pre_create = ["column_name", "column_type"]

        updated_fields = ["updated_at"]
        for field in mutable_always:
            if field in body:
                setattr(col, field, body[field])
                updated_fields.append(field)

        if not td.is_created:
            for field in mutable_pre_create:
                if field in body:
                    setattr(col, field, body[field])
                    updated_fields.append(field)
        else:
            if any(f in body for f in mutable_pre_create):
                return JsonResponse(
                    {"error": "column_name and column_type cannot be changed after the table has been created."},
                    status=400,
                )

        col.save(update_fields=list(set(updated_fields)))
        return JsonResponse({"id": str(col.id), "column_name": col.column_name, "column_type": col.column_type})

    def delete(self, request, pk):
        col = self._get_object(pk)
        if not col:
            return JsonResponse({"error": "Not found."}, status=404)
        if col.table_definition.is_created:
            return JsonResponse(
                {"error": "Cannot delete a column definition after the table has been created."},
                status=400,
            )
        col.delete()
        return JsonResponse({"detail": "Deleted."})


@method_decorator(csrf_exempt, name="dispatch")
class ApplyColumnView(View):

    def post(self, request, pk):
        try:
            col = ColumnDefinition.objects.select_related("table_definition").get(pk=pk)
        except ColumnDefinition.DoesNotExist:
            return JsonResponse({"error": "Not found."}, status=404)

        td = col.table_definition
        if not td.is_created:
            return JsonResponse({"error": "Parent table has not been created yet."}, status=400)

        try:
            SchemaUtils.add_column(td, col, performed_by=request.user)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=500)

        return JsonResponse({"detail": f"Column '{col.column_name}' added to {td.pg_table_name}."})


class ColumnTypeChoicesView(View):

    def get(self, request):
        choices = [{"value": v, "display": d} for v, d in ColumnType.choices]
        return JsonResponse({"results": choices})


@method_decorator(csrf_exempt, name="dispatch")
class TableRowDetailView(View):
 
    def _get_table(self, pk):
        try:
            return TableDefinition.objects.prefetch_related("columns").get(pk=pk)
        except TableDefinition.DoesNotExist:
            return None
 
    def patch(self, request, pk, row_id):
        """Update specific columns of an existing row."""
        td = self._get_table(pk)
        if not td:
            return JsonResponse({"error": "TableDefinition not found."}, status=404)
        if not td.is_created:
            return JsonResponse({"error": "Table has not been created yet."}, status=400)
 
        body, err = SchemaUtils.parse_body(request)
        if err:
            return err
 
        # Only allow columns that exist AND are not immutable auto types
        immutable_types = {"uuid", "contract_id"}
        valid_columns = {
            c.column_name
            for c in td.columns.all()
            if c.column_type not in immutable_types
        }
        unknown = set(body.keys()) - valid_columns
        if unknown:
            return JsonResponse(
                {"error": f"Unknown or immutable columns: {', '.join(sorted(unknown))}"},
                status=400,
            )
 
        try:
            updated = SchemaUtils.update_row(td, row_id, body)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=500)
 
        if not updated:
            return JsonResponse({"error": "Row not found."}, status=404)
 
        return JsonResponse({"id": row_id, "updated": list(body.keys())})
 
    def delete(self, request, pk, row_id):
        """Delete a single row by id."""
        td = self._get_table(pk)
        if not td:
            return JsonResponse({"error": "TableDefinition not found."}, status=404)
        if not td.is_created:
            return JsonResponse({"error": "Table has not been created yet."}, status=400)
 
        try:
            deleted = SchemaUtils.delete_row(td, row_id)
        except Exception as exc:
            return JsonResponse({"error": str(exc)}, status=500)
 
        if not deleted:
            return JsonResponse({"error": "Row not found."}, status=404)
 
        return JsonResponse({"detail": "Row deleted."})


@method_decorator(csrf_exempt, name="dispatch")
class StakeholderListCreateView(View):
 
    def get(self, request):
        project_id = request.GET.get("project")
        qs = Stakeholder.objects.prefetch_related("contract_access").all()
        print(f"qs: {qs}")
        return JsonResponse({
            "count":   qs.count(),
            "results": [SchemaUtils.serialize_stakeholder(s, project_id=project_id) for s in qs],
        })
 
    def post(self, request):
        body, err = SchemaUtils.parse_body(request)
        if err:
            return err

        project_id = body.get("project")
        name       = body.get("name", "").strip()
        phone      = body.get("phone", "").strip()

        if not project_id or not name:
            return JsonResponse({"error": "'project' and 'name' are required."}, status=400)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return JsonResponse({"error": "Project not found."}, status=404)

        # Reuse existing stakeholder if phone matches
        if phone:
            print("COMING HERE")
            stakeholder, _ = Stakeholder.objects.get_or_create(
                phone    = phone,
                defaults = {
                    "project":    project,
                    "name":       name,
                    "created_by": request.user,
                }
            )
        else:
            stakeholder = Stakeholder.objects.create(
                project    = project,
                name       = name,
                phone      = phone,
                created_by = request.user,
            )

        # Create/update access rule
        access_data      = body.get("contract_access", {})
        all_contracts    = access_data.get("all_contracts", True)
        contract_row_ids = access_data.get("contract_row_ids", [])
        table_def_id     = access_data.get("table_definition")
        email = access_data.get("email", "")

        table_def = None
        if table_def_id:
            try:
                table_def = TableDefinition.objects.get(id=table_def_id, project=project)
            except TableDefinition.DoesNotExist:
                return JsonResponse({"error": "TableDefinition not found."}, status=404)

        print(f"ADDING EMAIL: {email}")
        print(f"ADDING contract_row_ids: {contract_row_ids}")
        StakeholderContractAccess.objects.update_or_create(
            stakeholder      = stakeholder,
            table_definition = table_def,
            defaults={
                "email":            email,
                "all_contracts":    all_contracts,
                "contract_row_ids": contract_row_ids if not all_contracts else [],
            }
        )

        return JsonResponse(SchemaUtils.serialize_stakeholder(stakeholder), status=201)
 
 
@method_decorator(csrf_exempt, name="dispatch")
class StakeholderDetailView(View):
 
    def _get(self, pk):
        try:
            return Stakeholder.objects.select_related("contract_access").get(pk=pk)
        except Stakeholder.DoesNotExist:
            return None
 
    def get(self, request, pk):
        s = self._get(pk)
        if not s:
            return JsonResponse({"error": "Not found."}, status=404)
        return JsonResponse(SchemaUtils.serialize_stakeholder(s))
 
    def patch(self, request, pk):
        s = self._get(pk)
        if not s:
            return JsonResponse({"error": "Not found."}, status=404)
 
        body, err = SchemaUtils.parse_body(request)
        if err:
            return err
 
        # Update stakeholder fields
        for field in ("name", "email", "phone"):
            if field in body:
                setattr(s, field, body[field])
        s.save(update_fields=["name", "email", "phone", "updated_at"])
 
        # Update access rule if provided
        if "contract_access" in body:
            access_data = body["contract_access"]
            access, _ = StakeholderContractAccess.objects.get_or_create(stakeholder=s)
 
            if "all_contracts" in access_data:
                access.all_contracts = access_data["all_contracts"]
            if "contract_row_ids" in access_data:
                access.contract_row_ids = access_data["contract_row_ids"]
            if "table_definition" in access_data:
                td_id = access_data["table_definition"]
                if td_id is None:
                    access.table_definition = None
                else:
                    try:
                        access.table_definition = TableDefinition.objects.get(id=td_id, project=s.project)
                    except TableDefinition.DoesNotExist:
                        return JsonResponse({"error": "TableDefinition not found."}, status=404)
 
            # Clear row IDs if switching to all_contracts
            if access.all_contracts:
                access.contract_row_ids = []
 
            access.save()
 
        return JsonResponse(SchemaUtils.serialize_stakeholder(s))
 
    def delete(self, request, pk):
        s = self._get(pk)
        if not s:
            return JsonResponse({"error": "Not found."}, status=404)
        s.delete()
        return JsonResponse({"detail": "Deleted."})
 