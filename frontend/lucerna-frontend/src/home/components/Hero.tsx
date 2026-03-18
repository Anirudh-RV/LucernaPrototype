import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";
import { useColorScheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import PhoneInTalkIcon from "@mui/icons-material/PhoneInTalk";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const StyledBox = styled("div")(({ theme }) => ({
  alignSelf: "center",
  width: "100%",
  marginTop: theme.spacing(8),
  borderRadius: (theme.vars || theme).shape.borderRadius,
  outline: "6px solid",
  outlineColor: "hsla(220, 25%, 80%, 0.2)",
  border: "1px solid",
  borderColor: (theme.vars || theme).palette.grey[200],
  boxShadow: "0 0 12px 8px hsla(220, 25%, 80%, 0.2)",
  overflow: "hidden",
  [theme.breakpoints.up("sm")]: {
    marginTop: theme.spacing(10),
  },
  ...(theme.applyStyles?.("dark", {
    boxShadow: "0 0 24px 12px hsla(210, 100%, 25%, 0.2)",
    outlineColor: "hsla(220, 20%, 42%, 0.1)",
    borderColor: (theme.vars || theme).palette.grey[700],
  }) || {}),
}));

const proofPoints = [
  "No code required",
  "Live in under 10 minutes",
  "AI handles stakeholder calls",
];

export default function Hero() {
  const { mode, systemMode } = useColorScheme();
  const resolvedMode = mode === "system" ? systemMode : mode;
  const navigate = useNavigate();

  return (
    <Box
      id="hero"
      sx={(theme) => ({
        width: "100%",
        backgroundRepeat: "no-repeat",
        backgroundImage:
          "radial-gradient(ellipse 80% 25% at 50% 0%, hsl(210, 100%, 90%), transparent)",
        ...theme.applyStyles?.("dark", {
          backgroundImage:
            "radial-gradient(ellipse 80% 25% at 50% 0%, hsl(210, 100%, 16%), transparent)",
        }),
      })}
    >
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: { xs: 14, sm: 20 },
          pb: { xs: 8, sm: 12 },
        }}
      >
        <Stack
          spacing={3}
          useFlexGap
          sx={{ alignItems: "center", width: { xs: "100%", sm: "75%" } }}
        >
          {/* Eyebrow label */}
          <Chip
            icon={<PhoneInTalkIcon sx={{ fontSize: "14px !important" }} />}
            label="AI-Powered Contract Voice Agent"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, letterSpacing: 0.3 }}
          />

          <Typography
            variant="h1"
            sx={{
              textAlign: "center",
              fontSize: "clamp(2.5rem, 8vw, 3.75rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Your contracts,{" "}
            <Typography
              component="span"
              variant="h1"
              sx={{
                fontSize: "inherit",
                fontWeight: "inherit",
                color: "primary.main",
              }}
            >
              always answered.
            </Typography>
          </Typography>

          <Typography
            sx={{
              textAlign: "center",
              color: "text.secondary",
              width: { sm: "100%", md: "75%" },
              fontSize: "1.125rem",
              lineHeight: 1.7,
            }}
          >
            Lucerna lets enterprises build a custom contract database and deploy
            an AI voice agent that authenticates stakeholders, answers contract
            questions, and logs updates — all over a phone call, with zero human
            involvement.
          </Typography>

          {/* Proof points */}
          <Stack
            direction="row"
            spacing={2}
            flexWrap="wrap"
            justifyContent="center"
            useFlexGap
          >
            {proofPoints.map((point) => (
              <Stack
                key={point}
                direction="row"
                spacing={0.75}
                alignItems="center"
              >
                <CheckCircleOutlineIcon
                  sx={{ fontSize: 16, color: "success.main" }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight={500}
                >
                  {point}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap>
            <Button
              color="primary"
              variant="contained"
              size="large"
              onClick={() => navigate("/signup")}
              sx={{
                fontSize: "1rem",
                px: 4,
                py: 1.5,
                boxShadow: "0 0 12px 4px hsla(210, 100%, 70%, 0.7) !important",
                "&:focus-visible": {
                  boxShadow:
                    "0 0 24px 8px hsla(210, 100%, 70%, 0.9) !important",
                },
              }}
            >
              Get started free
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              sx={{ fontSize: "1rem", px: 4, py: 1.5 }}
            >
              See how it works
            </Button>
          </Stack>
        </Stack>

        <StyledBox id="image">
          <img
            src={
              resolvedMode === "dark"
                ? "/images/dark-dashboard.png"
                : "/images/light-dashboard.png"
            }
            alt="Lucerna contract dashboard"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </StyledBox>
      </Container>
    </Box>
  );
}
