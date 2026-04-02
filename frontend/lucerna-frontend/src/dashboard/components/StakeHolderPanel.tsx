import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Chip,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Skeleton,
  Divider,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import CheckIcon from "@mui/icons-material/Check";
import TableChartIcon from "@mui/icons-material/TableChart";
import {
  BASE_STAKEHOLDERS_ENDPOINT,
  CONTRACTS_BASE_ENDPOINT,
} from "../../constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractAccess {
  id: string;
  email: string;
  all_contracts: boolean;
  table_definition: string | null;
  contract_row_ids: number[];
  updated_at: string;
}

interface Stakeholder {
  id: string;
  project: string;
  name: string;
  phone: string;
  contract_access: ContractAccess[];
  created_at: string;
  updated_at: string;
}

interface ContractRow {
  id: number;
  contractid: string;
  [key: string]: any;
}

interface TableDef {
  id: string;
  name: string;
  is_created: boolean;
  columns: { column_name: string; display_name: string; column_type: string }[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
    "#84cc16",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Access badge ─────────────────────────────────────────────────────────────

function AccessBadge({ access }: { access: ContractAccess | null }) {
  if (!access) return null;
  if (access.all_contracts) {
    return (
      <Chip
        icon={<LockOpenIcon sx={{ fontSize: "12px !important" }} />}
        label="All contracts"
        size="small"
        color="success"
        variant="outlined"
        sx={{ height: 20, fontSize: 10, "& .MuiChip-label": { px: 0.75 } }}
      />
    );
  }
  const count = access.contract_row_ids.length;
  return (
    <Chip
      icon={<LockIcon sx={{ fontSize: "12px !important" }} />}
      label={
        count === 0 ? "No access" : `${count} contract${count !== 1 ? "s" : ""}`
      }
      size="small"
      color={count === 0 ? "error" : "warning"}
      variant="outlined"
      sx={{ height: 20, fontSize: 10, "& .MuiChip-label": { px: 0.75 } }}
    />
  );
}

// ─── Stakeholder card ─────────────────────────────────────────────────────────

function StakeholderCard({
  stakeholder,
  selectedTableDefId,
  onEdit,
  onDelete,
}: {
  stakeholder: Stakeholder;
  selectedTableDefId: string | null;
  onEdit: (s: Stakeholder) => void;
  onDelete: (s: Stakeholder) => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const color = avatarColor(stakeholder.name);

  // Find the access record relevant to the currently selected table
  const relevantAccess = selectedTableDefId
    ? (stakeholder.contract_access.find(
        (a) => a.table_definition === selectedTableDefId,
      ) ?? null)
    : (stakeholder.contract_access[0] ?? null);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 1.5,
        display: "flex",
        gap: 1.5,
        alignItems: "flex-start",
        minWidth: 220,
        maxWidth: 280,
        bgcolor: "background.paper",
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: 3 },
        "&:hover .stakeholder-menu-btn": { opacity: 1 },
        position: "relative",
      }}
    >
      <Avatar
        sx={{
          bgcolor: color,
          width: 36,
          height: 36,
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initials(stakeholder.name)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: 13,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {stakeholder.name}
        </Typography>

        {/* Email from the relevant access record */}
        {relevantAccess?.email && (
          <Typography
            sx={{
              fontSize: 11,
              color: "text.secondary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              mt: 0.25,
            }}
          >
            {relevantAccess.email}
          </Typography>
        )}

        {stakeholder.phone && (
          <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.125 }}>
            {stakeholder.phone}
          </Typography>
        )}

