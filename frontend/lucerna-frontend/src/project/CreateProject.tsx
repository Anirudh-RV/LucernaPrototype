import { useEffect, useState } from "react";
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
import { useAuth } from "../AuthContext";
import {
  CREATE_PROJECT_ENDPOINT,
  TABLE_DEFINITIONS_ENDPOINT,
} from "../constants";

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

interface ColumnRow {
  id: string; // local key only
  column_name: string;
  display_name: string;
  column_type: string;
  is_required: boolean;
  is_unique: boolean;
  contract_id_prefix: string;
  default_value: string;
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
    .replace(/[^a-z0-9_]/g, "");
}

function getTypeGroup(typeValue: string) {
  return COLUMN_TYPES.find((t) => t.value === typeValue)?.group ?? "Other";
}

function getTypeLabel(typeValue: string) {
  return COLUMN_TYPES.find((t) => t.value === typeValue)?.label ?? typeValue;
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
    // Auto-fill column_name if user hasn't manually edited it
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
      {/* Row header */}
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
            color: color,
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

      {/* Main fields */}
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

      {/* Extra options row */}
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

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 — project fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 — contract table fields
  const [tableName, setTableName] = useState("Contracts");
  const [tableDescription, setTableDescription] = useState("");
  const [columns, setColumns] = useState<ColumnRow[]>([makeColumn()]);

  // Shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Created project ID from step 1
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "ekaros | Create Project";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Column helpers ─────────────────────────────────────────────────────────

  const updateColumn = (id: string, field: keyof ColumnRow, value: any) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const removeColumn = (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const addColumn = () => {
    setColumns((prev) => [...prev, makeColumn()]);
  };

  // ── Step 2 submit ──────────────────────────────────────────────────────────

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

    // Validate columns
    for (const col of columns) {
      if (!col.display_name.trim() || !col.column_name.trim()) {
        setError("All columns must have a display name and column name");
        return;
      }
    }

    // Check for duplicate column names
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
    if (createdProjectId) {
      navigate(`/dashboard/${createdProjectId}/#home`, { replace: true });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
        {/* Top bar */}
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
              if (step === 2) {
                // Going back from step 2 — project already created, just go to dashboard
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
            <StepBadge step={1} current={step} />
            <Typography
              variant="caption"
              sx={{
                color: step === 1 ? "text.primary" : "text.secondary",
                fontWeight: step === 1 ? 600 : 400,
              }}
            >
              Project
            </Typography>
            <Box
              sx={{
                width: 32,
                height: 1,
                bgcolor: step > 1 ? "success.main" : "divider",
              }}
            />
            <StepBadge step={2} current={step} />
            <Typography
              variant="caption"
              sx={{
                color: step === 2 ? "text.primary" : "text.secondary",
                fontWeight: step === 2 ? 600 : 400,
              }}
            >
              Contract Table
            </Typography>
          </Box>
        </Box>

        {/* ─── STEP 1 ─────────────────────────────────────────────────────── */}
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

        {/* ─── STEP 2 ─────────────────────────────────────────────────────── */}
        {step === 2 && (
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

            {/* Table meta */}
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

            {/* Column rows */}
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

            {/* Add column button */}
            <Button
              startIcon={<AddIcon />}
              onClick={addColumn}
              variant="outlined"
              size="small"
              sx={{ mt: 1, mb: 5 }}
            >
              Add Column
            </Button>

            {/* Action buttons */}
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
      </Box>
    </AppTheme>
  );
}
