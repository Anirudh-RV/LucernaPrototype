import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
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
import CloseIcon from "@mui/icons-material/Close";
import {
  BASE_STAKEHOLDERS_ENDPOINT,
  CONTRACTS_BASE_ENDPOINT,
} from "../../constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractAccess {
  all_contracts: boolean;
  table_definition: string | null;
  contract_row_ids: number[];
}

interface Stakeholder {
  id: string;
  project: string;
  name: string;
  email: string;
  phone: string;
  contract_access: ContractAccess | null;
  created_at: string;
  updated_at: string;
}

interface ContractRow {
  id: number;
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
  onEdit,
  onDelete,
}: {
  stakeholder: Stakeholder;
  onEdit: (s: Stakeholder) => void;
  onDelete: (s: Stakeholder) => void;
}) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const color = avatarColor(stakeholder.name);

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
        {stakeholder.email && (
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
            {stakeholder.email}
          </Typography>
        )}
        {stakeholder.phone && (
          <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.125 }}>
            {stakeholder.phone}
          </Typography>
        )}
        <Box sx={{ mt: 0.75 }}>
          <AccessBadge access={stakeholder.contract_access} />
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
  tableDef,
  contractRows,
  accessToken,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (s: Stakeholder) => void;
  initial: Stakeholder | null;
  projectId: string;
  tableDef: TableDef | null;
  contractRows: ContractRow[];
  accessToken: string;
}) {
  const isEdit = !!initial;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [allContracts, setAllContracts] = useState(true);
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed form when opening
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setEmail(initial.email);
      setPhone(initial.phone);
      const access = initial.contract_access;
      setAllContracts(access?.all_contracts ?? true);
      setSelectedRowIds(access?.contract_row_ids ?? []);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setAllContracts(true);
      setSelectedRowIds([]);
    }
    setError(null);
  }, [open, initial]);

  const toggleRowId = (id: number) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Label for a contract row — use first non-system, non-auto text-ish column
  const rowLabel = (row: ContractRow): string => {
    if (!tableDef) return String(row.id);
    const labelCol = tableDef.columns.find(
      (c) =>
        !["uuid", "boolean", "date", "datetime"].includes(c.column_type) &&
        !["id", "created_at", "updated_at"].includes(c.column_name),
    );
    return labelCol
      ? String(row[labelCol.column_name] ?? row.id)
      : String(row.id);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        project: projectId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        contract_access: {
          all_contracts: allContracts,
          table_definition: tableDef?.id ?? null,
          contract_row_ids: allContracts ? [] : selectedRowIds,
        },
      };

      const url = isEdit
        ? `${BASE_STAKEHOLDERS_ENDPOINT}/${initial!.id}/`
        : `${BASE_STAKEHOLDERS_ENDPOINT}/`;
      const method = isEdit ? "PATCH" : "POST";

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
      onSave(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

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
            label="Email"
            fullWidth
            size="small"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <EmailIcon
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

        <FormControlLabel
          control={
            <Switch
              checked={allContracts}
              onChange={(e) => setAllContracts(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography variant="body2">
              {allContracts
                ? "Access to all contracts"
                : "Access to specific contracts only"}
            </Typography>
          }
          sx={{ mb: 1.5 }}
        />

        {!allContracts && (
          <Box>
            {contractRows.length === 0 ? (
              <Alert severity="info" sx={{ py: 0.5 }}>
                No contract rows exist yet. Add rows to the contract table
                first.
              </Alert>
            ) : (
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {contractRows.map((row) => {
                  const selected = selectedRowIds.includes(row.id);
                  return (
                    <Box
                      key={row.id}
                      onClick={() => toggleRowId(row.id)}
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
                        bgcolor: selected ? "action.selected" : "transparent",
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
                          bgcolor: selected ? "primary.main" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.1s",
                        }}
                      >
                        {selected && (
                          <CheckIcon sx={{ fontSize: 12, color: "#fff" }} />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 13 }}>
                        {rowLabel(row)}
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
            {selectedRowIds.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.75, display: "block" }}
              >
                {selectedRowIds.length} contract
                {selectedRowIds.length !== 1 ? "s" : ""} selected
              </Typography>
            )}
          </Box>
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

  // For the dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Stakeholder | null>(null);

  // Contract data for access picker
  const [tableDef, setTableDef] = useState<TableDef | null>(null);
  const [contractRows, setContractRows] = useState<ContractRow[]>([]);

  // Delete confirm
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

  // ── Fetch table def + rows for access picker ──────────────────────────────

  const fetchContractData = useCallback(async () => {
    try {
      const res = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/?project=${projectId}`,
        {
          headers: { "X-LUCERNA-USER-TOKEN": accessToken },
        },
      );
      const data = await res.json();
      if (!data.results?.length) return;

      const detailRes = await fetch(
        `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${data.results[0].id}/`,
        {
          headers: { "X-LUCERNA-USER-TOKEN": accessToken },
        },
      );
      const detail: TableDef = await detailRes.json();
      setTableDef(detail);

      if (detail.is_created) {
        const rowsRes = await fetch(
          `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${detail.id}/rows/`,
          {
            headers: { "X-LUCERNA-USER-TOKEN": accessToken },
          },
        );
        const rowsData = await rowsRes.json();
        setContractRows(rowsData.results ?? []);
      }
    } catch {}
  }, [projectId, accessToken]);

  useEffect(() => {
    fetchStakeholders();
    fetchContractData();
  }, [fetchStakeholders, fetchContractData]);

  // ── Save (create or update) ───────────────────────────────────────────────

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
            label={stakeholders.length}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: 11 }}
          />
        )}
        <Box sx={{ flex: 1 }} />
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
      ) : stakeholders.length === 0 ? (
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
          {stakeholders.map((s) => (
            <StakeholderCard
              key={s.id}
              stakeholder={s}
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
        tableDef={tableDef}
        contractRows={contractRows}
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
