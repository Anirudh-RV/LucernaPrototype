import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { Link } from "react-router-dom";

const tiers = [
  {
    title: "Starter",
    price: "0",
    description: [
      "1 project",
      "Up to 3 stakeholders",
      "Up to 500 contract rows",
      "100 agent calls per month",
      "Email OTP authentication",
      "Inbound calls only",
    ],
    buttonText: "Sign up for free",
    buttonVariant: "outlined",
    buttonColor: "secondary",
    isFree: true,
  },
  {
    title: "Business",
    subheader: "Most popular",
    price: "149",
    description: [
      "Up to 10 projects",
      "Unlimited stakeholders",
      "Unlimited contract rows",
      "2,000 agent calls per month",
      "Inbound & outbound calls",
      "Row-level access control",
      "Human escalation logging",
      "Priority email support",
    ],
    buttonText: "Start now",
    buttonVariant: "contained",
    buttonColor: "secondary",
    comingSoon: true,
    highlight: true,
  },
  {
    title: "Enterprise",
    price: "Custom",
    description: [
      "Unlimited projects",
      "Unlimited stakeholders & rows",
      "Unlimited agent calls",
      "Custom voice & language settings",
      "SSO & advanced access controls",
      "Dedicated onboarding",
      "SLA & uptime guarantees",
      "Custom integrations & APIs",
    ],
    buttonText: "Talk to sales",
    buttonVariant: "outlined",
    buttonColor: "secondary",
    comingSoon: false,
    isEnterprise: true,
  },
];

export default function Pricing() {
  return (
    <Container
      id="pricing"
      sx={{
        pt: { xs: 4, sm: 12 },
        pb: { xs: 8, sm: 16 },
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
        <Typography
          component="h2"
          variant="h4"
          gutterBottom
          sx={{ color: "text.primary" }}
        >
          Simple, transparent pricing
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Start for free and scale as your contracting operations grow. No
          per-call surprises on the Starter plan.
        </Typography>
      </Box>

      <Grid
        container
        spacing={3}
        sx={{ alignItems: "center", justifyContent: "center", width: "100%" }}
      >
        {tiers.map((tier) => (
          <Grid
            size={{ xs: 12, sm: tier.isEnterprise ? 12 : 6, md: 4 }}
            key={tier.title}
          >
            <Card
              sx={[
                {
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  width: "100%",
                  minHeight: 560,
                },
                !!tier.highlight &&
                  ((theme) => ({
                    border: "none",
                    background:
                      "radial-gradient(circle at 50% 0%, hsl(220, 20%, 35%), hsl(220, 30%, 6%))",
                    boxShadow: `0 8px 12px hsla(220, 20%, 42%, 0.2)`,
                    ...theme.applyStyles("dark", {
                      background:
                        "radial-gradient(circle at 50% 0%, hsl(220, 20%, 20%), hsl(220, 30%, 16%))",
                      boxShadow: `0 8px 12px hsla(0, 0%, 0%, 0.8)`,
                    }),
                  })),
              ]}
            >
              <CardContent>
                <Box
                  sx={[
                    {
                      mb: 1,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                    },
                    tier.highlight ? { color: "grey.100" } : { color: "" },
                  ]}
                >
                  <Typography component="h3" variant="h6">
                    {tier.title}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {tier.subheader && (
                      <Chip
                        icon={<AutoAwesomeIcon />}
                        label={tier.subheader}
                        size="small"
                        color="primary"
                      />
                    )}
                    {tier.comingSoon && (
                      <Chip label="Coming Soon" color="warning" size="small" />
                    )}
                  </Box>
                </Box>

                <Box
                  sx={[
                    { display: "flex", alignItems: "baseline" },
                    tier.highlight ? { color: "grey.50" } : {},
                  ]}
                >
                  {tier.isEnterprise ? (
                    <Typography component="h3" variant="h3" fontWeight={700}>
                      Custom
                    </Typography>
                  ) : (
                    <>
                      <Typography component="h3" variant="h2" fontWeight={700}>
                        ${tier.price}
                      </Typography>
                      <Typography component="h3" variant="h6">
                        &nbsp;/ month
                      </Typography>
                    </>
                  )}
                </Box>

                <Divider sx={{ my: 2, opacity: 0.8, borderColor: "divider" }} />

                {tier.description.map((line) => (
                  <Box
                    key={line}
                    sx={{
                      py: 0.75,
                      display: "flex",
                      gap: 1.5,
                      alignItems: "center",
                    }}
                  >
                    <CheckCircleRoundedIcon
                      sx={[
                        { width: 20 },
                        tier.highlight
                          ? { color: "primary.light" }
                          : { color: "primary.main" },
                      ]}
                    />
                    <Typography
                      variant="subtitle2"
                      component="span"
                      sx={[tier.highlight ? { color: "grey.50" } : {}]}
                    >
                      {line}
                    </Typography>
                  </Box>
                ))}
              </CardContent>

              <CardActions sx={{ mt: "auto" }}>
                <Button
                  fullWidth
                  variant={tier.buttonVariant as "outlined" | "contained"}
                  color={tier.buttonColor as "primary" | "secondary"}
                  disabled={!!tier.comingSoon}
                  component={tier.isFree ? Link : "button"}
                  to={tier.isFree ? "/signup" : undefined}
                  onClick={
                    tier.isEnterprise
                      ? () => (window.location.href = "mailto:sales@lucerna.ai")
                      : undefined
                  }
                >
                  {tier.buttonText}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
