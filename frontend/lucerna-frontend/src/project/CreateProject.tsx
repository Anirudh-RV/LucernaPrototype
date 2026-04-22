import { useEffect, useRef, useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import AppTheme from "../shared-ui-theme/AppTheme";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate } from "react-router-dom";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import { useAuth } from "../AuthContext";
import {
  CREATE_PROJECT_ENDPOINT,
  TABLE_DEFINITIONS_ENDPOINT,
} from "../constants";
import * as XLSX from "xlsx";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMN_TYPES = [
  { value: "varchar", label: "Short Text", group: "Text" },
  { value: "text", label: "Long Text", group: "Text" },
  { value: "integer", label: "Integer", group: "Number" },
  { value: "biginteger", label: "Big Integer", group: "Number" },
  { value: "decimal", label: "Decimal", group: "Number" },
  { value: "float", label: "Float", group: "Number" },
  { value: "currency", label: "Currency", group: "Number" },
  { value: "date", label: "Date", group: "Date/Time" },
  { value: "datetime", label: "Date & Time", group: "Date/Time" },
  { value: "boolean", label: "Boolean (Yes / No)", group: "Other" },
  { value: "uuid", label: "UUID", group: "Other" },
  { value: "contract_id", label: "Contract ID", group: "Special" },
];

const TYPE_COLORS: Record<string, string> = {
  Text: "#3b82f6",
  Number: "#10b981",
  "Date/Time": "#f59e0b",
  Other: "#8b5cf6",
  Special: "#ef4444",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 1 | 2 | "custom" | "excel";
type TableMode = "custom" | "excel" | null;

interface ColumnRow {
  id: string;
  column_name: string;
  display_name: string;
  column_type: string;
  is_required: boolean;
  is_unique: boolean;
  contract_id_prefix: string;
  default_value: string;
}

interface ExcelColumn extends ColumnRow {
  sampleValues: string[];
}

interface LogEntry {
  message: string;
  type: "info" | "success" | "error";
}

const makeColumn = (): ColumnRow => ({
  id: crypto.randomUUID(),
  column_name: "",
  display_name: "",
  column_type: "varchar",
  is_required: false,
  is_unique: false,
  contract_id_prefix: "",
  default_value: "",
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSnakeCase(str: string) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 63);
}

function makeUniqueColumnName(base: string, used: Set<string>) {
  let name = toSnakeCase(base) || "column";
  let finalName = name;
  let i = 2;

  while (used.has(finalName)) {
    finalName = `${name}_${i}`;
    i += 1;
  }

  used.add(finalName);
  return finalName;
}

function getTypeGroup(typeValue: string) {
  return COLUMN_TYPES.find((t) => t.value === typeValue)?.group ?? "Other";
}

function getTypeLabel(typeValue: string) {
  return COLUMN_TYPES.find((t) => t.value === typeValue)?.label ?? typeValue;
}

function inferColumnType(values: unknown[]): string {
  const samples = values
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .slice(0, 30)
    .map((v) => String(v).trim());

  if (!samples.length) return "varchar";

  const isUuid = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s,
    );

  const isInteger = (s: string) => /^-?\d+$/.test(s);

  const isDecimal = (s: string) => /^-?\d+(\.\d+)?$/.test(s);

  const isCurrency = (s: string) =>
    /^[$€£]?\s?-?\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(s) ||
    /^[$€£]?\s?-?\d+(\.\d{1,2})?$/.test(s);

  const isBoolean = (s: string) => {
    const v = s.toLowerCase();
    return ["true", "false", "yes", "no", "1", "0", "y", "n"].includes(v);
  };

  const isDate = (s: string) => {
    // Common date formats only, avoid parseFloat-style false positives
    return (
      /^\d{4}-\d{2}-\d{2}$/.test(s) || // 2026-04-22
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s) || // 4/22/2026 or 04-22-26
      /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}$/.test(s) || // 22 Apr 2026
      /^\d{4}\/\d{2}\/\d{2}$/.test(s)
    );
  };

  const isDateTime = (s: string) => {
    return (
      /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(
        s,
      ) ||
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM|am|pm)?$/.test(
        s,
      )
    );
  };

  const all = (fn: (s: string) => boolean) => samples.every(fn);

  // Order matters: most specific first
  if (all(isDateTime)) return "datetime";
  if (all(isDate)) return "date";
  if (all(isBoolean)) return "boolean";
  if (all(isUuid)) return "uuid";

  // Contract IDs are usually not safely inferable from values alone.
  // Keep them manual unless you have a strong naming rule.
  // Example: if header contains "contract id", set it outside inference.

  if (all(isInteger)) {
    const maxAbs = Math.max(...samples.map((s) => Math.abs(Number(s))));
    return maxAbs > 2147483647 ? "biginteger" : "integer";
  }

  if (all(isCurrency)) return "currency";

  if (all(isDecimal)) {
    const hasFraction = samples.some((s) => s.includes("."));
    return hasFraction ? "decimal" : "integer";
  }

  const maxLen = Math.max(...samples.map((s) => s.length));
  if (maxLen > 255) return "text";

  return "varchar";
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepBadge({ step, current }: { step: number; current: number }) {
  const done = current > step;
  const active = current === step;
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 600,
        bgcolor: done
          ? "success.main"
          : active
            ? "primary.main"
            : "action.disabledBackground",
        color: done || active ? "#fff" : "text.disabled",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      {done ? "✓" : step}
    </Box>
  );
}

