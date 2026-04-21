"""
stakeholder_portal_views.py
----------------------------
Read-only API views for authenticated stakeholders.
Protected by stakeholder_auth_required decorator — every request
has request.stakeholder and request.stakeholder_access_rules available.
"""

import json
import logging

from django.http import JsonResponse
from django.views import View

from .models import TableDefinition, StakeholderContractAccess
from .schema_utils import SchemaUtils

logger = logging.getLogger(__name__)


class StakeholderPortalTablesView(View):
    """
    GET /api/contracts/portal/tables/

    Returns all table definitions the stakeholder has access to,
    along with the column definitions they are permitted to see.
    """

    def get(self, request):
        stakeholder = request.stakeholder
        access_rules = request.stakeholder_access_rules

        tables = []

        for access in access_rules:
            td = access.table_definition
            if td is None or not td.is_created:
                continue

            # Build column list — filter to allowed columns if restricted
            all_columns = list(td.columns.order_by("order", "created_at"))

            if access.all_columns:
                visible_columns = all_columns
            else:
                allowed_keys = set(access.allowed_column_keys or [])
                visible_columns = [c for c in all_columns if c.column_name in allowed_keys]

            tables.append({
                "id": str(td.id),
                "name": td.name,
                "description": td.description,
                "role": access.role,
                "all_contracts": access.all_contracts,
                "columns": [
                    {
                        "column_name": c.column_name,
                        "display_name": c.display_name,
                        "column_type": c.column_type,
                        "is_required": c.is_required,
                        "order": c.order,
                    }
                    for c in visible_columns
                ],
            })

        return JsonResponse({"tables": tables})


class StakeholderPortalRowsView(View):
    """
    GET /api/contracts/portal/tables/<uuid:table_id>/rows/

    Returns the rows of a specific table, filtered by the stakeholder's
    row-level and column-level access rules.
    """

    def get(self, request, table_id):
        stakeholder = request.stakeholder
        access_rules = request.stakeholder_access_rules

        # Find the access rule for this specific table
        access = access_rules.filter(table_definition_id=table_id).first()
        if access is None:
            return JsonResponse(
                {"error": "You do not have access to this table."},
                status=403,
            )

        td = access.table_definition
        if td is None or not td.is_created:
            return JsonResponse(
                {"error": "Table not found or not available."},
                status=404,
            )

        # Fetch all rows
        try:
            all_rows = SchemaUtils.fetch_rows(td)
        except Exception as exc:
            logger.exception("Error fetching rows from %s: %s", td.pg_table_name, exc)
            return JsonResponse(
                {"error": "Failed to load data."},
                status=500,
            )

        # Filter rows — row-level access
        if access.all_contracts:
            visible_rows = all_rows
        else:
            allowed_ids = set(access.contract_row_ids or [])
            visible_rows = [r for r in all_rows if r.get("id") in allowed_ids]

        # Filter columns on each row
        filtered_rows = [access.filter_row(row) for row in visible_rows]

        # Build column metadata for the frontend
        all_columns = list(td.columns.order_by("order", "created_at"))
        if access.all_columns:
            visible_columns = all_columns
        else:
            allowed_keys = set(access.allowed_column_keys or [])
            visible_columns = [c for c in all_columns if c.column_name in allowed_keys]

        return JsonResponse({
            "table": {
                "id": str(td.id),
                "name": td.name,
                "role": access.role,
            },
            "columns": [
                {
                    "column_name": c.column_name,
                    "display_name": c.display_name,
                    "column_type": c.column_type,
                }
                for c in visible_columns
            ],
            "rows": filtered_rows,
            "total_count": len(filtered_rows),
        })
