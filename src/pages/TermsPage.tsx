import { Card, PageContainer, PageHeader, Typography } from "../shared/ui";
import styles from "./LegalPage.module.css";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "Introduction",
    paragraphs: [
      "Welcome to Velkonix.",
      "These Terms of Service govern your access to and use of the Velkonix website, interface, documentation, smart contracts, and any related services (collectively, the “Services”).",
      "Velkonix is a decentralized lending protocol built on MegaETH. The protocol enables users to supply assets, access liquidity through collateralized borrowing, and interact with a system of onchain financial markets powered by smart contracts.",
      "By accessing or using the Services, you agree to these Terms. If you do not agree with these Terms, you should not access or use the Services.",
    ],
  },
  {
    title: "Eligibility",
    paragraphs: [
      "The Services are intended only for individuals and entities capable of entering legally binding agreements under applicable law.",
      "By using the Services, you represent that you have the legal capacity to accept these Terms and that your use of the Services complies with all laws and regulations applicable to you.",
      "You are solely responsible for determining whether your access to and use of the Services is permitted in your jurisdiction.",
    ],
  },
  {
    title: "The Protocol",
    paragraphs: [
      "Velkonix provides access to decentralized smart contracts deployed on public blockchain networks.",
      "The Services are intended to facilitate interaction with the protocol but do not control the protocol itself. Transactions are executed directly through blockchain infrastructure and autonomous smart contracts.",
      "Information available through the Services, including documentation, analytics, educational materials, and protocol statistics, is provided for general informational purposes only. While we strive to maintain accurate and up-to-date information, we do not guarantee its completeness, accuracy, or reliability.",
    ],
  },
  {
    title: "Self-Custody",
    paragraphs: [
      "Velkonix is a non-custodial protocol.",
      "At no point does Velkonix take possession, custody, or control of user assets. All interactions with the protocol occur directly through self-custodial wallets controlled by users.",
      "Because users maintain control of their own wallets and private keys, they remain fully responsible for wallet security, transaction approvals, asset management, and access credentials.",
      "Velkonix cannot recover private keys, reverse blockchain transactions, restore lost assets, or recover access to compromised wallets.",
    ],
  },
  {
    title: "Third-Party Services",
    paragraphs: [
      "Accessing the Services may require the use of third-party software, infrastructure, or blockchain networks, including wallet providers, RPC providers, analytics services, and other external technologies.",
      "These services operate independently from Velkonix and may be governed by their own terms, policies, and security practices.",
      "Velkonix does not control, endorse, or assume responsibility for any third-party services or infrastructure used in connection with the Protocol.",
    ],
  },
  {
    title: "Understanding the Risks",
    paragraphs: [
      "Using decentralized finance applications involves significant risk.",
      "Smart contracts may contain vulnerabilities, blockchain networks may experience failures or disruptions, and digital assets may experience extreme volatility. Protocol functionality may also depend on external systems such as price oracles, validators, liquidity providers, and third-party infrastructure.",
      "Borrowing positions may become subject to liquidation if collateral values decline or market conditions change. Users are responsible for monitoring and managing their positions accordingly.",
      "All blockchain transactions are irreversible once confirmed. Any losses resulting from protocol interactions, user actions, market conditions, or technical failures remain the sole responsibility of the user.",
      "Before interacting with the Protocol, users should carefully evaluate whether decentralized financial products are appropriate for their experience level, financial circumstances, and risk tolerance.",
    ],
  },
  {
    title: "Information Only",
    paragraphs: [
      "The Services, documentation, educational materials, community discussions, analytics dashboards, social media content, and all other materials provided by Velkonix are made available solely for informational purposes.",
      "Nothing contained within the Services should be interpreted as investment advice, financial advice, legal advice, accounting advice, tax advice, or a recommendation regarding any asset, transaction, or strategy.",
      "Users are solely responsible for their decisions and should seek independent professional advice where appropriate.",
    ],
  },
  {
    title: "Protocol Development",
    paragraphs: [
      "Velkonix is an evolving protocol.",
      "Features described in documentation, public communications, roadmaps, or community discussions may be modified, delayed, replaced, or removed as development progresses.",
      "References to future functionality, including governance systems, token mechanics, staking systems, rewards, emissions, or protocol upgrades, are provided for informational purposes only and should not be interpreted as guarantees of future implementation.",
    ],
  },
  {
    title: "Acceptable Use",
    paragraphs: [
      "You may not use the Services in any manner that violates applicable law or infringes upon the rights of others.",
      "You agree not to engage in activities that may interfere with the operation, security, integrity, or availability of the Services or the underlying protocol. This includes attempts to exploit vulnerabilities, manipulate markets, disrupt infrastructure, gain unauthorized access, or facilitate fraudulent or unlawful activity.",
      "Velkonix reserves the right to restrict access to the interface where necessary to maintain security, protect users, comply with legal obligations, or preserve the integrity of the Services.",
    ],
  },
  {
    title: "No Liability",
    paragraphs: [
      "The Services are provided on an “as is” and “as available” basis.",
      "To the fullest extent permitted by applicable law, Velkonix and its contributors, developers, affiliates, contractors, and service providers disclaim all warranties, whether express or implied, including warranties of availability, reliability, security, fitness for a particular purpose, and non-infringement.",
      "Velkonix shall not be responsible for any direct, indirect, incidental, consequential, special, punitive, or other losses arising from the use of the Protocol or Services, including losses related to smart contract vulnerabilities, liquidations, market volatility, oracle failures, exploits, cyberattacks, blockchain network failures, third-party services, or loss of digital assets.",
      "Users assume full responsibility for the outcomes of their interactions with the Protocol.",
    ],
  },
  {
    title: "Changes to These Terms",
    paragraphs: [
      "These Terms may be updated from time to time to reflect protocol developments, legal requirements, or operational changes.",
      "Updated versions will become effective upon publication through the Services or official communication channels.",
      "Continued use of the Services after such updates constitutes acceptance of the revised Terms.",
    ],
  },
];

export function TermsPage() {
  return (
    <PageContainer className={styles.page}>
      <PageHeader
        title="Terms of Service"
        subtitle="Last updated: 04.06.2026"
        titleAs="h2"
        subtitleVariant="label"
        className={styles.pageHeader}
      />

      <div className={styles.content}>
        <Card className={styles.contentCard}>
          {TERMS_SECTIONS.map((section) => (
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
