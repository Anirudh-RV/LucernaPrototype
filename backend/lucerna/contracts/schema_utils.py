"""
schema_service.py
-----------------
Handles all runtime DDL operations:
  - Building a Django Field instance from a ColumnDefinition
  - Creating a real Postgres table from a TableDefinition
  - Adding / dropping columns on an existing table
  - Dropping a table entirely

Uses Django's schema_editor so it respects the configured DB backend.
"""

from __future__ import annotations

from django.db import connection, models as django_models
from django.db.models.functions import Now
from .models import ColumnDefinition, ColumnType, TableCreationLog, TableDefinition


# ---------------------------------------------------------------------------
# Column type → Django Field mapping
# ---------------------------------------------------------------------------

def build_django_field(col: ColumnDefinition) -> django_models.Field:
    """Return a Django Field instance for a ColumnDefinition."""
    blank   = not col.is_required
    null    = not col.is_required
    default = col.default_value or django_models.fields.NOT_PROVIDED
    kwargs  = dict(blank=blank, null=null, unique=col.is_unique, db_column=col.column_name)

    if default is not django_models.fields.NOT_PROVIDED:
        kwargs["default"] = default

    match col.column_type:
        case ColumnType.TEXT:
            return django_models.TextField(**kwargs)

        case ColumnType.VARCHAR:
            return django_models.CharField(max_length=255, **kwargs)

        case ColumnType.INTEGER:
            return django_models.IntegerField(**kwargs)

        case ColumnType.BIGINTEGER:
            return django_models.BigIntegerField(**kwargs)

        case ColumnType.DECIMAL | ColumnType.CURRENCY:
            return django_models.DecimalField(
                max_digits=col.max_digits,
                decimal_places=col.decimal_places,
                **kwargs,
            )

        case ColumnType.FLOAT:
            return django_models.FloatField(**kwargs)

        case ColumnType.DATE:
            return django_models.DateField(**kwargs)

        case ColumnType.DATETIME:
            return django_models.DateTimeField(**kwargs)

        case ColumnType.BOOLEAN:
            return django_models.BooleanField(default=False, null=False, blank=False)

        case ColumnType.UUID:
            return django_models.UUIDField(**kwargs)

        case ColumnType.CONTRACT_ID:
            # Stored as a char(50); prefix is handled at the application layer
            return django_models.CharField(max_length=50, **kwargs)

        case _:
            raise ValueError(f"Unknown column type: {col.column_type}")


# ---------------------------------------------------------------------------
# Minimal fake Model class — schema_editor needs a Model, not just a table name
# ---------------------------------------------------------------------------

def _build_fake_model(table_name: str, fields: list[tuple[str, django_models.Field]]):
    attrs = {
        "__module__": __name__,
        "__qualname__": table_name,
        # Declare the pk here so Django's metaclass doesn't add its own AutoField
        "id": django_models.BigAutoField(primary_key=True),
    }
    model = type(table_name, (django_models.Model,), attrs)
    model._meta.db_table = table_name
    model._meta.app_label = "schema_builder"
    model._meta.managed = False

    for field_name, field in fields:
        # Skip id — already set above
        if field_name == "id":
            continue
        field.contribute_to_class(model, field_name)

    return model

