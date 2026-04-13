import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import FormLabel from "@mui/material/FormLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import { styled } from "@mui/material/styles";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import Link from "@mui/material/Link";
import CircularProgress from "@mui/material/CircularProgress";
import { readJsonResponse } from "../../api/readJsonResponse";
import { useAuth } from "../../AuthContext";
import { STAKEHOLDER_LOGIN_V1_ENDPOINT } from "../../constants";

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

function describeStakeholderLoginError(status: string | undefined): string {
  switch (status) {
    case "login_failed":
      return "We could not find an account with that email or phone.";
    case "invalid_or_expired_otp":
      return "That code is invalid or has expired. Request a new code.";
    case "missing_otp_delivery_email":
      return "When using phone, enter the notification email on your access record so we know where to send the code.";
    case "otp_delivery_email_not_on_file":
      return "That email does not match your stakeholder notification email. Check with your administrator.";
    case "otp_email_failed":
      return "We could not send the email. Try again in a moment.";
    case "missing_identifier":
      return "Enter your email or phone number.";
    case "invalid_json":
      return "Something went wrong. Please refresh and try again.";
    default:
      return status || "Something went wrong. Please try again.";
  }
}

export default function StakeholderSignInCard() {
  const [step, setStep] = React.useState<"identifier" | "otp">("identifier");
  const [identifier, setIdentifier] = React.useState("");
  const [otpDeliveryEmail, setOtpDeliveryEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [identifierError, setIdentifierError] = React.useState(false);
  const [identifierErrorMessage, setIdentifierErrorMessage] =
    React.useState("");
  const [deliveryError, setDeliveryError] = React.useState(false);
  const [deliveryErrorMessage, setDeliveryErrorMessage] = React.useState("");
  const [otpError, setOtpError] = React.useState(false);
  const [otpErrorMessage, setOtpErrorMessage] = React.useState("");
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const resetFlow = () => {
    setStep("identifier");
    setOtp("");
    setInfoMessage(null);
    setOtpError(false);
    setOtpErrorMessage("");
    setIdentifierError(false);
    setIdentifierErrorMessage("");
    setDeliveryError(false);
    setDeliveryErrorMessage("");
    setOtpDeliveryEmail("");
  };

  const validateIdentifier = (): boolean => {
    const v = identifier.trim();
    if (!v) {
      setIdentifierError(true);
      setIdentifierErrorMessage("Enter your email or phone number.");
      return false;
    }
    setIdentifierError(false);
    setIdentifierErrorMessage("");
    if (!v.includes("@")) {
      const d = otpDeliveryEmail.trim();
      if (!d || !/\S+@\S+\.\S+/.test(d)) {
        setDeliveryError(true);
        setDeliveryErrorMessage(
          "Enter the notification email on file for your stakeholder access.",
        );
        return false;
      }
      setDeliveryError(false);
      setDeliveryErrorMessage("");
    } else {
      setDeliveryError(false);
      setDeliveryErrorMessage("");
    }
    return true;
  };

  const validateOtp = (): boolean => {
    const digits = otp.replace(/\D/g, "");
    if (digits.length !== 6) {
      setOtpError(true);
      setOtpErrorMessage("Enter the 6-digit code from your email.");
      return false;
    }
    setOtpError(false);
    setOtpErrorMessage("");
    return true;
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateIdentifier()) return;
    setIsSubmitting(true);
    setInfoMessage(null);
    setIdentifierError(false);
    setIdentifierErrorMessage("");
    setDeliveryError(false);
    setDeliveryErrorMessage("");

    const id = identifier.trim();
    const body: Record<string, string> = { identifier: id };
    if (!id.includes("@")) {
      body.otp_delivery_email = otpDeliveryEmail.trim();
    }

    try {
      const res = await fetch(STAKEHOLDER_LOGIN_V1_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await readJsonResponse(res);

      if (res.ok && result.status === 1 && result.status_description === "otp_sent") {
        setStep("otp");
        const resp = result.response;
        const detail =
          resp &&
          typeof resp === "object" &&
          "detail" in resp &&
          typeof (resp as { detail?: unknown }).detail === "string"
            ? (resp as { detail: string }).detail
            : null;
        setInfoMessage(detail ?? "Check your email for a verification code.");
        setOtp("");
        return;
      }

      const desc =
        typeof result.status_description === "string"
          ? result.status_description
          : undefined;
      if (
        desc === "missing_otp_delivery_email" ||
        desc === "otp_delivery_email_not_on_file"
      ) {
        setDeliveryError(true);
        setDeliveryErrorMessage(describeStakeholderLoginError(desc));
      } else {
        setIdentifierError(true);
        setIdentifierErrorMessage(describeStakeholderLoginError(desc));
      }
    } catch (err) {
      setIdentifierError(true);
      setIdentifierErrorMessage(
        err instanceof Error ? err.message : "Network error. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyAndSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOtp()) return;
    setIsSubmitting(true);
    setOtpError(false);
    setOtpErrorMessage("");

    const digits = otp.replace(/\D/g, "");
    try {
      const res = await fetch(STAKEHOLDER_LOGIN_V1_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          otp: digits,
        }),
      });
      const result = await readJsonResponse(res);

      const loginResp = result.response;
      const jwtToken =
        loginResp &&
        typeof loginResp === "object" &&
        "jwt_token" in loginResp &&
        typeof (loginResp as { jwt_token?: unknown }).jwt_token === "string"
          ? (loginResp as { jwt_token: string }).jwt_token
          : undefined;
      const userPayload =
        loginResp &&
        typeof loginResp === "object" &&
        "user" in loginResp &&
        loginResp.user &&
        typeof loginResp.user === "object"
          ? (loginResp.user as Parameters<typeof setAuth>[0])
          : undefined;

      if (res.ok && result.status === 1 && jwtToken && userPayload) {
        setAuth(userPayload, jwtToken);
        navigate("/dashboard");
        return;
      }

      setOtpError(true);
      setOtpErrorMessage(
        describeStakeholderLoginError(
          typeof result.status_description === "string"
            ? result.status_description
            : undefined,
        ),
      );
    } catch (err) {
      setOtpError(true);
      setOtpErrorMessage(
        err instanceof Error ? err.message : "Network error. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="outlined">
      <Typography
        component="h1"
        variant="h4"
        sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
      >
        Stakeholder sign in
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Sign-in uses a one-time email code only (nothing extra is stored on your
        stakeholder record). Use the notification email from contract access, or
        sign in with that same email as your identifier.
      </Typography>

      {step === "identifier" ? (
        <Box
          component="form"
          onSubmit={sendCode}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Chip size="small" label="Step 1 of 2 — request OTP" variant="outlined" />
          <FormLabel htmlFor="stakeholder-identifier">
            Email or phone number
          </FormLabel>
          <TextField
            error={identifierError}
            helperText={identifierErrorMessage}
            id="stakeholder-identifier"
            name="identifier"
            placeholder="you@company.com or +1 555 0100"
            autoComplete="username"
            required
            fullWidth
            variant="outlined"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setDeliveryError(false);
              setDeliveryErrorMessage("");
            }}
            disabled={isSubmitting}
          />
          {!identifier.trim().includes("@") && identifier.trim().length > 0 ? (
            <>
              <FormLabel htmlFor="stakeholder-otp-delivery-email">
                Notification email (where to send the code)
              </FormLabel>
              <TextField
                error={deliveryError}
                helperText={
                  deliveryErrorMessage ||
                  "Must match an email configured under contract access for this phone."
                }
                id="stakeholder-otp-delivery-email"
                name="otp_delivery_email"
                type="email"
                placeholder="same-as-contract-access@company.com"
                autoComplete="email"
                fullWidth
                variant="outlined"
                value={otpDeliveryEmail}
                onChange={(e) => setOtpDeliveryEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </>
          ) : null}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isSubmitting}
            sx={{ color: isSubmitting ? "common.white" : undefined }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="primary" />
            ) : (
              "Email me a sign-in code (OTP)"
            )}
          </Button>
        </Box>
      ) : (
        <Box
          component="form"
          onSubmit={verifyAndSignIn}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Chip size="small" label="Step 2 of 2 — enter OTP" variant="outlined" />
          {infoMessage ? <Alert severity="info">{infoMessage}</Alert> : null}
          <Typography variant="body2" color="text.secondary">
            Signing in as:{" "}
            <strong>{identifier.trim() || "—"}</strong>
          </Typography>
          <FormLabel htmlFor="stakeholder-otp">
            One-time code (OTP) from email
          </FormLabel>
          <TextField
            error={otpError}
            helperText={otpErrorMessage}
            id="stakeholder-otp"
            name="otp"
            placeholder="000000"
            inputProps={{
              inputMode: "numeric",
              maxLength: 6,
              autoComplete: "one-time-code",
            }}
            required
            fullWidth
            variant="outlined"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isSubmitting}
            sx={{ color: isSubmitting ? "common.white" : undefined }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="primary" />
            ) : (
              "Verify and sign in"
            )}
          </Button>
          <Button
            type="button"
            variant="text"
            onClick={resetFlow}
            disabled={isSubmitting}
          >
            Use a different email or phone
          </Button>
        </Box>
      )}

      <Typography sx={{ textAlign: "center" }} variant="body2">
        <Link component={RouterLink} to="/login" underline="hover">
          Admin sign in (email and password)
        </Link>
      </Typography>
    </Card>
  );
}
