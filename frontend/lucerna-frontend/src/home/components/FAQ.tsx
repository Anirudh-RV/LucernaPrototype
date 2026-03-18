import * as React from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const faqs = [
  {
    id: "panel1",
    question: "Do I need any technical knowledge to set up Lucerna?",
    answer:
      "No. Lucerna is designed to be set up by operations and contracts teams, not engineers. You define your contract table through a point-and-click interface, enter your stakeholder details, and the AI agent is ready to take calls. No code, no database configuration, no API integrations required.",
  },
  {
    id: "panel2",
    question: "How does the agent verify who is calling?",
    answer:
      "When a stakeholder calls, the agent asks for their phone number and contract ID. It then sends a one-time password (OTP) to the email address on file for that stakeholder. The caller must read back the OTP before the agent shares or updates any contract information. This two-factor check runs on every call.",
  },
  {
    id: "panel3",
    question: "Can stakeholders update contract information over the phone?",
    answer:
      "Yes — but only fields you designate as editable when you set up your contract table. Read-only fields like contract IDs and system timestamps cannot be modified by anyone over the phone. Before writing any change, the agent reads back the update and asks the caller to confirm verbally.",
  },
  {
    id: "panel4",
    question: "What happens if the agent can't answer a question?",
    answer:
      "If the caller asks something outside the contract data — or the agent encounters an error — it tells the caller that a human will call them back at the same number and ends the call. Every escalation is logged in your dashboard so your team knows who to follow up with and why.",
  },
  {
    id: "panel5",
    question: "Can the agent make outbound calls to stakeholders?",
    answer:
      "Yes. In addition to handling inbound calls from stakeholders, Lucerna supports outbound calls where the agent proactively contacts stakeholders to request updates or provide information. Both call directions use the same OTP authentication flow.",
  },
  {
    id: "panel6",
    question: "Is my contract data secure?",
    answer:
      "Your contract data is stored in an isolated database schema unique to your project and is never shared across organizations. All authentication is handled via OTP — the agent never grants access based on voice recognition alone. For enterprise plans, we offer SSO, audit logs, and custom data residency options.",
  },
  {
    id: "panel7",
    question: "How do I contact support?",
    answer: null, // rendered separately with a Link
  },
];

export default function FAQ() {
  const [expanded, setExpanded] = React.useState<string[]>([]);

  const handleChange =
    (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(
        isExpanded
          ? [...expanded, panel]
          : expanded.filter((item) => item !== panel),
      );
    };

  return (
    <Container
      id="faq"
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
      <Typography
        component="h2"
        variant="h4"
        sx={{
          color: "text.primary",
          width: { sm: "100%", md: "60%" },
          textAlign: { sm: "left", md: "center" },
        }}
      >
        Frequently asked questions
      </Typography>

      <Box sx={{ width: "100%" }}>
        {faqs.map(({ id, question, answer }) => (
          <Accordion
            key={id}
            expanded={expanded.includes(id)}
            onChange={handleChange(id)}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`${id}-content`}
              id={`${id}-header`}
            >
              <Typography component="span" variant="subtitle2">
                {question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {answer ? (
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{ maxWidth: { sm: "100%", md: "70%" } }}
                >
                  {answer}
                </Typography>
              ) : (
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{ maxWidth: { sm: "100%", md: "70%" } }}
                >
                  You can reach our support team by emailing{" "}
                  <Link href="mailto:support@lucerna.ai">
                    support@lucerna.ai
                  </Link>
                  . We typically respond within one business day.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Container>
  );
}
