import { useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import { useAuth } from "../../AuthContext";
import StakeholderPanel from "./StakeHolderPanel";
import ContractsTable from "./ContractsTable";
import TableLogsDialog from "./TableLogsDialog";

export default function MainGrid({
  projectId,
}: {
  projectId: string | undefined;
  projectDomain: string | null | undefined;
}) {
  const { accessToken } = useAuth();

  if (!projectId || !accessToken) return null;

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <StakeholderPanel projectId={projectId} accessToken={accessToken} />
      <ContractsTable projectId={projectId} accessToken={accessToken} />
    </Box>
  );
}
