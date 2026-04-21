import { useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Container,
  Chip,
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import LogoutIcon from "@mui/icons-material/Logout";
import AppTheme from "../shared-ui-theme/AppTheme";
import ColorModeIconDropdown from "../shared-ui-theme/ColorModeIconDropdown";
import { useStakeholderAuth } from "../StakeholderAuthContext";
import PortalContractsTable from "./components/PortalContractsTable";

export default function StakeholderPortal(props: {
  disableCustomTheme?: boolean;
}) {
  const { stakeholder, stakeholderToken, clearStakeholderAuth } =
    useStakeholderAuth();

  useEffect(() => {
    document.title = "Stakeholder Portal — Lucerna";
  }, []);

  const handleLogout = () => {
    clearStakeholderAuth();
  };

  if (!stakeholder || !stakeholderToken) return null;

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />

      {/* Top Bar */}
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{ letterSpacing: -0.5 }}
            >
              Lucerna
            </Typography>
            <Chip
              label="Stakeholder Portal"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ height: 24, fontSize: 11 }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {stakeholder.name}
            </Typography>
            <ColorModeIconDropdown />
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Log out
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={600}>
            Your Contracts
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Below is the contract data shared with you by your organization.
          </Typography>
        </Box>

        <PortalContractsTable stakeholderToken={stakeholderToken} />
      </Container>
    </AppTheme>
  );
}
