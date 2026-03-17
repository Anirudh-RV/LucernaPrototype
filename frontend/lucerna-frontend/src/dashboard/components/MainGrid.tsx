import Grid from "@mui/material/Grid";
import { Box, Typography } from "@mui/material";

import { useAuth } from "../../AuthContext";
import { useNavigate } from "react-router-dom";
import { useColorScheme } from "@mui/material/styles";
import ContractsTable from "./ContractsTable"; // adjust import path as needed

export default function MainGrid({
  projectId,
  projectDomain,
}: {
  projectId: string | undefined;
  projectDomain: string | null | undefined;
}) {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  const { mode, systemMode } = useColorScheme();
  const resolvedMode = mode === "system" ? systemMode : mode;

  if (!projectId || !accessToken) return null;

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      {/* Contracts Section */}
      <Grid container spacing={2} columns={12}>
        <Box sx={{ width: "100%", maxWidth: "100%", mb: 1 }}>
          <ContractsTable projectId={projectId} accessToken={accessToken} />
        </Box>
      </Grid>
    </Box>
  );
}
