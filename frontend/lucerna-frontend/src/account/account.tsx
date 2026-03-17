import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  CssBaseline,
  TextField,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Divider,
  MenuItem,
  Chip,
} from "@mui/material";
import AppTheme from "../shared-ui-theme/AppTheme";
import { useAuth } from "../AuthContext";
import {
  USER_FIELDS_EDIT_V1_ENDPOINT,
  PASSWORD_UPDATE_V1_ENDPOINT,
  AGENT_LIST_V1_ENDPOINT,
  AGENT_KEY_REVOKE_ENDPOINT,
  BACKEND_SDK_KEY_LIST_ENDPOINT,
  BACKEND_SDK_KEY_REVOKE_ENDPOINT,
} from "../constants";
import ColorModeIconDropdown from "../shared-ui-theme/ColorModeIconDropdown";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useSearchParams } from "react-router-dom";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import KeyIcon from "@mui/icons-material/Key";
import BlockIcon from "@mui/icons-material/Block";
import VpnKeyIcon from "@mui/icons-material/VpnKey";

interface AgentKey {
  id: string;
  prefix: string;
  name: string | null;
  created_at: string;
  expires_at: string | null;
  active: boolean;
}

interface BackendSdkKey {
  id: string;
  prefix: string;
  name: string | null;
  created_at: string;
  expires_at: string | null;
  active: boolean;
  revoked_at: string | null;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  provider: string;
  is_active: boolean;
  agent_keys: AgentKey[];
}

