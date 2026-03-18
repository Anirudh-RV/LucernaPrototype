import { useEffect } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import AppTheme from "../shared-ui-theme/AppTheme";
import AppAppBar from "./components/AppAppBar";

export default function PrivacyPage(props: { disableCustomTheme?: boolean }) {
  useEffect(() => {
    document.title = "Lucerna | Privacy Policy";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <AppAppBar />
      <Container maxWidth="md" sx={{ py: 8, my: 14 }}>
        <Typography variant="h3" gutterBottom>
          Privacy Policy
        </Typography>

        <Box mb={3}>
          <Typography variant="body1">
            Lucerna ("we", "us", or "our") is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, and
            protect the personal information you provide when using our
            AI-powered contract management platform, including its voice agent
            features.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          1. Information We Collect
        </Typography>
        <Box mb={3}>
          <Typography variant="body1" component="div">
            We collect the following categories of information:
            <ul>
              <li>
                <strong>Account information:</strong> your name, email address,
                and payment details when you register.
              </li>
              <li>
                <strong>Organization data:</strong> contract tables, column
                definitions, and contract row data you create within your
                project.
              </li>
              <li>
                <strong>Stakeholder data:</strong> names, email addresses, and
                phone numbers of stakeholders you register for voice
                authentication purposes.
              </li>
              <li>
                <strong>Call data:</strong> records of inbound and outbound
                agent calls, including authentication events, questions asked,
                and contract updates made during calls.
              </li>
              <li>
                <strong>Usage data:</strong> platform interactions, API usage,
                and session logs used to maintain and improve the service.
              </li>
            </ul>
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          2. How We Use Your Information
        </Typography>
        <Box mb={3}>
          <Typography variant="body1" component="div">
            We use your data to:
            <ul>
              <li>Provide and operate the Lucerna platform and voice agent</li>
              <li>
                Authenticate stakeholders via email OTP during agent calls
              </li>
              <li>
                Enable the AI voice agent to retrieve and update contract data
                on behalf of authenticated callers
              </li>
              <li>Maintain, secure, and improve the platform</li>
              <li>Send important account and service-related notices</li>
              <li>Comply with applicable legal and regulatory requirements</li>
            </ul>
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          3. Stakeholder Data
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            Stakeholder contact details (name, email, phone) are entered by your
            organization and used solely for identity verification during agent
            calls. Lucerna does not use stakeholder data for marketing or share
            it with third parties outside of what is necessary to operate the
            email OTP service. Your organization is responsible for obtaining
            any necessary consent from stakeholders before registering their
            details on the platform.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          4. Data Sharing
        </Typography>
        <Box mb={3}>
          <Typography variant="body1" component="div">
            We do not sell your data or your stakeholders' data. We may share
            information with:
            <ul>
              <li>
                Service providers (such as email delivery and telephony
                partners) under strict confidentiality agreements
              </li>
              <li>Regulatory authorities where legally required</li>
              <li>Law enforcement when requested with valid legal authority</li>
            </ul>
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          5. Data Retention
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            We retain your account and contract data for as long as your account
            is active or as required to fulfill legal obligations. Call logs and
            authentication records are retained for 90 days by default.
            Organizations on Enterprise plans may request custom retention
            policies.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          6. Security
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            We implement technical and organizational measures to protect your
            data, including encrypted storage, OTP-based authentication, and
            isolated per-organization database schemas. No system is 100%
            secure, and we encourage users to adopt strong account security
            practices.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          7. International Data Transfers
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            Your data may be processed on servers located outside your country.
            We take appropriate safeguards to ensure such transfers comply with
            applicable data protection laws. Enterprise customers may request
            data residency options.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          8. Your Rights
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            Depending on your jurisdiction, you may have rights to access,
            correct, export, or delete your personal data. To make a request,
            contact us at <strong>privacy@lucerna.ai</strong>. We will respond
            within 30 days.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          9. Updates to This Policy
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            We may update this Privacy Policy from time to time. If changes are
            material, we will notify you via the platform or email before they
            take effect.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          10. Contact Us
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            For questions about this policy, contact us at:
          </Typography>
          <Typography variant="body1">
            <strong>Email:</strong> privacy@lucerna.ai
            <br />
            <strong>Address:</strong> [To be registered]
          </Typography>
        </Box>
      </Container>
    </AppTheme>
  );
}
