import { Box, Card, Container, Stack, Typography } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import TableChartIcon from "@mui/icons-material/TableChart";
import LockPersonIcon from "@mui/icons-material/LockPerson";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

const items = [
  {
    icon: <TableChartIcon fontSize="large" />,
    title: "Custom contract schema",
    description:
      "Define your contract table with any columns you need — text, numbers, dates, currencies, booleans, and auto-generated contract IDs. No code, no migrations.",
  },
  {
    icon: <LockPersonIcon fontSize="large" />,
    title: "Row-level access control",
    description:
      "Grant each stakeholder access to all contracts or lock them to specific rows. Access is enforced on every call — no configuration errors possible.",
  },
  {
    icon: <MarkEmailReadIcon fontSize="large" />,
    title: "Email OTP authentication",
    description:
      "Before sharing any contract data, the agent verifies the caller's identity with a one-time code sent to their registered email. Secure by default.",
  },
  {
    icon: <PhoneInTalkIcon fontSize="large" />,
    title: "Inbound & outbound calls",
    description:
      "Stakeholders can call in for updates, or the agent can proactively call stakeholders to request information — both flows are supported out of the box.",
  },
  {
    icon: <EditNoteIcon fontSize="large" />,
    title: "Live contract updates",
    description:
      "Stakeholders can update editable contract fields verbally during the call. The agent confirms changes before writing them and logs every update.",
  },
  {
    icon: <SupportAgentIcon fontSize="large" />,
    title: "Graceful human escalation",
    description:
      "When the agent can't answer something, it tells the caller a human will call them back — and logs the escalation so nothing falls through the cracks.",
  },
];

export default function Highlights() {
  const { mode, systemMode } = useColorScheme();
  const resolvedMode = mode === "system" ? systemMode : mode;
  const isDark = resolvedMode === "dark";

  return (
    <Box
      id="highlights"
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
        color: isDark ? "grey.100" : "grey.900",
        bgcolor: "background.default",
      }}
    >
      <Container
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 3, sm: 6 },
        }}
      >
        <Box
          sx={{
            width: { sm: "100%", md: "60%" },
            textAlign: { sm: "left", md: "center" },
          }}
        >
          <Typography component="h2" variant="h4" gutterBottom>
            Everything you need, nothing you don't
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: isDark ? "grey.400" : "grey.600" }}
          >
            Lucerna is purpose-built for enterprise contract management — not a
            general-purpose tool bolted onto a voice API.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: 2,
            width: "100%",
          }}
        >
          {items.map((item, index) => (
            <Box key={index}>
              <Stack
                direction="column"
                component={Card}
                spacing={1}
                useFlexGap
                sx={{
                  color: "inherit",
                  p: 3,
                  height: "100%",
                  borderColor: isDark ? "hsla(220, 25%, 25%, 0.3)" : "grey.200",
                  backgroundColor: isDark ? "grey.800" : "grey.100",
                }}
              >
                <Box
                  sx={{
                    opacity: 0.6,
                    color: isDark ? "grey.300" : "primary.main",
                  }}
                >
                  {item.icon}
                </Box>
                <div>
                  <Typography gutterBottom sx={{ fontWeight: "medium" }}>
                    {item.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: isDark ? "grey.400" : "grey.700" }}
                  >
                    {item.description}
                  </Typography>
                </div>
              </Stack>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
