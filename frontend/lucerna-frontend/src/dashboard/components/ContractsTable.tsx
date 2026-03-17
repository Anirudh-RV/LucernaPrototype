import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  Button,
  Skeleton,
  Divider,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReplayIcon from "@mui/icons-material/Replay";
import { CONTRACTS_BASE_ENDPOINT } from "../../constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnDef {
  id: string;
  column_name: string;
  display_name: string;
  column_type: string;
  column_type_display: string;
  is_required: boolean;
  is_unique: boolean;
  default_value: string | null;
  contract_id_prefix: string | null;
  max_digits: number;
  decimal_places: number;
  order: number;
}

interface TableDef {
  id: string;
  project: string;
  name: string;
  slug: string;
  description: string;
  pg_table_name: string;
  is_created: boolean;
  columns: ColumnDef[];
}

type RowData = Record<string, any>;

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMN_TYPE_OPTIONS = [
  { value: "varchar", label: "Short Text", group: "Text" },
  { value: "text", label: "Long Text", group: "Text" },
  { value: "integer", label: "Integer", group: "Number" },
  { value: "biginteger", label: "Big Integer", group: "Number" },
  { value: "decimal", label: "Decimal", group: "Number" },
  { value: "float", label: "Float", group: "Number" },
  { value: "currency", label: "Currency", group: "Number" },
  { value: "date", label: "Date", group: "Date/Time" },
  { value: "datetime", label: "Date & Time", group: "Date/Time" },
  { value: "boolean", label: "Boolean (Yes/No)", group: "Other" },
  { value: "uuid", label: "UUID", group: "Other" },
  { value: "contract_id", label: "Contract ID", group: "Special" },
];

const TYPE_GROUP_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Text: { bg: "#eff6ff", text: "#3b82f6", border: "#bfdbfe" },
  Number: { bg: "#f0fdf4", text: "#22c55e", border: "#bbf7d0" },
  "Date/Time": { bg: "#fffbeb", text: "#f59e0b", border: "#fde68a" },
  Other: { bg: "#f5f3ff", text: "#8b5cf6", border: "#ddd6fe" },
  Special: { bg: "#fff1f2", text: "#f43f5e", border: "#fecdd3" },
};

const DARK_TYPE_GROUP_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Text: { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb" },
  Number: { bg: "#14532d", text: "#4ade80", border: "#16a34a" },
  "Date/Time": { bg: "#451a03", text: "#fbbf24", border: "#d97706" },
  Other: { bg: "#2e1065", text: "#a78bfa", border: "#7c3aed" },
  Special: { bg: "#4c0519", text: "#fb7185", border: "#e11d48" },
};

function getTypeGroup(typeValue: string) {
  return (
    COLUMN_TYPE_OPTIONS.find((t) => t.value === typeValue)?.group ?? "Other"
  );
}

function getTypeLabel(typeValue: string) {
  return (
    COLUMN_TYPE_OPTIONS.find((t) => t.value === typeValue)?.label ?? typeValue
  );
}

// ─── Cell input renderer ──────────────────────────────────────────────────────

function CellInput({
  col,
  value,
  onChange,
  onCommit,
  onCancel,
  autoFocus,
}: {
  col: ColumnDef;
  value: any;
  onChange: (v: any) => void;
  onCommit: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && col.column_type !== "text") onCommit();
    if (e.key === "Escape") onCancel();
  };

  const inputSx = {
    "& .MuiInputBase-root": { fontSize: 13 },
    "& .MuiInputBase-input": { py: 0.5, px: 1 },
  };

  if (col.column_type === "boolean") {
    return (
      <Checkbox
        size="small"
        checked={!!value}
        onChange={(e) => {
          onChange(e.target.checked);
          onCommit();
        }}
        autoFocus={autoFocus}
        sx={{ p: 0.5 }}
      />
    );
  }

  if (col.column_type === "date") {
    return (
      <TextField
        type="date"
        size="small"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        onBlur={onCommit}
        autoFocus={autoFocus}
        sx={{ ...inputSx, minWidth: 140 }}
        InputLabelProps={{ shrink: true }}
      />
    );
  }

  if (col.column_type === "datetime") {
    return (
      <TextField
        type="datetime-local"
        size="small"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        onBlur={onCommit}
        autoFocus={autoFocus}
        sx={{ ...inputSx, minWidth: 180 }}
        InputLabelProps={{ shrink: true }}
      />
    );
  }

  if (
    ["integer", "biginteger", "float", "decimal", "currency"].includes(
      col.column_type,
    )
  ) {
    return (
      <TextField
        type="number"
        size="small"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        onBlur={onCommit}
        autoFocus={autoFocus}
        sx={{ ...inputSx, minWidth: 100 }}
        inputProps={
          col.column_type === "decimal" || col.column_type === "currency"
            ? { step: Math.pow(10, -col.decimal_places) }
            : {}
        }
      />
    );
  }

  return (
    <TextField
      size="small"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKey}
      onBlur={col.column_type !== "text" ? onCommit : undefined}
      autoFocus={autoFocus}
      multiline={col.column_type === "text"}
      minRows={col.column_type === "text" ? 2 : undefined}
      sx={{ ...inputSx, minWidth: col.column_type === "text" ? 200 : 120 }}
      disabled={col.column_type === "uuid" || col.column_type === "contract_id"}
      placeholder={
        col.column_type === "contract_id"
          ? `Auto-generated${col.contract_id_prefix ? ` (${col.contract_id_prefix}…)` : ""}`
          : col.column_type === "uuid"
            ? "Auto-generated"
            : ""
      }
    />
  );
}

