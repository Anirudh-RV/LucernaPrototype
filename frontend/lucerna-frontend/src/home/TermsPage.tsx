import { useEffect } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import AppTheme from "../shared-ui-theme/AppTheme";
import AppAppBar from "./components/AppAppBar";

export default function TermsPage(props: { disableCustomTheme?: boolean }) {
  useEffect(() => {
    document.title = "Lucerna | Terms and Conditions";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <AppAppBar />
      <Container maxWidth="md" sx={{ py: 8, my: 14 }}>
        <Typography variant="h3" gutterBottom>
          Terms and Conditions
        </Typography>

        <Box mb={3}>
          <Typography variant="body1">
            Welcome to Lucerna. These Terms and Conditions ("Terms") govern your
            use of our website, platform, and AI voice agent services
            (collectively, the "Platform"). By accessing or using the Platform,
            you agree to be bound by these Terms. If you do not agree, do not
            use the Platform.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          1. Eligibility and Use
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            You must be at least 18 years old and authorized to act on behalf of
            your organization to use the Platform. You agree to use Lucerna only
            for lawful contract management purposes and in compliance with all
            applicable laws in your jurisdiction.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          2. Account Responsibility
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account. You agree to notify us immediately at{" "}
            <strong>security@lucerna.ai</strong> of any unauthorized access or
            security breach.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          3. Stakeholder Data and Consent
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            You are responsible for ensuring that any stakeholder contact
            information (name, email address, phone number) you enter into
            Lucerna has been collected lawfully and that the individuals
            concerned have been informed their details may be used for identity
            verification via automated phone calls and email. Lucerna processes
            this data on your behalf as a data processor.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          4. AI Voice Agent Usage
        </Typography>
        <Box mb={3}>
          <Typography variant="body1" component="div">
            The Lucerna AI voice agent operates based on the contract data,
            stakeholder access rules, and configurations you set up. You
            acknowledge that:
            <ul>
              <li>
                The agent will only share and update contract data in accordance
                with your configured access rules.
              </li>
              <li>
                You are responsible for the accuracy of contract data entered
                into the Platform.
              </li>
              <li>
                Lucerna is not liable for decisions made by your organization or
                stakeholders based on information provided by the agent.
              </li>
              <li>
                You must not use the Platform to make automated calls for
                purposes other than contract management, or in violation of
                applicable telemarketing or communications laws.
              </li>
            </ul>
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          5. Intellectual Property
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            All platform software, interfaces, trademarks, and documentation are
            the property of Lucerna or its licensors. You retain ownership of
            the contract data you create. You grant Lucerna a limited license to
            process that data solely to provide the Platform services. You may
            not reproduce, modify, distribute, or create derivative works of
            Platform software without prior written consent.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          6. Service Availability
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            We aim to maintain high availability but do not guarantee
            uninterrupted service. Scheduled maintenance, third-party outages,
            and circumstances beyond our control may affect availability. SLA
            commitments are available on Enterprise plans.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          7. Termination
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            We reserve the right to suspend or terminate your access to the
            Platform at our discretion, without prior notice, for violations of
            these Terms or for legal or security concerns. You may cancel your
            account at any time from your dashboard.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          8. Limitation of Liability
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            To the maximum extent permitted by law, Lucerna shall not be liable
            for any indirect, incidental, special, or consequential damages
            arising from your use of the Platform, including any errors or
            omissions by the AI voice agent. Our total liability shall not
            exceed the amount you paid us in the three months preceding the
            claim.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          9. Changes to Terms
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            We may update these Terms from time to time. We will notify you of
            material changes via email or the platform at least 14 days before
            they take effect. Continued use after changes become effective
            constitutes acceptance of the revised Terms.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          10. Governing Law
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            These Terms are governed by the laws of the jurisdiction in which
            Lucerna is legally registered. You agree to submit to the exclusive
            jurisdiction of the relevant courts in that location for any
            disputes arising under these Terms.
          </Typography>
        </Box>

        <Typography variant="h5" gutterBottom>
          11. Contact Us
        </Typography>
        <Box mb={3}>
          <Typography variant="body1">
            If you have any questions about these Terms, please contact us at:
          </Typography>
          <Typography variant="body1">
            <strong>Email:</strong> legal@lucerna.ai
            <br />
            <strong>Address:</strong> [To be registered]
          </Typography>
        </Box>
      </Container>
    </AppTheme>
  );
}
