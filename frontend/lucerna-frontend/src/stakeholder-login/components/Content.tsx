import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EmailIcon from "@mui/icons-material/Email";
import SecurityIcon from "@mui/icons-material/Security";

const items = [
  {
    icon: <VerifiedUserIcon fontSize="large" />,
    title: "Secure OTP verification",
    description:
      "A one-time code is sent to your registered email — no passwords to remember.",
  },
  {
    icon: <VisibilityIcon fontSize="large" />,
    title: "View your contracts",
    description:
      "Access the specific contract data your organization has shared with you.",
  },
  {
    icon: <EmailIcon fontSize="large" />,
    title: "Email-based authentication",
    description:
      "Your verification code is delivered to the email address on file for your account.",
  },
  {
    icon: <SecurityIcon fontSize="large" />,
    title: "Role-based access",
    description:
      "You only see the rows and columns your organization has granted you access to.",
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
