import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { STAKEHOLDER_PORTAL_TABLES_ENDPOINT } from "../../constants";

interface PortalColumn {
  column_name: string;
  display_name: string;
  column_type: string;
}

interface PortalTable {
  id: string;
  name: string;
  description: string;
  role: string;
  all_contracts: boolean;
  columns: PortalColumn[];
}

type RowData = Record<string, any>;

// ── Cell display (read-only) ────────────────────────────────────────────────

function CellDisplay({ col, value }: { col: PortalColumn; value: any }) {
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
          : `$${num.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
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

// ── Main component ──────────────────────────────────────────────────────────

export default function PortalContractsTable({
  stakeholderToken,
}: {
  stakeholderToken: string;
}) {
  const [tables, setTables] = useState<PortalTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [rows, setRows] = useState<RowData[]>([]);
  const [columns, setColumns] = useState<PortalColumn[]>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch tables
  const fetchTables = useCallback(async () => {
    setLoadingTables(true);
    setError(null);
    try {
      const res = await fetch(STAKEHOLDER_PORTAL_TABLES_ENDPOINT, {
        headers: { "X-LUCERNA-STAKEHOLDER-TOKEN": stakeholderToken },
      });

      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }

      const data = await res.json();
      const tablelist: PortalTable[] = data.tables || [];
      setTables(tablelist);

      if (tablelist.length > 0) {
        setSelectedTableId(tablelist[0].id);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingTables(false);
    }
  }, [stakeholderToken]);

  // Fetch rows for selected table
  const fetchRows = useCallback(
    async (tableId: string) => {
      if (!tableId) return;
      setLoadingRows(true);
      setError(null);
      try {
        const res = await fetch(
          `${STAKEHOLDER_PORTAL_TABLES_ENDPOINT}${tableId}/rows/`,
          {
            headers: { "X-LUCERNA-STAKEHOLDER-TOKEN": stakeholderToken },
          }
        );

        if (res.status === 401) {
          setError("Session expired. Please log in again.");
          return;
        }

        const data = await res.json();
        setRows(data.rows || []);
        setColumns(data.columns || []);
        setTotalCount(data.total_count || 0);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingRows(false);
      }
    },
    [stakeholderToken]
  );

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (selectedTableId) {
      fetchRows(selectedTableId);
    }
  }, [selectedTableId, fetchRows]);

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loadingTables) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (tables.length === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No tables are currently shared with you.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Table selector */}
      {tables.length > 1 && (
        <FormControl size="small" sx={{ mb: 2, minWidth: 250 }}>
          <InputLabel>Table</InputLabel>
          <Select
            value={selectedTableId}
            label="Table"
            onChange={(e) => setSelectedTableId(e.target.value)}
          >
            {tables.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Table header */}
      {selectedTable && (
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="h6" fontWeight={600}>
            {selectedTable.name}
          </Typography>
          <Chip
            label={selectedTable.role === "writer" ? "Editor" : "Viewer"}
            size="small"
            color={selectedTable.role === "writer" ? "primary" : "default"}
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
          />
          <Typography variant="body2" sx={{ color: "text.secondary", ml: 1 }}>
            {totalCount} row{totalCount !== 1 ? "s" : ""}
          </Typography>
        </Box>
      )}

      {/* Data table */}
      {loadingRows ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: 11,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    width: 50,
                    bgcolor: "background.paper",
                  }}
                >
                  #
                </TableCell>
                {columns.map((col) => (
                  <TableCell
                    key={col.column_name}
                    sx={{
                      fontWeight: 700,
                      fontSize: 11,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      whiteSpace: "nowrap",
                      bgcolor: "background.paper",
                    }}
                  >
                    {col.display_name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    sx={{ textAlign: "center", py: 4, color: "text.secondary" }}
                  >
                    No data available.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow
                    key={row.id ?? idx}
                    hover
                    sx={{
                      "&:last-child td": { borderBottom: 0 },
                    }}
                  >
                    <TableCell
                      sx={{
                        fontSize: 11,
                        color: "text.disabled",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {idx + 1}
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell key={col.column_name} sx={{ py: 1 }}>
                        <CellDisplay col={col} value={row[col.column_name]} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
