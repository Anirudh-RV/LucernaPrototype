import uuid
from django.db import models
from django.utils import timezone
from projects.models import Project


# ---------------------------------------------------------------------------
# Column type choices — these map to real Postgres / Django field types
# ---------------------------------------------------------------------------

class ColumnType(models.TextChoices):
    # Text
    TEXT        = "text",        "Text (unlimited)"
    VARCHAR     = "varchar",     "Short Text (varchar 255)"
    # Numbers
    INTEGER     = "integer",     "Integer"
    BIGINTEGER  = "biginteger",  "Big Integer"
    DECIMAL     = "decimal",     "Decimal"
    FLOAT       = "float",       "Float"
    # Date / time
    DATE        = "date",        "Date"
    DATETIME    = "datetime",    "Date & Time"
    # Boolean
    BOOLEAN     = "boolean",     "Boolean (Yes / No)"
    # IDs
    UUID        = "uuid",        "UUID"
    # Special contract fields
    CURRENCY    = "currency",    "Currency (stored as Decimal 15,2)"
    CONTRACT_ID = "contract_id", "Contract ID (auto-prefixed char)"


# ---------------------------------------------------------------------------
# TableDefinition  — one per "contract table" the customer configures
# ---------------------------------------------------------------------------

class TableDefinition(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project     = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="table_definitions"
    )
    name        = models.CharField(max_length=100, help_text="Human-readable table name, e.g. 'Contracts'")
    slug        = models.SlugField(
        max_length=100,
        help_text="Used to build the physical PG table name. Auto-derived from name.",
    )
    description = models.CharField(max_length=300, blank=True)
    # The actual Postgres table that gets created at runtime
    pg_table_name = models.CharField(
        max_length=150, unique=True, editable=False,
        help_text="Physical Postgres table name, e.g. proj_<uuid>_contracts"
    )
    is_created  = models.BooleanField(
        default=False,
        help_text="True once the real PG table has been DDL-created"
    )
    created_at  = models.DateTimeField(default=timezone.now)
    updated_at  = models.DateTimeField(auto_now=True)
    created_by  = models.ForeignKey(
        "users.User", on_delete=models.PROTECT, related_name="created_table_definitions"
    )

    class Meta:
        db_table = "table_definition"
        unique_together = ("project", "slug")
        indexes = [models.Index(fields=["project"])]

    def save(self, *args, **kwargs):
        # Build a deterministic, safe PG table name from project id + slug
        if not self.pg_table_name:
            safe_project = str(self.project_id).replace("-", "") # type: ignore
            self.pg_table_name = f"dyn_{safe_project[:12]}_{self.slug}"[:63]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.pg_table_name})"


# ---------------------------------------------------------------------------
# ColumnDefinition  — one row per column in the customer's table
# ---------------------------------------------------------------------------

class ColumnDefinition(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    table_definition = models.ForeignKey(
        TableDefinition, on_delete=models.CASCADE, related_name="columns"
    )
    column_name     = models.CharField(
        max_length=63,
        help_text="Snake-case column name, e.g. contract_id, vendor_name"
    )
    display_name    = models.CharField(max_length=100, help_text="Label shown in the UI")
    column_type     = models.CharField(
        max_length=30, choices=ColumnType.choices, default=ColumnType.VARCHAR
    )
    is_required     = models.BooleanField(default=False)
    is_unique       = models.BooleanField(default=False)
    default_value   = models.CharField(max_length=255, blank=True, null=True)
    # For contract_id columns only — an optional prefix like "USAF-"
    contract_id_prefix = models.CharField(max_length=20, blank=True, null=True)
    # For decimal / currency columns
    max_digits      = models.PositiveSmallIntegerField(default=15)
    decimal_places  = models.PositiveSmallIntegerField(default=2)
    # Order in the table
    order           = models.PositiveSmallIntegerField(default=0)
    created_at      = models.DateTimeField(default=timezone.now)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "column_definition"
        unique_together = ("table_definition", "column_name")
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.table_definition.name}.{self.column_name} ({self.column_type})"


# ---------------------------------------------------------------------------
# TableCreationLog  — audit trail for every DDL operation
# ---------------------------------------------------------------------------

class TableCreationLog(models.Model):
    class Operation(models.TextChoices):
        CREATE      = "create",      "Create Table"
        ADD_COLUMN  = "add_column",  "Add Column"
        DROP_COLUMN = "drop_column", "Drop Column"
        DROP_TABLE  = "drop_table",  "Drop Table"

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    table_definition = models.ForeignKey(
        TableDefinition, on_delete=models.CASCADE, related_name="ddl_logs"
    )
    operation        = models.CharField(max_length=20, choices=Operation.choices)
    detail           = models.JSONField(default=dict, help_text="Snapshot of column(s) involved")
    performed_by     = models.ForeignKey(
        "users.User", on_delete=models.PROTECT, related_name="ddl_operations"
    )
    performed_at     = models.DateTimeField(default=timezone.now)
    success          = models.BooleanField(default=True)
    error_message    = models.TextField(blank=True)

    class Meta:
        db_table = "table_creation_log"
        ordering = ["-performed_at"]
        
class Stakeholder(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project     = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="stakeholders"
    )
    name        = models.CharField(max_length=200)
    email       = models.EmailField(max_length=254, blank=True)
    phone       = models.CharField(max_length=50, blank=True)
    created_at  = models.DateTimeField(default=timezone.now)
    updated_at  = models.DateTimeField(auto_now=True)
    created_by  = models.ForeignKey(
        "users.User", on_delete=models.PROTECT, related_name="created_stakeholders"
    )
 
    class Meta:
        db_table = "stakeholder"
        ordering = ["name"]
 
    def __str__(self):
        return f"{self.name} ({self.project.name})"
 
 
class StakeholderContractAccess(models.Model):
    """
    Defines which contract rows a stakeholder can access.
 
    - all_contracts=True  → stakeholder sees every row in the table
    - all_contracts=False → stakeholder only sees rows whose IDs are in contract_row_ids
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stakeholder      = models.OneToOneField(
        Stakeholder, on_delete=models.CASCADE, related_name="contract_access"
    )
    table_definition = models.ForeignKey(
        TableDefinition, on_delete=models.CASCADE, related_name="stakeholder_access_rules",
        null=True, blank=True,
        help_text="Which contract table this access rule applies to. Null = all tables."
    )
    all_contracts    = models.BooleanField(
        default=True,
        help_text="If True, stakeholder has access to all contract rows."
    )
    contract_row_ids = models.JSONField(
        default=list, blank=True,
        help_text="List of integer row IDs the stakeholder can access. Only used when all_contracts=False."
    )
    updated_at       = models.DateTimeField(auto_now=True)
 
    class Meta:
        db_table = "stakeholder_contract_access"
 
    def __str__(self):
        if self.all_contracts:
            return f"{self.stakeholder.name} → all contracts"
        return f"{self.stakeholder.name} → {len(self.contract_row_ids)} row(s)"