class SchemaUtils:
    @staticmethod
    def create_table(table_def: TableDefinition, performed_by) -> None:
        """
        Create a real Postgres table from a TableDefinition.
        Idempotent — does nothing if the table already exists.
        """
        if table_def.is_created:
            return

        columns = list(table_def.columns.order_by("order", "created_at"))

        # Always add a surrogate PK + created_at / updated_at
        built_in_fields: list[tuple[str, django_models.Field]] = [
            ("created_at", django_models.DateTimeField(db_default=Now())),
            ("updated_at", django_models.DateTimeField(db_default=Now())),
        ]
        
        customer_fields: list[tuple[str, django_models.Field]] = [
            (col.column_name, build_django_field(col)) for col in columns
        ]

        all_fields = built_in_fields + customer_fields
        fake_model = _build_fake_model(table_def.pg_table_name, all_fields)

        log_detail = {
            "columns": [
                {"name": col.column_name, "type": col.column_type} for col in columns
            ]
        }

        try:
            with connection.schema_editor() as editor:
                editor.create_model(fake_model)

            table_def.is_created = True
            table_def.save(update_fields=["is_created"])

            TableCreationLog.objects.create(
                table_definition=table_def,
                operation=TableCreationLog.Operation.CREATE,
                detail=log_detail,
                performed_by=performed_by,
                success=True,
            )
        except Exception as exc:
            TableCreationLog.objects.create(
                table_definition=table_def,
                operation=TableCreationLog.Operation.CREATE,
                detail=log_detail,
                performed_by=performed_by,
                success=False,
                error_message=str(exc),
            )
            raise

    @staticmethod
    def add_column(table_def: TableDefinition, col: ColumnDefinition, performed_by) -> None:
        """Add a single column to an already-created table."""
        if not table_def.is_created:
            raise RuntimeError("Table has not been created yet. Call create_table first.")

        field = build_django_field(col)
        field.column = col.column_name

        try:
            with connection.schema_editor() as editor:
                # schema_editor.add_field needs a model reference; build a minimal one
                fake_model = _build_fake_model(table_def.pg_table_name, [])
                editor.add_field(fake_model, field)

            TableCreationLog.objects.create(
                table_definition=table_def,
                operation=TableCreationLog.Operation.ADD_COLUMN,
                detail={"column": col.column_name, "type": col.column_type},
                performed_by=performed_by,
                success=True,
            )
        except Exception as exc:
            TableCreationLog.objects.create(
                table_definition=table_def,
                operation=TableCreationLog.Operation.ADD_COLUMN,
                detail={"column": col.column_name, "type": col.column_type},
                performed_by=performed_by,
                success=False,
                error_message=str(exc),
            )
            raise

    @staticmethod
    def drop_table(table_def: TableDefinition, performed_by) -> None:
        """Permanently drop the Postgres table. Use with caution."""
        if not table_def.is_created:
            return

        fake_model = _build_fake_model(table_def.pg_table_name, [
            ("id", django_models.BigAutoField(primary_key=True))
        ])

        try:
            with connection.schema_editor() as editor:
                editor.delete_model(fake_model)

            table_def.is_created = False
            table_def.save(update_fields=["is_created"])

            TableCreationLog.objects.create(
                table_definition=table_def,
                operation=TableCreationLog.Operation.DROP_TABLE,
                detail={},
                performed_by=performed_by,
                success=True,
            )
        except Exception as exc:
            TableCreationLog.objects.create(
                table_definition=table_def,
                operation=TableCreationLog.Operation.DROP_TABLE,
                detail={},
                performed_by=performed_by,
                success=False,
                error_message=str(exc),
            )
            raise

    @staticmethod
    def insert_row(table_def: TableDefinition, data: dict) -> int:
        if not table_def.is_created:
            raise RuntimeError("Table has not been created yet.")

        import uuid as uuid_lib

        # Auto-fill any contract_id columns not provided by the caller
        for col in table_def.columns.all():
            if col.column_type == ColumnType.CONTRACT_ID and col.column_name not in data:
                short = str(uuid_lib.uuid4()).replace("-", "")[:8].upper()
                prefix = col.contract_id_prefix or ""
                data[col.column_name] = f"{prefix}{short}"

        columns = ", ".join(f'"{k}"' for k in data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        sql = f'INSERT INTO "{table_def.pg_table_name}" ({columns}) VALUES ({placeholders}) RETURNING id'

        with connection.cursor() as cursor:
            cursor.execute(sql, list(data.values()))
            return cursor.fetchone()[0]

    @staticmethod
    def fetch_rows(table_def: TableDefinition, filters: dict | None = None) -> list[dict]:
        """Fetch all rows from the dynamic table, optionally filtering by column values."""
        if not table_def.is_created:
            raise RuntimeError("Table has not been created yet.")

        sql = f'SELECT * FROM "{table_def.pg_table_name}"'
        params: list = []

        if filters:
            where_clauses = [f'"{k}" = %s' for k in filters]
            sql += " WHERE " + " AND ".join(where_clauses)
            params = list(filters.values())

        sql += " ORDER BY created_at DESC"

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            cols = [desc[0] for desc in cursor.description]
            return [dict(zip(cols, row)) for row in cursor.fetchall()]
    
    @staticmethod
    def update_row(td: "TableDefinition", row_id: str, data: dict) -> bool:
        """
        UPDATE a single row in the dynamic table.
        Returns True if a row was updated, False if no row matched.
        """
        if not data:
            return True  # nothing to do
 
        table = td.pg_table_name
        set_clauses = ", ".join(f'"{col}" = %s' for col in data.keys())
        values = list(data.values()) + [row_id]
 
        sql = f'UPDATE "{table}" SET {set_clauses} WHERE id = %s'
 
        with connection.cursor() as cursor:
            cursor.execute(sql, values)
            return cursor.rowcount > 0
 
    @staticmethod
    def delete_row(td: "TableDefinition", row_id: str) -> bool:
        """
        DELETE a single row from the dynamic table.
        Returns True if a row was deleted, False if no row matched.
        """
        table = td.pg_table_name
        sql = f'DELETE FROM "{table}" WHERE id = %s'
 
        with connection.cursor() as cursor:
            cursor.execute(sql, [row_id])
            return cursor.rowcount > 0
 