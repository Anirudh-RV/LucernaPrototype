import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
      "Define your contract table with any columns your business needs — no code or migrations required.",
  },
  {
    icon: <LockPersonIcon fontSize="large" />,
    title: "Row-level access control",
    description:
      "Grant each stakeholder access to all contracts or restrict them to specific rows only.",
  },
  {
    icon: <MarkEmailReadIcon fontSize="large" />,
    title: "Email OTP authentication",
    description:
      "Every caller is verified with a one-time code before any contract data is shared.",
  },
  {
    icon: <PhoneInTalkIcon fontSize="large" />,
    title: "Inbound & outbound calls",
    description:
      "Stakeholders can call in for updates, or the agent proactively calls them to collect information.",
  },
  {
    icon: <EditNoteIcon fontSize="large" />,
    title: "Live contract updates",
    description:
      "Callers can update editable contract fields verbally — the agent confirms before writing any change.",
  },
  {
    icon: <SupportAgentIcon fontSize="large" />,
    title: "Graceful human escalation",
    description:
      "When the agent can't help, it logs the escalation and tells the caller a human will follow up.",
  },
];

export default function Content() {
  return (
    <Stack
      sx={{
        flexDirection: "column",
        alignSelf: "center",
        gap: 4,
        maxWidth: 450,
      }}
    >
      <Box sx={{ display: { xs: "none", md: "flex" } }} />
      {items.map((item, index) => (
        <Stack key={index} direction="row" sx={{ gap: 2 }}>
          {item.icon}
          <div>
            <Typography gutterBottom sx={{ fontWeight: "medium" }}>
              {item.title}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {item.description}
            </Typography>
          </div>
        </Stack>
      ))}
    </Stack>
  );
}
