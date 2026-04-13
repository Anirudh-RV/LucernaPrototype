import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import FormLabel from "@mui/material/FormLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { useNavigate, Link } from "react-router-dom";
import { readJsonResponse } from "../../api/readJsonResponse";
import { useAuth } from "../../AuthContext";
import { LOGIN_V1_ENDPOINT } from "../../constants";
import ForgotPassword from "./ForgotPassword";
import CircularProgress from "@mui/material/CircularProgress";

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

export default function SignInCard() {
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState("");
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const openForgotPasswordDialog = () => setForgotPasswordOpen(true);
  const closeForgotPasswordDialog = () => setForgotPasswordOpen(false);

  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const validateInputs = () => {
    const email = document.getElementById("email") as HTMLInputElement;
    const password = document.getElementById("password") as HTMLInputElement;

    let isValid = true;

    if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email address.");
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (!password.value || password.value.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters long.");
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateInputs()) return;

    setIsSubmitting(true);

    const data = new FormData(event.currentTarget);

    const payload = {
      email: data.get("email") as string,
      password: data.get("password") as string,
    };

    try {
      const res = await fetch(LOGIN_V1_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      if (res.ok && result.status === 1 && userPayload && jwtToken) {
        // Successful login
        setAuth(userPayload, jwtToken);
        navigate("/dashboard");
      } else {
        setPasswordError(true);
        setPasswordErrorMessage(
          result.status_description === "login_failed"
            ? "Incorrect email or password"
            : typeof result.status_description === "string"
              ? result.status_description
              : "Login failed. Please try again.",
        );
      }
    } catch (err) {
      console.error("Login request failed", err);
      setPasswordError(true);
      setPasswordErrorMessage(
        err instanceof Error ? err.message : "Network error. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="outlined">
      <Box sx={{ display: { xs: "flex", md: "none" } }}></Box>
      <Typography
        component="h1"
        variant="h4"
        sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
      >
        Log in
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <FormLabel htmlFor="email">Email</FormLabel>
        <TextField
          error={emailError}
          helperText={emailErrorMessage}
          id="email"
          type="email"
          name="email"
          placeholder="your@email.com"
          autoComplete="email"
          required
          fullWidth
          variant="outlined"
        />

        <FormLabel htmlFor="password">Password</FormLabel>
        <TextField
          error={passwordError}
          helperText={passwordErrorMessage}
          name="password"
          placeholder="••••••"
          type="password"
          id="password"
          autoComplete="current-password"
          required
          fullWidth
          variant="outlined"
        />

        <Typography
          variant="body2"
          sx={{
            textAlign: "right",
            cursor: "pointer",
            color: "primary.main",
          }}
          onClick={openForgotPasswordDialog}
        >
          Forgot password?
        </Typography>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isSubmitting}
          sx={{
            color: isSubmitting ? "common.white" : undefined,
          }}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="primary" />
          ) : (
            "Log in"
          )}
        </Button>

        <Typography sx={{ textAlign: "center" }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ alignSelf: "center" }}>
            Sign up
          </Link>
        </Typography>
      </Box>

      <ForgotPassword
        open={forgotPasswordOpen}
        handleClose={closeForgotPasswordDialog}
      />
    </Card>
  );
}
