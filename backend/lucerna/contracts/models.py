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
            safe_project = str(self.project_id).replace("-", "")  # type: ignore
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


# ---------------------------------------------------------------------------
# New choices — Stakeholder type and access role
# ---------------------------------------------------------------------------

class StakeholderType(models.TextChoices):
    CONTRACT_OWNER = "contract_owner", "Contract Owner (Contracting Officer)"
    EXTERNAL       = "external",       "External Stakeholder"
    INTERNAL       = "internal",       "Internal Stakeholder"


class AccessRole(models.TextChoices):
    READER = "reader", "Reader (read-only)"
    WRITER = "writer", "Writer (add / edit / delete)"


# ---------------------------------------------------------------------------
# Stakeholder — unchanged fields preserved; type + email added
# ---------------------------------------------------------------------------

class Stakeholder(models.Model):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name             = models.CharField(max_length=200)
    # email was previously only on the access rule; it now lives on the
    # stakeholder so it can be shown/edited on the "More details" page.
    email            = models.EmailField(max_length=254, blank=True)
    phone            = models.CharField(max_length=50, unique=True)  # globally unique — the real PK for lookups
    stakeholder_type = models.CharField(
        max_length=20,
        choices=StakeholderType.choices,
        default=StakeholderType.INTERNAL,
        help_text="Determines the stakeholder's role category across the platform.",
    )
    created_at       = models.DateTimeField(default=timezone.now)
    updated_at       = models.DateTimeField(auto_now=True)
    created_by       = models.ForeignKey(
        "users.User", on_delete=models.PROTECT, related_name="created_stakeholders"
    )

    class Meta:
        db_table = "stakeholder"
        ordering = ["name"]

    @property
    def is_stakeholder(self) -> bool:
        return True

    def __str__(self):
        return f"{self.name} ({self.get_stakeholder_type_display()})"


# ---------------------------------------------------------------------------
# StakeholderContractAccess — row + column level access with role enforcement
# ---------------------------------------------------------------------------

class StakeholderContractAccess(models.Model):
    """
    Defines what a stakeholder can see and do within a contract table.

    Row access
    ----------
    - all_contracts=True  → stakeholder sees every row in the table
    - all_contracts=False → stakeholder only sees rows in contract_row_ids

    Column access
    -------------
    - all_columns=True    → stakeholder sees every column in the table
    - all_columns=False   → stakeholder only sees columns in allowed_column_keys

    Role
    ----
    - READER  → read-only; cannot add, edit, or delete rows
    - WRITER  → full add / edit / delete on all rows they can access

    The email field is kept here (in addition to Stakeholder.email) to allow
    a different OTP-delivery address per access rule if needed. Leave blank
    to fall back to Stakeholder.email at send time.
    """

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stakeholder      = models.ForeignKey(
        Stakeholder, on_delete=models.CASCADE, related_name="contract_access"
    )
    # Kept for OTP routing — can differ from Stakeholder.email
    email            = models.EmailField(
        max_length=254, blank=True,
        help_text="Override email for OTP delivery on this access rule. "
                  "Falls back to the stakeholder's own email if blank."
    )
    table_definition = models.ForeignKey(
        TableDefinition, on_delete=models.CASCADE, related_name="stakeholder_access_rules",
        null=True, blank=True,
        help_text="Which contract table this access rule applies to. Null = all tables."
    )

    # ── Role ────────────────────────────────────────────────────────────────
    role             = models.CharField(
        max_length=10,
        choices=AccessRole.choices,
        default=AccessRole.READER,
        help_text="READER = read-only. WRITER = add / edit / delete rows."
    )

    # ── Row-level access ─────────────────────────────────────────────────────
    all_contracts    = models.BooleanField(
        default=True,
        help_text="True → access every row. False → only rows listed in contract_row_ids."
    )
    contract_row_ids = models.JSONField(
        default=list, blank=True,
        help_text="Explicit integer row IDs when all_contracts=False."
    )

    # ── Column-level access ──────────────────────────────────────────────────
    all_columns      = models.BooleanField(
        default=True,
        help_text="True → access every column. False → only columns in allowed_column_keys."
    )
    allowed_column_keys = models.JSONField(
        default=list, blank=True,
        help_text=(
            "Snake-case column keys the stakeholder may see. "
            "Only used when all_columns=False. "
            "Example: ['contract_value', 'start_date', 'vendor_name']"
        )
    )

    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stakeholder_contract_access"
        # One rule per (stakeholder, table). Null table = global fallback rule.
        constraints = [
            models.UniqueConstraint(
                fields=["stakeholder", "table_definition"],
                name="unique_stakeholder_table_access",
            )
        ]

    def __str__(self):
        row_part = "all rows" if self.all_contracts else f"{len(self.contract_row_ids)} row(s)"
        col_part = "all columns" if self.all_columns else f"{len(self.allowed_column_keys)} col(s)"
        return f"{self.stakeholder.name} [{self.role}] → {row_part}, {col_part}"

    # ── Convenience helpers — use in views / serializers / permission classes ─

    @property
    def can_write(self) -> bool:
        """True only for WRITER role; use this to gate add/edit/delete in views."""
        return self.role == AccessRole.WRITER

    @property
    def otp_email(self) -> str:
        """Returns the OTP delivery email: rule-level override, else stakeholder email."""
        return self.email or self.stakeholder.email

    def has_row_access(self, row_id: int) -> bool:
        """Returns True if the stakeholder can see this specific row."""
        return self.all_contracts or row_id in self.contract_row_ids

    def has_column_access(self, column_key: str) -> bool:
        """Returns True if the stakeholder can see this specific column."""
        return self.all_columns or column_key in self.allowed_column_keys

    def filter_row(self, row_dict: dict) -> dict:
        """
        Strips columns the stakeholder cannot see from a row dict.
        Pass the full row; get back only the permitted columns.
        """
        if self.all_columns:
            return row_dict
        return {k: v for k, v in row_dict.items() if k in self.allowed_column_keys}