// ─── Cell display renderer ────────────────────────────────────────────────────

function CellDisplay({ col, value }: { col: ColumnDef; value: any }) {
  if (value === null || value === undefined || value === "") {
    return (
      <Typography
        sx={{ fontSize: 13, color: "text.disabled", fontStyle: "italic" }}
      >
        —
      </Typography>
    );
  }

  if (col.column_type === "boolean") {
    return (
      <Chip
        label={value ? "Yes" : "No"}
        size="small"
        color={value ? "success" : "default"}
        variant="outlined"
        sx={{ height: 20, fontSize: 11 }}
      />
    );
  }

  if (col.column_type === "currency") {
    const num = parseFloat(value);
    return (
      <Typography sx={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
        {isNaN(num)
          ? value
          : `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </Typography>
    );
  }

  if (col.column_type === "contract_id") {
    return (
      <Typography
        sx={{
          fontSize: 12,
          fontFamily: "monospace",
          color: "primary.main",
          fontWeight: 600,
        }}
      >
        {value}
      </Typography>
    );
  }

  if (col.column_type === "uuid") {
    return (
      <Typography
        sx={{ fontSize: 11, fontFamily: "monospace", color: "text.secondary" }}
      >
        {String(value).slice(0, 8)}…
      </Typography>
    );
  }

  if (col.column_type === "date" || col.column_type === "datetime") {
    try {
      const d = new Date(value);
      return (
        <Typography sx={{ fontSize: 13 }}>
          {col.column_type === "date"
            ? d.toLocaleDateString()
            : d.toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short",
              })}
        </Typography>
      );
    } catch {
      return <Typography sx={{ fontSize: 13 }}>{value}</Typography>;
    }
  }

  return (
    <Typography sx={{ fontSize: 13, lineHeight: 1.4 }}>
      {String(value)}
    </Typography>
  );
}

// ─── Add Column inline panel ──────────────────────────────────────────────────

function AddColumnPanel({
  onAdd,
  onClose,
  accessToken,
  tableId,
  isTableCreated,
}: {
  onAdd: (col: ColumnDef) => void;
  onClose: () => void;
  accessToken: string;
  tableId: string;
  isTableCreated: boolean;
}) {
  const [colName, setColName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [colType, setColType] = useState("varchar");
  const [isRequired, setIsRequired] = useState(false);
  const [isUnique, setIsUnique] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toSnake = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

  const handleDisplayChange = (v: string) => {
    setDisplayName(v);
    setColName(toSnake(v));
  };

  const handleSave = async () => {
    if (!displayName.trim() || !colName.trim()) {
      setErr("Name required");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      // 1. Create column definition
      const res = await fetch(`${CONTRACTS_BASE_ENDPOINT}/columns/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LUCERNA-USER-TOKEN": accessToken,
        },
        body: JSON.stringify({
          table_definition: tableId,
          column_name: colName,
          display_name: displayName,
          column_type: colType,
          is_required: isRequired,
          is_unique: isUnique,
          contract_id_prefix: colType === "contract_id" ? prefix || null : null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // 2. If table is already created, apply DDL immediately
      if (isTableCreated) {
        const applyRes = await fetch(
          `${CONTRACTS_BASE_ENDPOINT}/columns/${data.id}/apply/`,
          {
            method: "POST",
            headers: { "X-LUCERNA-USER-TOKEN": accessToken },
          },
        );
        const applyData = await applyRes.json();
        if (applyData.error) throw new Error(applyData.error);
      }

      onAdd({ ...data, contract_id_prefix: prefix || null });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "primary.main",
        borderRadius: 2,
        p: 2,
        mb: 2,
        bgcolor: "background.paper",
        boxShadow: "0 0 0 3px rgba(25,118,210,0.08)",
      }}
    >
      <Typography
        variant="caption"
        fontWeight={700}
        color="primary"
        mb={1.5}
        display="block"
      >
        NEW COLUMN
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 1.5, py: 0 }}>
          {err}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <TextField
          label="Display Name"
          size="small"
          value={displayName}
          onChange={(e) => handleDisplayChange(e.target.value)}
          autoFocus
        />
        <TextField
          label="Column Name"
          size="small"
          value={colName}
          onChange={(e) => setColName(toSnake(e.target.value))}
          inputProps={{ style: { fontFamily: "monospace", fontSize: 12 } }}
        />
        <Select
          size="small"
          value={colType}
          onChange={(e) => setColType(e.target.value)}
        >
          {["Text", "Number", "Date/Time", "Other", "Special"].map((group) => [
            <MenuItem
              key={`g-${group}`}
              disabled
              sx={{ fontSize: 11, fontWeight: 700, opacity: "1 !important" }}
            >
              — {group} —
            </MenuItem>,
            ...COLUMN_TYPE_OPTIONS.filter((t) => t.group === group).map((t) => (
              <MenuItem key={t.value} value={t.value} sx={{ pl: 3 }}>
                {t.label}
              </MenuItem>
            )),
          ])}
        </Select>
      </Box>
      <Box
        sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <Checkbox
            size="small"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            sx={{ p: 0.5 }}
          />
          <Typography variant="caption" sx={{ alignSelf: "center" }}>
            Required
          </Typography>
          <Checkbox
            size="small"
            checked={isUnique}
            onChange={(e) => setIsUnique(e.target.checked)}
            sx={{ p: 0.5, ml: 1 }}
          />
          <Typography variant="caption" sx={{ alignSelf: "center" }}>
            Unique
          </Typography>
        </Box>
        {colType === "contract_id" && (
          <TextField
            label="ID Prefix"
            size="small"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="e.g. USAF-"
            sx={{ width: 130 }}
          />
        )}
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={
            saving ? (
              <CircularProgress size={12} color="inherit" />
            ) : (
              <CheckIcon />
            )
          }
        >
          {isTableCreated ? "Add & Apply" : "Add Column"}
        </Button>
      </Box>
    </Box>
  );
}