export default function Account(props: { disableCustomTheme?: boolean }) {
  const { user, accessToken, refreshAuth, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";

  const [selectedMenu, setSelectedMenu] = useState<
    "user" | "resetPassword" | "agentKeys" | "backendSdkKeys"
  >("user");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [backendSdkKeys, setBackendSdkKeys] = useState<BackendSdkKey[]>([]);
  const [backendSdkKeysLoading, setBackendSdkKeysLoading] = useState(false);
  const [revokingBackendKeyId, setRevokingBackendKeyId] = useState<
    string | null
  >(null);
  const [snackBarSuccessValue, snackBarPromptSuccess] = useState<string | null>(
    null,
  );
  const [snackBarErrorValue, snackBarPromptError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    document.title = "LUCERNA | Account";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (user) {
      setFirstName(user.first_name);
      setMiddleName(user.middle_name ?? "");
      setLastName(user.last_name);
    }
  }, [user]);

  useEffect(() => {
    if (selectedMenu === "agentKeys" && projectId && accessToken) {
      fetchAgents();
    }
  }, [selectedMenu]);

  useEffect(() => {
    if (selectedMenu === "backendSdkKeys" && projectId && accessToken) {
      fetchBackendSdkKeys();
    }
  }, [selectedMenu]);

  const fetchAgents = async () => {
    if (!accessToken || !projectId) return;
    setAgentsLoading(true);
    setAgents([]);
    setSelectedAgentId("");
    try {
      const res = await fetch(AGENT_LIST_V1_ENDPOINT, {
        method: "GET",
        headers: {
          "X-LUCERNA-USER-TOKEN": accessToken,
          "X-LUCERNA-PROJECT-ID": projectId,
        },
      });
      const data = await res.json();
      if (data.status === 1) setAgents(data.response.agents ?? []);
      else snackBarPromptError("Failed to load agents.");
    } catch {
      snackBarPromptError("Network error loading agents.");
    } finally {
      setAgentsLoading(false);
    }
  };

  const fetchBackendSdkKeys = async () => {
    if (!accessToken || !projectId) return;
    setBackendSdkKeysLoading(true);
    setBackendSdkKeys([]);
    try {
      const res = await fetch(BACKEND_SDK_KEY_LIST_ENDPOINT, {
        method: "GET",
        headers: {
          "X-LUCERNA-USER-TOKEN": accessToken,
          "X-LUCERNA-PROJECT-ID": projectId,
        },
      });
      const data = await res.json();
      if (data.status === 1) setBackendSdkKeys(data.response_body?.keys ?? []);
      else snackBarPromptError("Failed to load backend SDK keys.");
    } catch {
      snackBarPromptError("Network error loading backend SDK keys.");
    } finally {
      setBackendSdkKeysLoading(false);
    }
  };

  const handleRevokeBackendKey = async (keyId: string) => {
    if (!accessToken || !projectId) return;
    setRevokingBackendKeyId(keyId);
    try {
      const res = await fetch(BACKEND_SDK_KEY_REVOKE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LUCERNA-USER-TOKEN": accessToken,
          "X-LUCERNA-PROJECT-ID": projectId,
        },
        body: JSON.stringify({ sdk_key_id: keyId }),
      });
      const data = await res.json();
      if (data.status === 1) {
        setBackendSdkKeys((prev) =>
          prev.map((k) => (k.id === keyId ? { ...k, active: false } : k)),
        );
        snackBarPromptSuccess("Backend SDK key revoked successfully.");
      } else {
        snackBarPromptError(data.status_description || "Failed to revoke key.");
      }
    } catch {
      snackBarPromptError("Network error revoking key.");
    } finally {
      setRevokingBackendKeyId(null);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!accessToken || !projectId) return;
    setRevokingKeyId(keyId);
    try {
      const res = await fetch(AGENT_KEY_REVOKE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LUCERNA-USER-TOKEN": accessToken,
          "X-LUCERNA-PROJECT-ID": projectId,
        },
        body: JSON.stringify({ agent_key_id: keyId }),
      });
      const data = await res.json();
      if (data.status === 1) {
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            agent_keys: agent.agent_keys.map((k) =>
              k.id === keyId ? { ...k, active: false } : k,
            ),
          })),
        );
        snackBarPromptSuccess("Key revoked successfully.");
      } else {
        snackBarPromptError("Failed to revoke key.");
      }
    } catch {
      snackBarPromptError("Network error revoking key.");
    } finally {
      setRevokingKeyId(null);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(USER_FIELDS_EDIT_V1_ENDPOINT, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-LUCERNA-USER-TOKEN": accessToken,
        },
        body: JSON.stringify({
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
        }),
      });
      if (!res.ok) {
        snackBarPromptError("Failed to update profile.");
        return;
      }
      refreshAuth();
      snackBarPromptSuccess("Profile updated!");
    } catch {
      snackBarPromptError("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!accessToken) return;
    if (!newPassword) {
      snackBarPromptError("Password cannot be empty");
      return;
    }
    if (newPassword !== confirmPassword) {
      snackBarPromptError("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(PASSWORD_UPDATE_V1_ENDPOINT, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          USER_TOKEN: accessToken,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        snackBarPromptError("Failed to reset password.");
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      snackBarPromptSuccess("Password updated!");
    } catch {
      snackBarPromptError("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <Box
        sx={(theme) => ({
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 4,
            pt: 3,
          }}
        >
          <IconButton size="small" onClick={() => navigate(-1)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <ColorModeIconDropdown
            sx={{ position: "fixed", top: "1rem", right: "1rem" }}
          />
        </Box>

        <Container maxWidth="md" sx={{ display: "flex", py: 10 }}>
          {/* Sidebar */}
          <Box
            sx={{
              pr: 3,
              borderRight: "1px solid",
              borderColor: "divider",
              minWidth: 190,
            }}
          >
            <List disablePadding>
              <ListItemButton
                selected={selectedMenu === "user"}
                onClick={() => setSelectedMenu("user")}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  px: 2,
                  ...(selectedMenu === "user" && {
                    backgroundColor: "action.selected",
                  }),
                }}
              >
                <ListItemText primary="Profile" />
              </ListItemButton>
              <ListItemButton
                selected={selectedMenu === "resetPassword"}
                onClick={() => setSelectedMenu("resetPassword")}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  px: 2,
                  ...(selectedMenu === "resetPassword" && {
                    backgroundColor: "action.selected",
                  }),
                }}
              >
                <ListItemText primary="Reset Password" />
              </ListItemButton>

              <ListItemButton
                onClick={() => {
                  clearAuth();
                  navigate("/");
                }}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  px: 2,
                  mt: 2,
                  color: "error.main",
                }}
              >
                <LogoutRoundedIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "error.main" }}
                />
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 600 }}>Logout</Typography>
                  }
                />
              </ListItemButton>
            </List>
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, pl: 4 }}>
            {selectedMenu === "user" && (
              <>
                <Typography variant="h4" gutterBottom>
                  Edit Profile
                </Typography>
                <Box
                  sx={{
                    mt: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      First Name
                    </Typography>
                    <TextField
                      fullWidth
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Middle Name
                    </Typography>
                    <TextField
                      fullWidth
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Last Name
                    </Typography>
                    <TextField
                      fullWidth
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </Box>
              </>
            )}

            {selectedMenu === "resetPassword" && (
              <>
                <Typography variant="h4" gutterBottom>
                  Reset Password
                </Typography>
                <Box
                  sx={{
                    mt: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      New Password
                    </Typography>
                    <TextField
                      type="password"
                      fullWidth
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Confirm Password
                    </Typography>
                    <TextField
                      type="password"
                      fullWidth
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </Box>
                  <Button
                    variant="contained"
                    onClick={handleResetPassword}
                    disabled={isSubmitting}
                  >
                    Submit
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Container>

        <Snackbar
          open={!!snackBarSuccessValue}
          autoHideDuration={4000}
          onClose={() => snackBarPromptSuccess(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => snackBarPromptSuccess(null)}
            severity="success"
            variant="outlined"
            sx={{
              width: "100%",
              bgcolor: "background.paper",
              color: "text.primary",
              borderColor: "success.main",
              boxShadow: 2,
            }}
            iconMapping={{ success: <span>✅</span> }}
          >
            {snackBarSuccessValue}
          </Alert>
        </Snackbar>
        <Snackbar
          open={!!snackBarErrorValue}
          autoHideDuration={4000}
          onClose={() => snackBarPromptError(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => snackBarPromptError(null)}
            severity="error"
            variant="outlined"
            sx={{
              width: "100%",
              bgcolor: "background.default",
              color: "text.primary",
              borderColor: "error.main",
              boxShadow: 2,
            }}
            iconMapping={{ error: <span>❌</span> }}
          >
            {snackBarErrorValue}
          </Alert>
        </Snackbar>
      </Box>
    </AppTheme>
  );
}
