import { Card, PageContainer, PageHeader, Typography } from "../shared/ui";
import styles from "./LegalPage.module.css";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "Introduction",
    paragraphs: [
      "Velkonix respects user privacy and is committed to maintaining transparency regarding how information is collected and used.",
      "Because Velkonix operates as a decentralized and non-custodial protocol, we generally collect only limited information necessary to maintain the website, improve the user experience, protect the Services, and support protocol development.",
      "By accessing or using the Services, you consent to the practices described in this Privacy Policy.",
    ],
  },
  {
    title: "Information We Collect",
    paragraphs: [
      "Information may be collected when you interact with the website, interface, documentation, or support channels.",
      "This information may include technical details such as browser type, device information, operating system, IP address, referral information, and general usage data relating to interactions with the Services.",
      "If you contact the Velkonix team, submit feedback, report bugs, or request support, we may collect information voluntarily provided by you, including contact information and communications relevant to your request.",
      "When connecting a wallet to the interface, wallet addresses may be processed to enable functionality, improve user experience, maintain security, and analyze protocol usage.",
    ],
  },
  {
    title: "Public Blockchain Information",
    paragraphs: [
      "Blockchain networks are public by design.",
      "When users interact with the Protocol, certain information may become publicly available through the underlying blockchain, including wallet addresses, transaction history, token balances, and smart contract interactions.",
      "Velkonix does not create, control, modify, or delete blockchain records and cannot remove information that has been permanently recorded on public networks.",
    ],
  },
  {
    title: "How Information Is Used",
    paragraphs: [
      "Information collected through the Services may be used to operate and improve the website and interface, provide support, analyze usage patterns, detect malicious activity, maintain security, troubleshoot technical issues, and comply with applicable legal obligations.",
      "We may also use aggregated or anonymized information to better understand user behavior and improve the overall protocol experience.",
    ],
  },
  {
    title: "Information Sharing",
    paragraphs: [
      "Velkonix does not sell personal information.",
      "Information may be shared with trusted service providers that support infrastructure, analytics, security monitoring, or operational functions necessary for maintaining the Services.",
      "Information may also be disclosed when required by law, regulation, legal process, or governmental request.",
    ],
  },
  {
    title: "Third-Party Services",
    paragraphs: [
      "The Services may integrate or rely upon third-party technologies, including wallet providers, blockchain infrastructure, analytics platforms, and external applications.",
      "Information collected by such services is governed by their respective privacy policies and terms of use.",
      "Velkonix is not responsible for the privacy practices of third-party services.",
    ],
  },
  {
    title: "Data Security",
    paragraphs: [
      "Reasonable technical and organizational measures are implemented to help protect information from unauthorized access, misuse, alteration, or disclosure.",
      "However, no internet-based service, software application, or blockchain system can guarantee absolute security. Users acknowledge and accept the inherent risks associated with digital communications and decentralized technologies.",
    ],
  },
  {
    title: "Data Retention",
    paragraphs: [
      "Information is retained only for as long as reasonably necessary to fulfill the purposes described in this Privacy Policy, comply with legal obligations, resolve disputes, enforce agreements, and protect the security and integrity of the Services.",
    ],
  },
  {
    title: "Your Rights",
    paragraphs: [
      "Depending on applicable laws and regulations, users may have certain rights regarding their personal information, including the right to access, correct, restrict, or request deletion of personal data.",
      "Requests relating to personal information may be submitted through official Velkonix communication channels.",
      "Please note that blockchain records cannot be modified or deleted once recorded on a public blockchain.",
    ],
  },
  {
    title: "Changes to This Policy",
    paragraphs: [
      "This Privacy Policy may be updated periodically to reflect changes in the Services, protocol development, legal requirements, or operational practices.",
      "Any updates will become effective upon publication through the Services or official communication channels.",
      "Continued use of the Services following publication of an updated Privacy Policy constitutes acceptance of the revised version.",
    ],
  },
];

export function PrivacyPage() {
  return (
    <PageContainer className={styles.page}>
      <PageHeader
        title="Privacy Policy"
        subtitle="Last updated: 04.06.2026"
        titleAs="h2"
        subtitleVariant="label"
        className={styles.pageHeader}
      />

      <div className={styles.content}>
        <Card className={styles.contentCard}>
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.title} className={styles.section}>
              <Typography as="h3" className={styles.sectionTitle}>
                {section.title}
              </Typography>
              <div className={styles.sectionBody}>
                {section.paragraphs.map((paragraph, index) => (
                  <Typography as="p" variant="body" muted key={`${section.title}-${index}`}>
                    {paragraph}
                  </Typography>
                ))}
              </div>
            </section>
          ))}
        </Card>
      </div>
    </PageContainer>
  );
}