        <Box sx={{ mt: 0.75, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          <AccessBadge access={relevantAccess} />
          {/* Show count badge if stakeholder has access to multiple tables */}
          {stakeholder.contract_access.length > 1 && (
            <Chip
              icon={<TableChartIcon sx={{ fontSize: "12px !important" }} />}
              label={`${stakeholder.contract_access.length} tables`}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: 10,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          )}
        </Box>
      </Box>

      <IconButton
        className="stakeholder-menu-btn"
        size="small"
        sx={{
          opacity: 0,
          transition: "opacity 0.15s",
          mt: -0.5,
          mr: -0.5,
          flexShrink: 0,
        }}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        <MoreVertIcon sx={{ fontSize: 16 }} />
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onEdit(stakeholder);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onDelete(stakeholder);
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

// ─── Stakeholder form dialog ──────────────────────────────────────────────────

function StakeholderDialog({
  open,
  onClose,
  onSave,
  initial,
  projectId,
  tableDefs,
  contractRowsByTable,
  accessToken,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (s: Stakeholder) => void;
  initial: Stakeholder | null;
  projectId: string;
  tableDefs: TableDef[];
  contractRowsByTable: Record<string, ContractRow[]>;
  accessToken: string;
}) {
  const isEdit = !!initial;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // One access entry per table the user configures in this dialog
  // Shape: { tableDefId, email, allContracts, selectedRowIds }
  const [accessEntries, setAccessEntries] = useState<
    {
      tableDefId: string;
      email: string;
      allContracts: boolean;
      selectedRowIds: number[];
    }[]
  >([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed form when opening
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setPhone(initial.phone);
      setAccessEntries(
        initial.contract_access.map((a) => ({
          tableDefId: a.table_definition ?? "",
          email: a.email ?? "",
          allContracts: a.all_contracts,
          selectedRowIds: a.contract_row_ids,
        })),
      );
    } else {
      setName("");
      setPhone("");
      // Default: one entry for the first table if available
      setAccessEntries(
        tableDefs.length > 0
          ? [
              {
                tableDefId: tableDefs[0].id,
                email: "",
                allContracts: true,
                selectedRowIds: [],
              },
            ]
          : [],
      );
    }
    setError(null);
  }, [open, initial, tableDefs]);

  const updateEntry = (
    idx: number,
    patch: Partial<{
      tableDefId: string;
      email: string;
      allContracts: boolean;
      selectedRowIds: number[];
    }>,
  ) => {
    setAccessEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    );
  };

  const addEntry = () => {
    const usedIds = new Set(accessEntries.map((e) => e.tableDefId));
    const next = tableDefs.find((t) => !usedIds.has(t.id));
    if (!next) return;
    setAccessEntries((prev) => [
      ...prev,
      {
        tableDefId: next.id,
        email: "",
        allContracts: true,
        selectedRowIds: [],
      },
    ]);
  };

  const removeEntry = (idx: number) => {
    setAccessEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleRowId = (idx: number, id: number) => {
    setAccessEntries((prev) =>
      prev.map((e, i) =>
        i === idx
          ? {
              ...e,
              selectedRowIds: e.selectedRowIds.includes(id)
                ? e.selectedRowIds.filter((x) => x !== id)
                : [...e.selectedRowIds, id],
            }
          : e,
      ),
    );
  };

  const rowLabel = (
    row: ContractRow,
    tableDef: TableDef | undefined,
  ): string => {
    return row.contractid ? String(row.contractid) : String(row.id);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Send one request per access entry (the backend uses update_or_create per stakeholder+table)
      // For simplicity we send the first entry as the primary payload; subsequent entries
      // are sent as follow-up PATCH calls to the same stakeholder.
      let savedStakeholder: Stakeholder | null = null;

      for (let i = 0; i < accessEntries.length; i++) {
        const entry = accessEntries[i];
        const payload = {
          project: projectId,
          name: name.trim(),
          phone: phone.trim(),
          contract_access: {
            email: entry.email.trim(),
            all_contracts: entry.allContracts,
            table_definition: entry.tableDefId || null,
            contract_row_ids: entry.allContracts ? [] : entry.selectedRowIds,
          },
        };

        const url =
          i === 0 && isEdit
            ? `${BASE_STAKEHOLDERS_ENDPOINT}/${initial!.id}/`
            : `${BASE_STAKEHOLDERS_ENDPOINT}/`;
        const method = i === 0 && isEdit ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-LUCERNA-USER-TOKEN": accessToken,
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (i === 0) savedStakeholder = data;
      }

      if (savedStakeholder) onSave(savedStakeholder);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const unusedTableDefs = tableDefs.filter(
    (t) => !accessEntries.some((e) => e.tableDefId === t.id),
  );

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        {isEdit ? "Edit Stakeholder" : "Add Stakeholder"}
      </DialogTitle>
      <DialogContent sx={{ pt: "8px !important" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Contact fields */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3 }}>
          <TextField
            label="Name"
            fullWidth
            required
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            InputProps={{
              startAdornment: (
                <PersonIcon
                  sx={{ mr: 1, color: "text.disabled", fontSize: 18 }}
                />
              ),
            }}
          />
          <TextField
            label="Phone"
            fullWidth
            size="small"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            InputProps={{
              startAdornment: (
                <PhoneIcon
                  sx={{ mr: 1, color: "text.disabled", fontSize: 18 }}
                />
              ),
            }}
          />
        </Box>

        <Divider sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            CONTRACT ACCESS
          </Typography>
        </Divider>

        {accessEntries.map((entry, idx) => {
          const td = tableDefs.find((t) => t.id === entry.tableDefId);
          const rows = td ? (contractRowsByTable[entry.tableDefId] ?? []) : [];

          return (
            <Box
              key={idx}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                p: 1.5,
                mb: 1.5,
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
              >
                {/* Table selector */}
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Contract Table</InputLabel>
                  <Select
                    value={entry.tableDefId}
                    input={<OutlinedInput label="Contract Table" />}
                    onChange={(e) =>
                      updateEntry(idx, { tableDefId: e.target.value })
                    }
                  >
                    {/* Always show the currently selected one */}
                    {td && <MenuItem value={td.id}>{td.name}</MenuItem>}
                    {/* Show unused ones */}
                    {tableDefs
                      .filter(
                        (t) =>
                          t.id !== entry.tableDefId &&
                          !accessEntries.some(
                            (e, i) => i !== idx && e.tableDefId === t.id,
                          ),
                      )
                      .map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                {accessEntries.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => removeEntry(idx)}
                    color="error"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              {/* Email for this access rule */}
              <TextField
                label="Notification Email"
                fullWidth
                size="small"
                type="email"
                value={entry.email}
                onChange={(e) => updateEntry(idx, { email: e.target.value })}
                sx={{ mb: 1.5 }}
                InputProps={{
                  startAdornment: (
                    <EmailIcon
                      sx={{ mr: 1, color: "text.disabled", fontSize: 18 }}
                    />
                  ),
                }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={entry.allContracts}
                    onChange={(e) =>
                      updateEntry(idx, { allContracts: e.target.checked })
                    }
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {entry.allContracts
                      ? "Access to all contracts"
                      : "Access to specific contracts only"}
                  </Typography>
                }
                sx={{ mb: 1 }}
              />

              {!entry.allContracts && td && (
                <Box>
                  {rows.length === 0 ? (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      No contract rows exist yet.
                    </Alert>
                  ) : (
                    <Box
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        maxHeight: 180,
                        overflowY: "auto",
                      }}
                    >
                      {rows.map((row) => {
                        const selected = entry.selectedRowIds.includes(row.id);
                        return (
                          <Box
                            key={row.contractid}
                            onClick={() => toggleRowId(idx, row.id)}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              px: 1.5,
                              py: 0.75,
                              cursor: "pointer",
                              borderBottom: "1px solid",
                              borderColor: "divider",
                              "&:last-child": { borderBottom: "none" },
                              bgcolor: selected
                                ? "action.selected"
                                : "transparent",
                              "&:hover": { bgcolor: "action.hover" },
                              transition: "background-color 0.1s",
                            }}
                          >
                            <Box
                              sx={{
                                width: 18,
                                height: 18,
                                borderRadius: 0.5,
                                border: "2px solid",
                                borderColor: selected
                                  ? "primary.main"
                                  : "action.disabled",
                                bgcolor: selected
                                  ? "primary.main"
                                  : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.1s",
                              }}
                            >
                              {selected && (
                                <CheckIcon
                                  sx={{ fontSize: 12, color: "#fff" }}
                                />
                              )}
                            </Box>
                            <Typography sx={{ fontSize: 13 }}>
                              {rowLabel(row, td)}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: "text.disabled",
                                ml: "auto",
                              }}
                            >
                              #{row.id}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                  {entry.selectedRowIds.length > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.75, display: "block" }}
                    >
                      {entry.selectedRowIds.length} contract
                      {entry.selectedRowIds.length !== 1 ? "s" : ""} selected
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          );
        })}

        {unusedTableDefs.length > 0 && (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addEntry}
            variant="outlined"
            sx={{ mt: 0.5 }}
          >
            Add access to another table
          </Button>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={
            saving ? <CircularProgress size={14} color="inherit" /> : undefined
          }
        >
          {isEdit ? "Save Changes" : "Add Stakeholder"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main StakeholderPanel ────────────────────────────────────────────────────

export default function StakeholderPanel({
  projectId,
  accessToken,
}: {
  projectId: string;
  accessToken: string;
}) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Stakeholder | null>(null);

  const [tableDefs, setTableDefs] = useState<TableDef[]>([]);
  const [contractRowsByTable, setContractRowsByTable] = useState<
    Record<string, ContractRow[]>
  >({});

  // Filter: which table definition to view stakeholders for
  const [selectedTableDefId, setSelectedTableDefId] = useState<string | null>(
    null,
  );

  const [deleteTarget, setDeleteTarget] = useState<Stakeholder | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch stakeholders ────────────────────────────────────────────────────

  const fetchStakeholders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE_STAKEHOLDERS_ENDPOINT}/?project=${projectId}`,
        {
          headers: { "X-LUCERNA-USER-TOKEN": accessToken },
        },
      );
      const data = await res.json();
      setStakeholders(data.results ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, accessToken]);

  // ── Fetch all table defs + their rows ─────────────────────────────────────

  const fetchContractData = useCallback(async () => {
    try {
      const res = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/?project=${projectId}`,
        { headers: { "X-LUCERNA-USER-TOKEN": accessToken } },
      );
      const data = await res.json();
      const defs: TableDef[] = data.results ?? [];
      setTableDefs(defs);

      if (defs.length > 0) setSelectedTableDefId(defs[0].id);

      // Fetch rows for each created table
      const rowMap: Record<string, ContractRow[]> = {};
      await Promise.all(
        defs
          .filter((d) => d.is_created)
          .map(async (d) => {
            try {
              const r = await fetch(
                `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${d.id}/rows/`,
                { headers: { "X-LUCERNA-USER-TOKEN": accessToken } },
              );
              const rd = await r.json();
              rowMap[d.id] = rd.results ?? [];
            } catch {}
          }),
      );
      setContractRowsByTable(rowMap);
    } catch {}
  }, [projectId, accessToken]);

  useEffect(() => {
    fetchStakeholders();
    fetchContractData();
  }, [fetchStakeholders, fetchContractData]);

  // ── Filter stakeholders by selected table ─────────────────────────────────

  const visibleStakeholders = selectedTableDefId
    ? stakeholders.filter((s) =>
        s.contract_access.some(
          (a) => a.table_definition === selectedTableDefId,
        ),
      )
    : stakeholders;

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = (saved: Stakeholder) => {
    setStakeholders((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setDialogOpen(false);
    setEditTarget(null);
    // Re-fetch to get all access entries (in case multiple were created)
    fetchStakeholders();
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${BASE_STAKEHOLDERS_ENDPOINT}/${deleteTarget.id}/`, {
        method: "DELETE",
        headers: { "X-LUCERNA-USER-TOKEN": accessToken },
      });
      setStakeholders((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ mb: 4 }}>
      {/* Section header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Typography variant="h6" fontWeight={600}>
          Stakeholders
        </Typography>
        {!loading && (
          <Chip
            label={visibleStakeholders.length}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: 11 }}
          />
        )}
        <Box sx={{ flex: 1 }} />

        {/* Table filter */}
        {tableDefs.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Filter by table</InputLabel>
            <Select
              value={selectedTableDefId ?? ""}
              input={<OutlinedInput label="Filter by table" />}
              onChange={(e) => setSelectedTableDefId(e.target.value || null)}
            >
              <MenuItem value="">All tables</MenuItem>
              {tableDefs.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditTarget(null);
            setDialogOpen(true);
          }}
        >
          Add Stakeholder
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      {/* Card list */}
      {loading ? (
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={240}
              height={90}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
      ) : visibleStakeholders.length === 0 ? (
        <Box
          sx={{
            p: 3,
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <PersonIcon sx={{ fontSize: 32, color: "text.disabled", mb: 0.5 }} />
          <Typography variant="body2" color="text.secondary">
            No stakeholders yet
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Add people who need access to contracts in this project.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          {visibleStakeholders.map((s) => (
            <StakeholderCard
              key={s.id}
              stakeholder={s}
              selectedTableDefId={selectedTableDefId}
              onEdit={(s) => {
                setEditTarget(s);
                setDialogOpen(true);
              }}
              onDelete={setDeleteTarget}
            />
          ))}
        </Box>
      )}

      {/* Create / Edit dialog */}
      <StakeholderDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
        onSave={handleSave}
        initial={editTarget}
        projectId={projectId}
        tableDefs={tableDefs}
        contractRowsByTable={contractRowsByTable}
        accessToken={accessToken}
      />

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Remove Stakeholder?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will permanently remove <strong>{deleteTarget?.name}</strong>{" "}
            and their access rules.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress size={14} color="inherit" />
              ) : undefined
            }
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
