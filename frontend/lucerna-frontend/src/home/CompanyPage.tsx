import { useEffect } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import AppTheme from "../shared-ui-theme/AppTheme";
import AppAppBar from "./components/AppAppBar";
import Footer from "./components/Footer";

export default function CompanyPage(props: { disableCustomTheme?: boolean }) {
  useEffect(() => {
    document.title = "About Lucerna";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <AppAppBar />
      <Box
        sx={(theme) => ({
          position: "relative",
          minHeight: "100vh",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            zIndex: -1,
            backgroundRepeat: "no-repeat",
            backgroundImage:
              "radial-gradient(ellipse 80% 25% at 50% 0%, hsl(210, 100%, 90%), transparent)",
            ...theme.applyStyles?.("dark", {
              backgroundImage:
                "radial-gradient(ellipse 80% 25% at 50% 0%, hsl(210, 100%, 16%), transparent)",
            }),
          },
        })}
      >
        <Container
          sx={{
            pt: { xs: 6, sm: 12 },
            pb: { xs: 8, sm: 12 },
            maxWidth: "md",
            my: 5,
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            About Lucerna
          </Typography>

          <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 4 }}>
            Contract management that works the way enterprise does — over the
            phone
          </Typography>
          <Typography variant="body1">
            <strong>Lucerna</strong> is an AI-powered contract management
            platform built for enterprises that need a faster, more reliable way
            to keep stakeholders informed and contracts up to date. We replace
            manual status calls, email chains, and spreadsheet lookups with a
            single intelligent voice agent that authenticates callers, answers
            contract questions, and logs updates — automatically, on every call.
          </Typography>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            The Problem We Solve
          </Typography>
          <Typography variant="body1" paragraph>
            Enterprise contracting teams spend an enormous amount of time
            fielding repetitive status questions from vendors, partners, and
            internal stakeholders. "What's the current contract value?" "Has the
            completion date changed?" "Who do I speak to about an amendment?"
            These calls are low complexity but high volume — and they consume
            time that should be spent on higher-value work.
          </Typography>
          <Typography variant="body1">
            At the same time, getting stakeholders to provide updates is equally
            painful. Chasing emails, scheduling calls, and manually updating
            records creates delays and errors that compound across large
            contract portfolios.
          </Typography>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            Our Mission
          </Typography>
          <Typography variant="body1">
            To make contract communication effortless for enterprises and their
            stakeholders — so that the right information is always accessible,
            always accurate, and always available without a human in the loop.
          </Typography>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            How Lucerna Works
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 3 }}>
            <li>
              <Typography variant="body1">
                <strong>You define your contract table.</strong> Use our no-code
                interface to create a contract schema with exactly the columns
                your business tracks — dates, values, statuses, custom fields,
                anything.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>You register your stakeholders.</strong> Add the people
                who need access, assign them to specific contracts or all
                contracts, and Lucerna handles the rest.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>The agent handles the calls.</strong> When a stakeholder
                calls in, the agent verifies their identity via email OTP,
                answers their questions from the live contract data, accepts
                verbal updates, and escalates to a human only when necessary.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Your team stays in control.</strong> Every call, update,
                and escalation is logged in your dashboard. Your contract data
                stays current without anyone on your team lifting a finger.
              </Typography>
            </li>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            Why the Name "Lucerna"?
          </Typography>
          <Typography variant="body1">
            Lucerna is the Latin word for lamp — a source of light and clarity.
            We chose it because our mission is to bring clarity to enterprise
            contracting: clear access to information, clear communication with
            stakeholders, and clear audit trails for every interaction.
          </Typography>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            Our Values
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 3 }}>
            <li>
              <Typography variant="body1">
                <strong>Security by default.</strong> Every stakeholder call
                requires OTP verification. Contract data is only shared with
                people you explicitly authorize, down to the individual row.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Transparency in every interaction.</strong> The agent
                confirms every update before writing it, logs every escalation,
                and never guesses when data isn't available.
              </Typography>
            </li>
            <li>
              <Typography variant="body1">
                <strong>Built for how enterprises actually work.</strong> Not a
                general-purpose tool adapted for contracts — purpose-built for
                the specific workflows, access controls, and compliance needs of
                enterprise contracting teams.
              </Typography>
            </li>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            Get Started
          </Typography>
          <Typography variant="body1" paragraph>
            Whether you're managing 50 contracts or 50,000, Lucerna scales with
            you. Sign up for free to create your first contract table, add your
            stakeholders, and experience what automated contract communication
            feels like.
          </Typography>
          <Typography variant="body1">
            Have questions or want a walkthrough?{" "}
            <strong>hello@lucerna.ai</strong>
          </Typography>
        </Container>
      </Box>
      <Footer />
    </AppTheme>
  );
}
