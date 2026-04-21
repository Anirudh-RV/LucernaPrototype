import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import FormLabel from "@mui/material/FormLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useStakeholderAuth } from "../../StakeholderAuthContext";
import CircularProgress from "@mui/material/CircularProgress";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import { STAKEHOLDER_LOGIN_ENDPOINT } from "../../constants";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  [theme.breakpoints.up("sm")]: {
    width: "450px",
  },
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

export default function StakeholderSignInCard() {
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [phase, setPhase] = React.useState<"email" | "otp">("email");
  const [emailHint, setEmailHint] = React.useState("");
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const navigate = useNavigate();
  const { setStakeholderAuth } = useStakeholderAuth();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(STAKEHOLDER_LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (res.ok) {
        setEmailHint(data.email_hint || "");
        setPhase("otp");
      } else {
        setError(data.error || "Failed to send OTP. Please try again.");
      }
    } catch (err) {
      console.error("Network error", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(STAKEHOLDER_LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setStakeholderAuth(data.stakeholder, data.token);
        navigate("/portal");
      } else {
        setError(data.error || "Verification failed. Please try again.");
      }
    } catch (err) {
      console.error("Network error", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    setOtp("");
    setError("");
    setPhase("email");
  };

  return (
    <Card variant="outlined">
      <Box sx={{ display: { xs: "flex", md: "none" } }}></Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {phase === "email" ? (
          <EmailIcon color="primary" /> // Added from @mui/icons-material
        ) : (
          <LockIcon color="primary" />
        )}
        <Typography
          component="h1"
          variant="h4"
          sx={{ fontSize: "clamp(1.8rem, 8vw, 2rem)" }}
        >
          {phase === "email" ? "Stakeholder Login" : "Enter Verification Code"}
        </Typography>
      </Box>

      {phase === "otp" && emailHint && (
        <Alert severity="info" sx={{ py: 0.5 }}>
          A 6-digit code was sent to <strong>{emailHint}</strong>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {error}
        </Alert>
      )}

      {/* Phase 1: Email Input */}
      {phase === "email" && (
        <Box
          component="form"
          onSubmit={handleRequestOTP}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <FormLabel htmlFor="stakeholder-email">Email Address</FormLabel>
          <TextField
            id="stakeholder-email"
            type="email"
            name="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            fullWidth
            variant="outlined"
            autoFocus
          />

          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Enter the email address registered with your organization. We'll send
            you a 6-digit verification code.
          </Typography>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Send Verification Code"
            )}
          </Button>

          <Typography sx={{ textAlign: "center" }}>
            <a href="/login" style={{ color: "inherit" }}>
              Admin login →
            </a>
          </Typography>
        </Box>
      )}

      {/* Phase 2: OTP input */}
      {phase === "otp" && (
        <Box
          component="form"
          onSubmit={handleVerifyOTP}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <FormLabel htmlFor="stakeholder-otp">Verification Code</FormLabel>
          <TextField
            id="stakeholder-otp"
            type="text"
            name="otp"
            placeholder="000000"
            value={otp}
            onChange={(e) => {
              // Only allow digits, max 6
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setOtp(v);
            }}
            required
            fullWidth
            variant="outlined"
            autoFocus
            inputProps={{
              maxLength: 6,
              style: {
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 12,
                textAlign: "center",
                fontFamily: "monospace",
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Verify & Log In"
            )}
          </Button>

          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              cursor: "pointer",
              color: "primary.main",
            }}
            onClick={handleResend}
          >
            Didn't receive the code? Try again
          </Typography>
        </Box>
      )}
    </Card>
  );
}
