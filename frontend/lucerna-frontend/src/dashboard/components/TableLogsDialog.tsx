import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
  CircularProgress,
  Paper,
} from "@mui/material";
import { CONTRACTS_BASE_ENDPOINT } from "../../constants";

type TableLog = {
  kind: "row" | "ddl";
  id: string;
  operation: string;
  performed_at: string;
  performed_by?: string;
  success?: boolean;
  error_message?: string;
  row_identifier?: string;
  changed_fields?: string[];
  before_data?: Record<string, unknown>;
  after_data?: Record<string, unknown>;
  detail?: Record<string, unknown>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  tableDefinitionId: string;
  accessToken: string;
};

export default function TableLogsDialog({
  open,
  onClose,
  projectId,
  tableDefinitionId,
  accessToken,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<TableLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${CONTRACTS_BASE_ENDPOINT}/table-definitions/${tableDefinitionId}/activity/`,
          {
            headers: {
              "X-LUCERNA-USER-TOKEN": accessToken,
            },
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load table logs.");
        }

        setLogs(data.results || []);
      } catch (err: any) {
        setError(err.message || "Failed to load table logs.");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [open, accessToken, tableDefinitionId, projectId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
    >
      <DialogTitle>Full Table Logs</DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {!loading && !error && logs.length === 0 && (
          <Typography color="text.secondary">
            No logs found for this table.
          </Typography>
        )}

        <Stack spacing={2}>
          {logs.map((log) => (
            <Paper key={log.id} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                >
                  <Chip
                    label={log.kind.toUpperCase()}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={log.operation}
                    size="small"
                    color={log.operation === "delete" ? "error" : "primary"}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {new Date(log.performed_at).toLocaleString()}
                  </Typography>
                </Stack>

                {log.row_identifier && (
                  <Typography variant="body2">
                    Row ID: <strong>{log.row_identifier}</strong>
                  </Typography>
                )}

                {log.performed_by && (
                  <Typography variant="body2" color="text.secondary">
                    Performed by: {log.performed_by}
                  </Typography>
                )}

                {log.changed_fields && log.changed_fields.length > 0 && (
                  <Typography variant="body2">
                    Changed fields: {log.changed_fields.join(", ")}
                  </Typography>
                )}

                {log.error_message && (
                  <Typography variant="body2" color="error">
                    Error: {log.error_message}
                  </Typography>
                )}

                {log.before_data && Object.keys(log.before_data).length > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2">Before</Typography>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(log.before_data, null, 2)}
                    </pre>
                  </>
                )}

                {log.after_data && Object.keys(log.after_data).length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                      After
                    </Typography>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(log.after_data, null, 2)}
                    </pre>
                  </>
                )}

                {log.detail && Object.keys(log.detail).length > 0 && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>
                      Detail
                    </Typography>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(log.detail, null, 2)}
                    </pre>
                  </>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
