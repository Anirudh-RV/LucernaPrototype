import { Box } from "@mui/material";
import { useAuth } from "../../AuthContext";
import StakeholderPanel from "./StakeHolderPanel";
import ContractsTable from "./ContractsTable";

export default function MainGrid({
  projectId,
  projectDomain,
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