// ─── Main ContractsTable component ───────────────────────────────────────────

export default function ContractsTable({
  projectId,
  accessToken,
}: {
  projectId: string;
  accessToken: string;
}) {
  // Table definition state
  const [tableDef, setTableDef] = useState<TableDef | null>(null);
  const [loadingDef, setLoadingDef] = useState(true);
  const [defError, setDefError] = useState<string | null>(null);

  // Row data state
  const [rows, setRows] = useState<RowData[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  // Editing state — { rowIndex, colName }
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number;
    colName: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);

  // New row state
  const [addingRow, setAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<RowData>({});
  const [savingRow, setSavingRow] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  // Add column panel
  const [showAddColumn, setShowAddColumn] = useState(false);

  // Table name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Column menu
  const [colMenuAnchor, setColMenuAnchor] = useState<{
    el: HTMLElement;
    col: ColumnDef;
  } | null>(null);
  const [editingColDisplay, setEditingColDisplay] = useState<{
    id: string;
    value: string;
  } | null>(null);

  // Table-level menu (⋯ button)
  const [tableMenuAnchor, setTableMenuAnchor] = useState<HTMLElement | null>(
    null,
  );

  // Confirm dialog: "drop" | "drop_recreate" | null
  const [confirmAction, setConfirmAction] = useState<
    "drop" | "drop_recreate" | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Fetch table definition ──────────────────────────────────────────────────

  const fetchTableDef = useCallback(async () => {
    setLoadingDef(true);
    setDefError(null);
    try {
      const res = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/?project=${projectId}`,
        {
          headers: { "X-LUCERNA-USER-TOKEN": accessToken },
        },
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        // Get full detail with columns for first table
        const detailRes = await fetch(
          `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${data.results[0].id}/`,
          {
            headers: { "X-LUCERNA-USER-TOKEN": accessToken },
          },
        );
        const detail: TableDef = await detailRes.json();
        setTableDef(detail);
        setNameValue(detail.name);
      } else {
        setTableDef(null);
      }
    } catch (e: any) {
      setDefError(e.message);
    } finally {
      setLoadingDef(false);
    }
  }, [projectId, accessToken]);

  // ── Fetch rows ──────────────────────────────────────────────────────────────

  const fetchRows = useCallback(
    async (td: TableDef) => {
      if (!td.is_created) return;
      setLoadingRows(true);
      setRowsError(null);
      try {
        const res = await fetch(
          `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${td.id}/rows/`,
          {
            headers: { "X-LUCERNA-USER-TOKEN": accessToken },
          },
        );
        const data = await res.json();
        setRows(data.results ?? []);
      } catch (e: any) {
        setRowsError(e.message);
      } finally {
        setLoadingRows(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    fetchTableDef();
  }, [fetchTableDef]);
  useEffect(() => {
    if (tableDef) fetchRows(tableDef);
  }, [tableDef, fetchRows]);

  // ── Ensure table is DDL-created ─────────────────────────────────────────────

  const ensureTableCreated = async (td: TableDef) => {
    if (td.is_created) return td;
    const res = await fetch(
      `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${td.id}/create-table/`,
      {
        method: "POST",
        headers: { "X-LUCERNA-USER-TOKEN": accessToken },
      },
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const updated = { ...td, is_created: true };
    setTableDef(updated);
    return updated;
  };

  // ── Save table name ─────────────────────────────────────────────────────────

  const saveTableName = async () => {
    if (!tableDef || !nameValue.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${tableDef.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-LUCERNA-USER-TOKEN": accessToken,
          },
          body: JSON.stringify({ name: nameValue }),
        },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTableDef((prev) => (prev ? { ...prev, name: nameValue } : prev));
      setEditingName(false);
    } catch (e: any) {
      // noop — keep editing
    } finally {
      setSavingName(false);
    }
  };

  // ── Save column display name ────────────────────────────────────────────────

  const saveColumnDisplayName = async (colId: string, displayName: string) => {
    if (!displayName.trim()) return;
    try {
      const res = await fetch(`${CONTRACTS_BASE_ENDPOINT}/columns/${colId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-LUCERNA-USER-TOKEN": accessToken,
        },
        body: JSON.stringify({ display_name: displayName }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTableDef((prev) =>
        prev
          ? {
              ...prev,
              columns: prev.columns.map((c) =>
                c.id === colId ? { ...c, display_name: displayName } : c,
              ),
            }
          : prev,
      );
    } catch {}
    setEditingColDisplay(null);
    setColMenuAnchor(null);
  };

  // ── Drop table ──────────────────────────────────────────────────────────────

  const handleDropTable = async () => {
    if (!tableDef) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${tableDef.id}/drop-table/`,
        {
          method: "POST",
          headers: { "X-LUCERNA-USER-TOKEN": accessToken },
        },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTableDef((prev) => (prev ? { ...prev, is_created: false } : prev));
      setRows([]);
      setConfirmAction(null);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Drop then recreate ───────────────────────────────────────────────────────

  const handleDropAndRecreate = async () => {
    if (!tableDef) return;
    setActionLoading(true);
    setActionError(null);
    try {
      // 1. Drop
      const dropRes = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${tableDef.id}/drop-table/`,
        {
          method: "POST",
          headers: { "X-LUCERNA-USER-TOKEN": accessToken },
        },
      );
      const dropData = await dropRes.json();
      if (dropData.error) throw new Error(`Drop failed: ${dropData.error}`);

      // 2. Recreate
      const createRes = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${tableDef.id}/create-table/`,
        {
          method: "POST",
          headers: { "X-LUCERNA-USER-TOKEN": accessToken },
        },
      );
      const createData = await createRes.json();
      if (createData.error)
        throw new Error(`Recreate failed: ${createData.error}`);

      setTableDef((prev) => (prev ? { ...prev, is_created: true } : prev));
      setRows([]);
      setConfirmAction(null);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = () => {
    if (confirmAction === "drop") handleDropTable();
    else if (confirmAction === "drop_recreate") handleDropAndRecreate();
  };

  const handleStartAddRow = async () => {
    if (!tableDef) return;
    try {
      await ensureTableCreated(tableDef);
    } catch (e: any) {
      setRowError(e.message);
      return;
    }
    // Pre-fill defaults
    const defaults: RowData = {};
    tableDef.columns.forEach((col) => {
      if (col.default_value !== null && col.default_value !== undefined) {
        defaults[col.column_name] = col.default_value;
      }
    });
    setNewRowData(defaults);
    setAddingRow(true);
    setRowError(null);
  };

  const handleSaveNewRow = async () => {
    if (!tableDef) return;

    // Validate required fields (skip auto fields)
    const autoTypes = ["uuid", "contract_id"];
    const required = tableDef.columns.filter(
      (c) => c.is_required && !autoTypes.includes(c.column_type),
    );
    for (const col of required) {
      if (
        newRowData[col.column_name] === undefined ||
        newRowData[col.column_name] === ""
      ) {
        setRowError(`"${col.display_name}" is required`);
        return;
      }
    }

    setSavingRow(true);
    setRowError(null);
    try {
      // Filter out auto-generated fields before sending
      const payload: RowData = {};
      tableDef.columns.forEach((col) => {
        if (autoTypes.includes(col.column_type)) return;
        if (
          newRowData[col.column_name] !== undefined &&
          newRowData[col.column_name] !== ""
        ) {
          payload[col.column_name] = newRowData[col.column_name];
        }
      });

      const res = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${tableDef.id}/rows/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-LUCERNA-USER-TOKEN": accessToken,
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Refetch rows to get server-generated values (contract_id, uuid, etc.)
      await fetchRows(tableDef);
      setAddingRow(false);
      setNewRowData({});
    } catch (e: any) {
      setRowError(e.message);
    } finally {
      setSavingRow(false);
    }
  };

  // ── Inline cell editing ─────────────────────────────────────────────────────
  // NOTE: Row-level PATCH doesn't exist yet in the backend shown.
  // We'll optimistically update locally and show a save button per row.
  // TODO: Wire up when PATCH /rows/<id>/ is added.

  const startEdit = (rowIdx: number, col: ColumnDef) => {
    if (["uuid", "contract_id"].includes(col.column_type)) return;
    setEditingCell({ rowIdx, colName: col.column_name });
    setEditValue(rows[rowIdx]?.[col.column_name] ?? "");
  };

  // Track which rows have unsaved edits: rowIdx -> { colName: newValue }
  const [dirtyRows, setDirtyRows] = useState<Record<number, RowData>>({});
  const [savingRowIdx, setSavingRowIdx] = useState<number | null>(null);
  const [deletingRowIdx, setDeletingRowIdx] = useState<number | null>(null);

  const commitEdit = () => {
    if (!editingCell) return;
    const { rowIdx, colName } = editingCell;
    // Update display immediately
    setRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, [colName]: editValue } : r)),
    );
    // Mark row as dirty
    setDirtyRows((prev) => ({
      ...prev,
      [rowIdx]: { ...(prev[rowIdx] ?? {}), [colName]: editValue },
    }));
    setEditingCell(null);
    setEditValue(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue(null);
  };

  const saveRow = async (rowIdx: number) => {
    if (!tableDef) return;
    const row = rows[rowIdx];
    const dirty = dirtyRows[rowIdx];
    if (!dirty || Object.keys(dirty).length === 0) return;

    setSavingRowIdx(rowIdx);
    try {
      const res = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${tableDef.id}/rows/${row.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-LUCERNA-USER-TOKEN": accessToken,
          },
          body: JSON.stringify(dirty),
        },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // Clear dirty state for this row
      setDirtyRows((prev) => {
        const next = { ...prev };
        delete next[rowIdx];
        return next;
      });
    } catch (e: any) {
      setRowError(e.message);
    } finally {
      setSavingRowIdx(null);
    }
  };

  const deleteRow = async (rowIdx: number) => {
    if (!tableDef) return;
    const row = rows[rowIdx];
    setDeletingRowIdx(rowIdx);
    try {
      const res = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${tableDef.id}/rows/${row.id}/`,
        {
          method: "DELETE",
          headers: { "X-LUCERNA-USER-TOKEN": accessToken },
        },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRows((prev) => prev.filter((_, i) => i !== rowIdx));
      setDirtyRows((prev) => {
        const next: Record<number, RowData> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const ki = Number(k);
          if (ki < rowIdx) next[ki] = v;
          else if (ki > rowIdx) next[ki - 1] = v;
        });
        return next;
      });
    } catch (e: any) {
      setRowError(e.message);
    } finally {
      setDeletingRowIdx(null);
    }
  };

  // ── Column header chip ──────────────────────────────────────────────────────

  const sortedColumns = tableDef
    ? [...tableDef.columns].sort(
        (a, b) =>
          a.order - b.order || a.column_name.localeCompare(b.column_name),
      )
    : [];

  // ── Render: no table yet ────────────────────────────────────────────────────

  if (loadingDef) {
    return (
      <Box sx={{ mt: 2 }}>
        <Skeleton
          variant="rectangular"
          height={40}
          sx={{ mb: 1, borderRadius: 1 }}
        />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (defError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load contract table: {defError}
      </Alert>
    );
  }

  if (!tableDef) {
    return (
      <Box
        sx={{
          mt: 2,
          p: 4,
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          textAlign: "center",
        }}
      >
        <TableRowsIcon sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
        <Typography color="text.secondary" mb={0.5}>
          No contract table yet
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Create a contract table from the project setup screen.
        </Typography>
      </Box>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <Box sx={{ width: "100%" }}>
      {/* ── Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        {editingName ? (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              size="small"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTableName();
                if (e.key === "Escape") setEditingName(false);
              }}
              autoFocus
              sx={{
                "& .MuiInputBase-input": { fontSize: 16, fontWeight: 600 },
              }}
            />
            <IconButton
              size="small"
              onClick={saveTableName}
              disabled={savingName}
            >
              {savingName ? (
                <CircularProgress size={14} />
              ) : (
                <CheckIcon fontSize="small" />
              )}
            </IconButton>
            <IconButton size="small" onClick={() => setEditingName(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="h6" fontWeight={600}>
              {tableDef.name}
            </Typography>
            <Tooltip title="Rename table">
              <IconButton
                size="small"
                onClick={() => setEditingName(true)}
                sx={{ opacity: 0.4, "&:hover": { opacity: 1 } }}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        <Chip
          label={tableDef.is_created ? "Live" : "Not materialized"}
          size="small"
          color={tableDef.is_created ? "success" : "warning"}
          variant="outlined"
          sx={{ height: 20, fontSize: 11 }}
        />
        <Chip
          label={`${sortedColumns.length} column${sortedColumns.length !== 1 ? "s" : ""}`}
          size="small"
          variant="outlined"
          sx={{ height: 20, fontSize: 11 }}
        />
        <Chip
          label={`${rows.length} row${rows.length !== 1 ? "s" : ""}`}
          size="small"
          variant="outlined"
          sx={{ height: 20, fontSize: 11 }}
        />

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Refresh">
          <IconButton
            size="small"
            onClick={() => {
              fetchTableDef();
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Table options">
          <IconButton
            size="small"
            onClick={(e) => setTableMenuAnchor(e.currentTarget)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ViewColumnIcon />}
          onClick={() => setShowAddColumn((v) => !v)}
        >
          Add Column
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleStartAddRow}
          disabled={addingRow}
        >
          Add Row
        </Button>
      </Box>

      {/* ── Add column panel ── */}
      {showAddColumn && (
        <AddColumnPanel
          accessToken={accessToken}
          tableId={tableDef.id}
          isTableCreated={tableDef.is_created}
          onClose={() => setShowAddColumn(false)}
          onAdd={(newCol) => {
            setTableDef((prev) =>
              prev ? { ...prev, columns: [...prev.columns, newCol] } : prev,
            );
            setShowAddColumn(false);
          }}
        />
      )}

      {rowError && (
        <Alert
          severity="error"
          sx={{ mb: 1.5 }}
          onClose={() => setRowError(null)}
        >
          {rowError}
        </Alert>
      )}

      {/* ── Table ── */}
      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Box
          component="table"
          sx={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            "& th, & td": {
              borderBottom: "1px solid",
              borderColor: "divider",
              px: 1.5,
              py: 1,
              textAlign: "left",
              verticalAlign: "middle",
              whiteSpace: "nowrap",
            },
            "& th": {
              bgcolor: "action.hover",
              fontWeight: 600,
              fontSize: 12,
              position: "sticky",
              top: 0,
              zIndex: 1,
            },
            "& tr:last-child td": { borderBottom: "none" },
            "& tbody tr:hover": { bgcolor: "action.hover" },
          }}
        >
          {/* ── Column headers ── */}
          <thead>
            <tr>
              <Box
                component="th"
                sx={{
                  width: 40,
                  textAlign: "center !important",
                  color: "text.disabled",
                }}
              >
                #
              </Box>
              {sortedColumns.map((col) => {
                const group = getTypeGroup(col.column_type);
                const colors = TYPE_GROUP_COLORS[group];
                const isEditingThisCol = editingColDisplay?.id === col.id;

                return (
                  <Box component="th" key={col.id}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                    >
                      {isEditingThisCol ? (
                        <TextField
                          size="small"
                          value={editingColDisplay.value}
                          onChange={(e) =>
                            setEditingColDisplay({
                              id: col.id,
                              value: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              saveColumnDisplayName(
                                col.id,
                                editingColDisplay.value,
                              );
                            if (e.key === "Escape") {
                              setEditingColDisplay(null);
                              setColMenuAnchor(null);
                            }
                          }}
                          onBlur={() =>
                            saveColumnDisplayName(
                              col.id,
                              editingColDisplay.value,
                            )
                          }
                          autoFocus
                          sx={{
                            "& .MuiInputBase-input": {
                              fontSize: 12,
                              fontWeight: 600,
                              py: 0.25,
                              px: 0.75,
                            },
                            width: 120,
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                          {col.display_name}
                        </Typography>
                      )}
                      <Chip
                        label={getTypeLabel(col.column_type)}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 10,
                          bgcolor: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          "& .MuiChip-label": { px: 0.75 },
                        }}
                      />
                      {col.is_required && (
                        <Typography
                          sx={{
                            color: "error.main",
                            fontSize: 12,
                            lineHeight: 1,
                          }}
                        >
                          *
                        </Typography>
                      )}
                      <Tooltip title="Column options">
                        <IconButton
                          size="small"
                          sx={{
                            p: 0.25,
                            opacity: 0.4,
                            "&:hover": { opacity: 1 },
                            ml: "auto",
                          }}
                          onClick={(e) =>
                            setColMenuAnchor({ el: e.currentTarget, col })
                          }
                        >
                          <MoreHorizIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 10,
                        color: "text.disabled",
                        fontFamily: "monospace",
                        mt: 0.25,
                      }}
                    >
                      {col.column_name}
                    </Typography>
                  </Box>
                );
              })}
              <Box component="th" sx={{ width: 40 }} />
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {/* Existing rows */}
            {loadingRows ? (
              <tr>
                <Box
                  component="td"
                  colSpan={sortedColumns.length + 2}
                  sx={{ textAlign: "center", py: 4 }}
                >
                  <CircularProgress size={20} />
                </Box>
              </tr>
            ) : rowsError ? (
              <tr>
                <Box component="td" colSpan={sortedColumns.length + 2}>
                  <Alert severity="error" sx={{ m: 1 }}>
                    {rowsError}
                  </Alert>
                </Box>
              </tr>
            ) : rows.length === 0 && !addingRow ? (
              <tr>
                <Box
                  component="td"
                  colSpan={sortedColumns.length + 2}
                  sx={{ textAlign: "center", py: 5, color: "text.disabled" }}
                >
                  No records yet — click "Add Row" to create the first one
                </Box>
              </tr>
            ) : (
              rows.map((row, rowIdx) => (
                <tr key={row.id ?? rowIdx}>
                  <Box
                    component="td"
                    sx={{
                      textAlign: "center",
                      color: "text.disabled",
                      fontSize: 11,
                      width: 40,
                    }}
                  >
                    {rowIdx + 1}
                  </Box>
                  {sortedColumns.map((col) => {
                    const isEditing =
                      editingCell?.rowIdx === rowIdx &&
                      editingCell?.colName === col.column_name;
                    const isAuto = ["uuid", "contract_id"].includes(
                      col.column_type,
                    );

                    return (
                      <Box
                        component="td"
                        key={col.id}
                        onClick={() => !isAuto && startEdit(rowIdx, col)}
                        sx={{
                          cursor: isAuto ? "default" : "pointer",
                          minWidth: 80,
                          maxWidth: 280,
                          "&:hover": !isAuto
                            ? { bgcolor: "action.selected" }
                            : {},
                        }}
                      >
                        {isEditing ? (
                          <CellInput
                            col={col}
                            value={editValue}
                            onChange={setEditValue}
                            onCommit={commitEdit}
                            onCancel={cancelEdit}
                            autoFocus
                          />
                        ) : (
                          <CellDisplay col={col} value={row[col.column_name]} />
                        )}
                      </Box>
                    );
                  })}
                  <Box component="td" sx={{ width: 72 }}>
                    <Box sx={{ display: "flex", gap: 0.25 }}>
                      {dirtyRows[rowIdx] &&
                        Object.keys(dirtyRows[rowIdx]).length > 0 && (
                          <Tooltip title="Save changes">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => saveRow(rowIdx)}
                              disabled={savingRowIdx === rowIdx}
                            >
                              {savingRowIdx === rowIdx ? (
                                <CircularProgress size={12} />
                              ) : (
                                <SaveIcon sx={{ fontSize: 14 }} />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      <Tooltip title="Delete row">
                        <IconButton
                          size="small"
                          onClick={() => deleteRow(rowIdx)}
                          disabled={deletingRowIdx === rowIdx}
                          sx={{
                            color: "text.disabled",
                            "&:hover": { color: "error.main" },
                            opacity: 0.4,
                            "&:hover": { opacity: 1, color: "error.main" },
                          }}
                        >
                          {deletingRowIdx === rowIdx ? (
                            <CircularProgress size={12} />
                          ) : (
                            <CloseIcon sx={{ fontSize: 14 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </tr>
              ))
            )}

            {/* ── New row form ── */}
            {addingRow && (
              <Box
                component="tr"
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(25,118,210,0.08)"
                      : "rgba(25,118,210,0.04)",
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: -1,
                }}
              >
                <Box
                  component="td"
                  sx={{
                    textAlign: "center",
                    color: "primary.main",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  NEW
                </Box>
                {sortedColumns.map((col) => {
                  const isAuto = ["uuid", "contract_id"].includes(
                    col.column_type,
                  );
                  return (
                    <Box component="td" key={col.id} sx={{ py: 0.75 }}>
                      {isAuto ? (
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "text.disabled",
                            fontStyle: "italic",
                          }}
                        >
                          {col.column_type === "contract_id"
                            ? `Auto (${col.contract_id_prefix ?? ""}…)`
                            : "Auto UUID"}
                        </Typography>
                      ) : (
                        <CellInput
                          col={col}
                          value={newRowData[col.column_name] ?? ""}
                          onChange={(v) =>
                            setNewRowData((prev) => ({
                              ...prev,
                              [col.column_name]: v,
                            }))
                          }
                          onCommit={() => {}}
                          onCancel={() => setAddingRow(false)}
                        />
                      )}
                    </Box>
                  );
                })}
                <Box component="td">
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Save row">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={handleSaveNewRow}
                        disabled={savingRow}
                      >
                        {savingRow ? (
                          <CircularProgress size={14} />
                        ) : (
                          <SaveIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setAddingRow(false);
                          setRowError(null);
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            )}
          </tbody>
        </Box>
      </Box>

      {/* ── Column options menu ── */}
      <Menu
        anchorEl={colMenuAnchor?.el}
        open={!!colMenuAnchor}
        onClose={() => {
          setColMenuAnchor(null);
          setEditingColDisplay(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (!colMenuAnchor) return;
            setEditingColDisplay({
              id: colMenuAnchor.col.id,
              value: colMenuAnchor.col.display_name,
            });
            setColMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename column</ListItemText>
        </MenuItem>
      </Menu>

      {/* ── Table options menu ── */}
      <Menu
        anchorEl={tableMenuAnchor}
        open={!!tableMenuAnchor}
        onClose={() => setTableMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setTableMenuAnchor(null);
            setConfirmAction("drop_recreate");
          }}
        >
          <ListItemIcon>
            <ReplayIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Drop & Recreate"
            secondary="Wipes all rows, rebuilds schema"
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setTableMenuAnchor(null);
            setConfirmAction("drop");
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText
            primary="Drop Table"
            secondary="Removes Postgres table entirely"
          />
        </MenuItem>
      </Menu>

      {/* ── Confirm dialog ── */}
      <Dialog
        open={!!confirmAction}
        onClose={() => {
          if (!actionLoading) {
            setConfirmAction(null);
            setActionError(null);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {confirmAction === "drop_recreate"
            ? "Drop & Recreate Table?"
            : "Drop Table?"}
        </DialogTitle>
        <DialogContent>
          {actionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {actionError}
            </Alert>
          )}
          <DialogContentText>
            {confirmAction === "drop_recreate" ? (
              <>
                This will <strong>permanently delete all rows</strong> in{" "}
                <code>{tableDef?.pg_table_name}</code> and rebuild the Postgres
                table from the current column definitions. The column schema is
                preserved.
              </>
            ) : (
              <>
                This will <strong>permanently drop</strong> the Postgres table{" "}
                <code>{tableDef?.pg_table_name}</code> and all its data. The
                column definitions will remain so you can recreate it later.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmAction(null);
              setActionError(null);
            }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            color="error"
            variant="contained"
            disabled={actionLoading}
            startIcon={
              actionLoading ? (
                <CircularProgress size={14} color="inherit" />
              ) : undefined
            }
          >
            {actionLoading
              ? "Working…"
              : confirmAction === "drop_recreate"
                ? "Drop & Recreate"
                : "Drop Table"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