// ─── Column editor row ───────────────────────────────────────────────────────

function ColumnEditorRow({
  col,
  index,
  onChange,
  onRemove,
}: {
  col: ColumnRow;
  index: number;
  onChange: (id: string, field: keyof ColumnRow, value: any) => void;
  onRemove: (id: string) => void;
}) {
  const group = getTypeGroup(col.column_type);
  const color = TYPE_COLORS[group];

  const handleDisplayNameChange = (val: string) => {
    onChange(col.id, "display_name", val);
    onChange(col.id, "column_name", toSnakeCase(val));
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        mb: 1.5,
        bgcolor: "background.paper",
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: 2 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <DragIndicatorIcon
          sx={{ color: "text.disabled", cursor: "grab", fontSize: 18 }}
        />
        <Typography
          variant="caption"
          sx={{ color: "text.disabled", minWidth: 20 }}
        >
          #{index + 1}
        </Typography>
        <Chip
          label={getTypeLabel(col.column_type)}
          size="small"
          sx={{
            bgcolor: `${color}18`,
            color,
            border: `1px solid ${color}40`,
            fontWeight: 600,
            fontSize: 11,
            height: 22,
          }}
        />
        <Box sx={{ flex: 1 }} />
        {col.is_required && (
          <Chip
            label="Required"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ height: 20, fontSize: 10 }}
          />
        )}
        {col.is_unique && (
          <Chip
            label="Unique"
            size="small"
            color="info"
            variant="outlined"
            sx={{ height: 20, fontSize: 10 }}
          />
        )}
        <Tooltip title="Remove column">
          <IconButton
            size="small"
            onClick={() => onRemove(col.id)}
            sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

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
          fullWidth
          required
          value={col.display_name}
          onChange={(e) => handleDisplayNameChange(e.target.value)}
          placeholder="e.g. Vendor Name"
        />
        <TextField
          label="Column Name (snake_case)"
          size="small"
          fullWidth
          required
          value={col.column_name}
          onChange={(e) =>
            onChange(col.id, "column_name", toSnakeCase(e.target.value))
          }
          placeholder="e.g. vendor_name"
          inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Type</InputLabel>
          <Select
            value={col.column_type}
            label="Type"
            onChange={(e) => onChange(col.id, "column_type", e.target.value)}
          >
            {["Text", "Number", "Date/Time", "Other", "Special"].map(
              (group) => [
                <MenuItem
                  key={`g-${group}`}
                  disabled
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: TYPE_COLORS[group],
                    py: 0.5,
                    opacity: "1 !important",
                  }}
                >
                  — {group} —
                </MenuItem>,
                ...COLUMN_TYPES.filter((t) => t.group === group).map((t) => (
                  <MenuItem key={t.value} value={t.value} sx={{ pl: 3 }}>
                    {t.label}
                  </MenuItem>
                )),
              ],
            )}
          </Select>
        </FormControl>
      </Box>

      <Box
        sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}
      >
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={col.is_required}
              onChange={(e) =>
                onChange(col.id, "is_required", e.target.checked)
              }
            />
          }
          label={<Typography variant="caption">Required</Typography>}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={col.is_unique}
              onChange={(e) => onChange(col.id, "is_unique", e.target.checked)}
            />
          }
          label={<Typography variant="caption">Unique</Typography>}
        />
        {col.column_type === "contract_id" && (
          <TextField
            label="ID Prefix"
            size="small"
            value={col.contract_id_prefix}
            onChange={(e) =>
              onChange(col.id, "contract_id_prefix", e.target.value)
            }
            placeholder="e.g. USAF-"
            sx={{ width: 140 }}
          />
        )}
        {!["contract_id", "boolean", "uuid", "date", "datetime"].includes(
          col.column_type,
        ) && (
          <TextField
            label="Default Value"
            size="small"
            value={col.default_value}
            onChange={(e) => onChange(col.id, "default_value", e.target.value)}
            placeholder="Optional"
            sx={{ width: 160 }}
          />
        )}
      </Box>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateProject(props: { disableCustomTheme?: boolean }) {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — project fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // Step 2 — mode choice
  const [tableMode, setTableMode] = useState<TableMode>(null);

  // Custom table fields
  const [tableName, setTableName] = useState("Contracts");
  const [tableDescription, setTableDescription] = useState("");
  const [columns, setColumns] = useState<ColumnRow[]>([makeColumn()]);

  // Excel upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelSheetName, setExcelSheetName] = useState("");
  const [excelColumns, setExcelColumns] = useState<ExcelColumn[]>([]);
  const [excelRows, setExcelRows] = useState<unknown[][]>([]);
  const [excelTableName, setExcelTableName] = useState("");
  const [excelTableDesc, setExcelTableDesc] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Import progress
  const [importLogs, setImportLogs] = useState<LogEntry[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [rowsInserted, setRowsInserted] = useState(0);
  const [rowsFailed, setRowsFailed] = useState(0);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "ekaros | Create Project";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const addLog = (message: string, type: LogEntry["type"] = "info") => {
    setImportLogs((prev) => [...prev, { message, type }]);
  };

  // ── Step 1 submit ──────────────────────────────────────────────────────────

  const handleCreateProject = async () => {
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    if (!accessToken) {
      setError("Authentication required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(CREATE_PROJECT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LUCERNA-USER-TOKEN": accessToken,
        },
        body: JSON.stringify({
          project_name: name,
          project_description: description || null,
        }),
      });
      const data = await res.json();
      if (data.status !== 1)
        throw new Error(data.status_description || "Project creation failed");

      const projectId = data.response_body?.project?.id;
      if (!projectId) throw new Error("Invalid server response");

      setCreatedProjectId(projectId);
      setStep(2);
      scrollTop();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Excel parsing ──────────────────────────────────────────────────────────

  const parseExcelFile = (file: File) => {
    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, {
        type: "array",
        cellDates: true,
      });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: null,
      }) as unknown[][];
      if (!raw.length) {
        setError("Sheet appears empty.");
        return;
      }

      const headers = (raw[0] as unknown[]).map((h, i) =>
        h != null ? String(h).trim() : `col_${i + 1}`,
      );
      const dataRows = raw
        .slice(1)
        .filter((r) => (r as unknown[]).some((c) => c !== null));

      const usedNames = new Set<string>();

      const cols: ExcelColumn[] = headers.map((h, ci) => {
        const colValues = dataRows.map((r) => (r as unknown[])[ci]);
        const sampleValues = colValues
          .filter((v) => v !== null && v !== undefined)
          .slice(0, 3)
          .map(String);

        return {
          id: crypto.randomUUID(),
          column_name: makeUniqueColumnName(h, usedNames),
          display_name: h,
          column_type: inferColumnType(colValues),
          is_required: false,
          is_unique: false,
          contract_id_prefix: "",
          default_value: "",
          sampleValues,
        };
      });

      setExcelSheetName(sheetName);
      setExcelColumns(cols);
      setExcelRows(dataRows);
      setExcelTableName(sheetName || "Imported Contracts");
      setError(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseExcelFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelFile(file);
  };

  const updateExcelColumn = (
    id: string,
    field: keyof ColumnRow,
    value: any,
  ) => {
    setExcelColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  // ── Excel import ───────────────────────────────────────────────────────────

  const handleExcelImport = async () => {
    if (!excelTableName.trim()) {
      setError("Table name is required");
      return;
    }
    if (!createdProjectId) {
      setError("Project ID missing");
      return;
    }
    if (!accessToken) {
      setError("Authentication required");
      return;
    }
    if (!excelColumns.length) {
      setError("No columns parsed from file");
      return;
    }

    setLoading(true);
    setError(null);
    setImportLogs([]);
    setImportProgress(0);
    setImportDone(false);
    setRowsInserted(0);
    setRowsFailed(0);

    // Move to excel step to show progress
    setStep("excel");
    scrollTop();

    try {
      // 1. Create table definition
      addLog("Creating table definition…", "info");
      const defRes = await fetch(TABLE_DEFINITIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LUCERNA-USER-TOKEN": accessToken,
        },
        body: JSON.stringify({
          project: createdProjectId,
          name: excelTableName,
          description: excelTableDesc || "",
          columns: excelColumns.map((col, idx) => ({
            column_name: col.column_name,
            display_name: col.display_name,
            column_type: col.column_type,
            is_required: col.is_required,
            is_unique: col.is_unique,
            default_value: col.default_value || null,
            contract_id_prefix: col.contract_id_prefix || null,
            order: idx,
          })),
        }),
      });
      const defData = await defRes.json();
      if (!defData.id)
        throw new Error(defData.error || "Table definition creation failed");

      const tableId = defData.id;
      addLog(`Table definition created (${defData.pg_table_name})`, "success");

      // 2. Create the physical Postgres table
      addLog("Creating Postgres table…", "info");
      const createRes = await fetch(
        `${TABLE_DEFINITIONS_ENDPOINT.replace(/\/$/, "")}/${tableId}/create-table/`,
        {
          method: "POST",
          headers: { "X-LUCERNA-USER-TOKEN": accessToken },
        },
      );
      const createData = await createRes.json();
      if (createRes.status !== 200 && createRes.status !== 201) {
        throw new Error(createData.error || "Table creation failed");
      }
      addLog("Postgres table ready", "success");

      // 3. Insert rows
      const rowsEndpoint = `${TABLE_DEFINITIONS_ENDPOINT.replace(/\/$/, "")}/${tableId}/rows/`;
      const colNames = excelColumns.map((c) => c.column_name);
      const AUTO_TYPES = new Set(["uuid", "contract_id"]);
      const insertableCols = excelColumns.filter(
        (c) => !AUTO_TYPES.has(c.column_type),
      );

      addLog(`Inserting ${excelRows.length} rows…`, "info");
      let inserted = 0;
      let failed = 0;

      for (let i = 0; i < excelRows.length; i++) {
        const raw = excelRows[i] as unknown[];
        const body: Record<string, unknown> = {};
        insertableCols.forEach((col) => {
          const ci = colNames.indexOf(col.column_name);
          const val = raw[ci];
          if (val !== null && val !== undefined && val !== "") {
            body[col.column_name] = val;
          }
        });

        try {
          const rowRes = await fetch(rowsEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-LUCERNA-USER-TOKEN": accessToken,
            },
            body: JSON.stringify(body),
          });
          const rowData = await rowRes.json();
          if (!rowData.id) throw new Error(rowData.error || "Insert failed");
          inserted++;
        } catch {
          failed++;
          if (failed <= 3) addLog(`Row ${i + 1}: insert failed`, "error");
        }

        setRowsInserted(inserted);
        setRowsFailed(failed);
        setImportProgress(Math.round(((i + 1) / excelRows.length) * 100));
      }

      addLog(
        `Done — ${inserted} rows inserted, ${failed} failed`,
        failed === 0 ? "success" : "error",
      );
      setImportDone(true);
    } catch (err: any) {
      addLog(`Fatal: ${err.message}`, "error");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Custom table helpers ───────────────────────────────────────────────────

  const updateColumn = (id: string, field: keyof ColumnRow, value: any) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };
  const removeColumn = (id: string) =>
    setColumns((prev) => prev.filter((c) => c.id !== id));
  const addColumn = () => setColumns((prev) => [...prev, makeColumn()]);

  // ── Custom table submit ────────────────────────────────────────────────────

  const handleCreateTable = async () => {
    if (!tableName.trim()) {
      setError("Table name is required");
      return;
    }
    if (!createdProjectId) {
      setError("Project ID missing");
      return;
    }
    if (!accessToken) {
      setError("Authentication required");
      return;
    }

    for (const col of columns) {
      if (!col.display_name.trim() || !col.column_name.trim()) {
        setError("All columns must have a display name and column name");
        return;
      }
    }
    const names = columns.map((c) => c.column_name);
    if (new Set(names).size !== names.length) {
      setError(
        "Duplicate column names detected — each column name must be unique",
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(TABLE_DEFINITIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LUCERNA-USER-TOKEN": accessToken,
        },
        body: JSON.stringify({
          project: createdProjectId,
          name: tableName,
          description: tableDescription || "",
          columns: columns.map((col, idx) => ({
            column_name: col.column_name,
            display_name: col.display_name || col.column_name,
            column_type: col.column_type,
            is_required: col.is_required,
            is_unique: col.is_unique,
            default_value: col.default_value || null,
            contract_id_prefix: col.contract_id_prefix || null,
            order: idx,
          })),
        }),
      });
      const data = await res.json();
      if (!data.id) throw new Error(data.error || "Table creation failed");
      navigate(`/dashboard/${createdProjectId}/#home`, { replace: true });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipTable = () => {
    if (createdProjectId)
      navigate(`/dashboard/${createdProjectId}/#home`, { replace: true });
  };

  // ── Step label helpers ─────────────────────────────────────────────────────

  const stepNumber = step === 1 ? 1 : step === 2 ? 2 : 3;
  const stepLabels = [
    "Project",
    "Method",
    tableMode === "excel" ? "Upload & Import" : "Contract Table",
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <Box
        sx={(theme) => ({
          position: "relative",
          minHeight: "100vh",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            zIndex: -1,
            backgroundRepeat: "no-repeat",
            backgroundImage:
              "radial-gradient(ellipse 80% 25% at 50% 0%, hsl(210, 100%, 90%), transparent)",
            ...theme.applyStyles?.("dark", {
              backgroundImage:
                "radial-gradient(ellipse 80% 25% at 50% 0%, hsl(210, 100%, 16%), transparent)",
            }),
          },
        })}
      >
        {/* ── Top bar ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 4,
            pt: 3,
          }}
        >
          <IconButton
            size="small"
            onClick={() => {
              if (step === "custom" || step === "excel") {
                // If import is done, go to dashboard; otherwise go back to method choice
                if (importDone && createdProjectId) {
                  navigate(`/dashboard/${createdProjectId}/#home`, {
                    replace: true,
                  });
                } else {
                  setStep(2);
                  scrollTop();
                }
              } else if (step === 2) {
                if (createdProjectId) {
                  navigate(`/dashboard/${createdProjectId}/#home`, {
                    replace: true,
                  });
                } else {
                  setStep(1);
                }
              } else {
                window.history.length > 1
                  ? navigate(-1)
                  : navigate("/dashboard/");
              }
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>

          {/* Step indicator */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {stepLabels.map((label, i) => (
              <Box
                key={i}
                sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
              >
                {i > 0 && (
                  <Box
                    sx={{
                      width: 32,
                      height: 1,
                      bgcolor: stepNumber > i + 1 ? "success.main" : "divider",
                    }}
                  />
                )}
                <StepBadge step={i + 1} current={stepNumber} />
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      stepNumber === i + 1 ? "text.primary" : "text.secondary",
                    fontWeight: stepNumber === i + 1 ? 600 : 400,
                  }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ═══ STEP 1 — Project ═══════════════════════════════════════════════ */}
        {step === 1 && (
          <Container
            maxWidth="sm"
            sx={{
              py: 10,
              minHeight: "60vh",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Box width="100%">
              <Typography variant="h3" gutterBottom>
                Create Project
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={4}>
                Create a new project to start tracking journeys and analytics.
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              <TextField
                label="Project Name"
                fullWidth
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                sx={{ mb: 3 }}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ mb: 4 }}
              />
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleCreateProject}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Continue →"
                )}
              </Button>
            </Box>
          </Container>
        )}

        {/* ═══ STEP 2 — Choose method ══════════════════════════════════════════ */}
        {step === 2 && (
          <Container
            maxWidth="sm"
            sx={{
              py: 10,
              minHeight: "60vh",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Box width="100%">
              <Typography variant="h3" gutterBottom>
                Set up your contract table
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={5}>
                How would you like to define your contract schema?
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 2,
                  mb: 4,
                }}
              >
                {/* Custom option */}
                <Box
                  onClick={() => {
                    setTableMode("custom");
                    setStep("custom");
                    scrollTop();
                  }}
                  sx={{
                    border: "2px solid",
                    borderColor:
                      tableMode === "custom" ? "primary.main" : "divider",
                    borderRadius: 3,
                    p: 3,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "action.hover",
                    },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: "primary.50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <TableChartOutlinedIcon
                      sx={{ color: "primary.main", fontSize: 24 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Custom
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Define columns manually, one by one
                    </Typography>
                  </Box>
                </Box>

                {/* Excel upload option */}
                <Box
                  onClick={() => {
                    setTableMode("excel");
                    setStep("excel");
                    scrollTop();
                  }}
                  sx={{
                    border: "2px solid",
                    borderColor:
                      tableMode === "excel" ? "primary.main" : "divider",
                    borderRadius: 3,
                    p: 3,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "action.hover",
                    },
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: "success.50",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <UploadFileIcon
                      sx={{ color: "success.main", fontSize: 24 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Upload Excel
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Import schema & rows from an .xlsx file
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Button variant="text" color="inherit" onClick={handleSkipTable}>
                Skip for now
              </Button>
            </Box>
          </Container>
        )}

        {/* ═══ STEP 3a — Custom table ══════════════════════════════════════════ */}
        {step === "custom" && (
          <Container maxWidth="md" sx={{ py: 8, pb: 14 }}>
            <Box mb={5}>
              <Typography variant="h3" gutterBottom>
                Define Contract Table
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Set up the schema for your contract records. You can always add
                more columns later.
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: 2,
                mb: 4,
              }}
            >
              <TextField
                label="Table Name"
                fullWidth
                required
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="e.g. Contracts"
              />
              <TextField
                label="Description"
                fullWidth
                value={tableDescription}
                onChange={(e) => setTableDescription(e.target.value)}
                placeholder="Optional description"
              />
            </Box>

            <Divider sx={{ mb: 3 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 1 }}
              >
                COLUMNS ({columns.length})
              </Typography>
            </Divider>

            <Box>
              {columns.map((col, idx) => (
                <ColumnEditorRow
                  key={col.id}
                  col={col}
                  index={idx}
                  onChange={updateColumn}
                  onRemove={removeColumn}
                />
              ))}
            </Box>

            <Button
              startIcon={<AddIcon />}
              onClick={addColumn}
              variant="outlined"
              size="small"
              sx={{ mt: 1, mb: 5 }}
            >
              Add Column
            </Button>

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button
                variant="text"
                color="inherit"
                onClick={handleSkipTable}
                disabled={loading}
              >
                Skip for now
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleCreateTable}
                disabled={loading || columns.length === 0}
                sx={{ minWidth: 200 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Create Project →"
                )}
              </Button>
            </Box>
          </Container>
        )}

        {/* ═══ STEP 3b — Excel upload & import ═════════════════════════════════ */}
        {step === "excel" && (
          <Container maxWidth="md" sx={{ py: 8, pb: 14 }}>
            {/* ── File not yet parsed: show upload UI ── */}
            {!excelFile && (
              <>
                <Box mb={5}>
                  <Typography variant="h3" gutterBottom>
                    Upload Excel File
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    We'll read your spreadsheet, infer column types, and let you
                    review before importing.
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Box
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    border: "2px dashed",
                    borderColor: isDragging ? "primary.main" : "divider",
                    borderRadius: 3,
                    p: 6,
                    textAlign: "center",
                    cursor: "pointer",
                    bgcolor: isDragging ? "action.hover" : "transparent",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <UploadFileIcon
                    sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }}
                  />
                  <Typography variant="h6" gutterBottom>
                    Drop your Excel file here
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    .xlsx or .xls — first sheet will be used, first row must be
                    headers
                  </Typography>
                  <Button variant="outlined" size="small" sx={{ mt: 3 }}>
                    Browse files
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    justifyContent: "flex-end",
                    mt: 4,
                  }}
                >
                  <Button
                    variant="text"
                    color="inherit"
                    onClick={handleSkipTable}
                  >
                    Skip for now
                  </Button>
                </Box>
              </>
            )}

            {/* ── File parsed: show column review + table name ── */}
            {excelFile && !importDone && importLogs.length === 0 && (
              <>
                <Box mb={4}>
                  <Typography variant="h3" gutterBottom>
                    Review & Import
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Detected {excelColumns.length} columns and{" "}
                    {excelRows.length.toLocaleString()} rows from{" "}
                    <strong>{excelSheetName}</strong>. Adjust types if needed,
                    then import.
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 2fr",
                    gap: 2,
                    mb: 4,
                  }}
                >
                  <TextField
                    label="Table Name"
                    fullWidth
                    required
                    value={excelTableName}
                    onChange={(e) => setExcelTableName(e.target.value)}
                  />
                  <TextField
                    label="Description"
                    fullWidth
                    value={excelTableDesc}
                    onChange={(e) => setExcelTableDesc(e.target.value)}
                    placeholder="Optional"
                  />
                </Box>

                <Divider sx={{ mb: 3 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 1 }}
                  >
                    COLUMNS ({excelColumns.length})
                  </Typography>
                </Divider>

                {excelColumns.map((col, idx) => (
                  <Box
                    key={col.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 2,
                      mb: 1.5,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled", minWidth: 20 }}
                      >
                        #{idx + 1}
                      </Typography>
                      <Chip
                        label={getTypeLabel(col.column_type)}
                        size="small"
                        sx={{
                          bgcolor: `${TYPE_COLORS[getTypeGroup(col.column_type)]}18`,
                          color: TYPE_COLORS[getTypeGroup(col.column_type)],
                          border: `1px solid ${TYPE_COLORS[getTypeGroup(col.column_type)]}40`,
                          fontWeight: 600,
                          fontSize: 11,
                          height: 22,
                        }}
                      />
                      {col.sampleValues.length > 0 && (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ fontStyle: "italic", ml: 1 }}
                        >
                          e.g. {col.sampleValues.join(", ")}
                        </Typography>
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 1.5,
                      }}
                    >
                      <TextField
                        label="Display Name"
                        size="small"
                        value={col.display_name}
                        onChange={(e) =>
                          updateExcelColumn(
                            col.id,
                            "display_name",
                            e.target.value,
                          )
                        }
                      />
                      <TextField
                        label="Column Name"
                        size="small"
                        value={col.column_name}
                        onChange={(e) =>
                          updateExcelColumn(
                            col.id,
                            "column_name",
                            toSnakeCase(e.target.value),
                          )
                        }
                        inputProps={{
                          style: { fontFamily: "monospace", fontSize: 13 },
                        }}
                      />
                      <FormControl size="small" fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={col.column_type}
                          label="Type"
                          onChange={(e) =>
                            updateExcelColumn(
                              col.id,
                              "column_type",
                              e.target.value,
                            )
                          }
                        >
                          {[
                            "Text",
                            "Number",
                            "Date/Time",
                            "Other",
                            "Special",
                          ].map((group) => [
                            <MenuItem
                              key={`g-${group}`}
                              disabled
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: TYPE_COLORS[group],
                                py: 0.5,
                                opacity: "1 !important",
                              }}
                            >
                              — {group} —
                            </MenuItem>,
                            ...COLUMN_TYPES.filter(
                              (t) => t.group === group,
                            ).map((t) => (
                              <MenuItem
                                key={t.value}
                                value={t.value}
                                sx={{ pl: 3 }}
                              >
                                {t.label}
                              </MenuItem>
                            )),
                          ])}
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                ))}

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    justifyContent: "flex-end",
                    mt: 4,
                  }}
                >
                  <Button
                    variant="text"
                    color="inherit"
                    onClick={() => {
                      setExcelFile(null);
                      setExcelColumns([]);
                      setExcelRows([]);
                    }}
                    disabled={loading}
                  >
                    ← Change file
                  </Button>
                  <Button
                    variant="text"
                    color="inherit"
                    onClick={handleSkipTable}
                    disabled={loading}
                  >
                    Skip for now
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleExcelImport}
                    disabled={loading}
                    sx={{ minWidth: 200 }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      `Import ${excelRows.length.toLocaleString()} rows →`
                    )}
                  </Button>
                </Box>
              </>
            )}

            {/* ── Import in progress / done ── */}
            {(importLogs.length > 0 || loading) && (
              <Box>
                <Box mb={4}>
                  <Typography variant="h3" gutterBottom>
                    {importDone ? "Import complete" : "Importing…"}
                  </Typography>
                  {importDone && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mt: 1,
                      }}
                    >
                      <CheckCircleIcon sx={{ color: "success.main" }} />
                      <Typography color="success.main" fontWeight={500}>
                        {rowsInserted} rows imported successfully
                        {rowsFailed > 0 && ` · ${rowsFailed} failed`}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Summary chips */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 2,
                    mb: 3,
                  }}
                >
                  {[
                    {
                      label: "Rows inserted",
                      value: rowsInserted,
                      color: "success",
                    },
                    { label: "Rows failed", value: rowsFailed, color: "error" },
                    {
                      label: "Progress",
                      value: `${importProgress}%`,
                      color: "primary",
                    },
                  ].map(({ label, value, color }) => (
                    <Box
                      key={label}
                      sx={{
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {label}
                      </Typography>
                      <Typography
                        variant="h5"
                        color={`${color}.main`}
                        fontWeight={600}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={importProgress}
                  sx={{ mb: 2, borderRadius: 1, height: 6 }}
                />

                {/* Log area */}
                <Box
                  sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 2,
                    maxHeight: 280,
                    overflowY: "auto",
                    fontFamily: "monospace",
                    fontSize: 12,
                    lineHeight: 2,
                  }}
                >
                  {importLogs.map((entry, i) => (
                    <Box
                      key={i}
                      sx={{
                        color:
                          entry.type === "success"
                            ? "success.main"
                            : entry.type === "error"
                              ? "error.main"
                              : "text.secondary",
                      }}
                    >
                      {entry.type === "success"
                        ? "✓"
                        : entry.type === "error"
                          ? "✗"
                          : "·"}{" "}
                      {entry.message}
                    </Box>
                  ))}
                </Box>

                {importDone && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      justifyContent: "flex-end",
                      mt: 4,
                    }}
                  >
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() =>
                        navigate(`/dashboard/${createdProjectId}/#home`, {
                          replace: true,
                        })
                      }
                    >
                      Go to project →
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Container>
        )}
      </Box>
    </AppTheme>
  );
}
