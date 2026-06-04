import { Card, PageContainer, PageHeader, Section, Typography } from "../shared/ui";
import styles from "./FaqPage.module.css";

type FaqItem = {
  question: string;
  answer: string | string[];
  bullets?: string[];
};

type FaqCategory = {
  title: string;
  items: FaqItem[];
};

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: "About Velkonix",
    items: [
      {
        question: "What is Velkonix?",
        answer:
          "Velkonix is a decentralized lending protocol built on MegaETH. Users can supply assets to earn yield and borrow against collateral through overcollateralized lending markets.",
      },
      {
        question: "How does Velkonix work?",
        answer:
          "Users deposit assets into liquidity pools. These assets become available for borrowing by other users who provide collateral. Interest paid by borrowers is distributed to liquidity suppliers.",
      },
      {
        question: "Why is Velkonix built on MegaETH?",
        answer:
          "MegaETH provides a high-performance execution environment designed for scalable onchain applications, enabling Velkonix to deliver efficient lending markets with low latency and improved user experience.",
      },
      {
        question: "Is Velkonix non-custodial?",
        answer:
          "Yes. Users maintain control of their assets through their own wallets. Velkonix does not take custody of user funds.",
      },
    ],
  },
  {
    title: "Lending & rates",
    items: [
      {
        question: "How are interest rates determined?",
        answer:
          "Velkonix uses a utilization-based interest rate model. Borrowing rates adjust automatically based on the ratio of borrowed assets to available liquidity within each market.",
      },
      {
        question: "Can I use supplied assets as collateral?",
        answer:
          "Yes. Supported supplied assets can be enabled as collateral, allowing users to borrow against them while maintaining exposure to the underlying asset.",
      },
      {
        question: "What happens if my position becomes unsafe?",
        answer:
          "If the value of your collateral falls below the required threshold, your position may become eligible for liquidation. Liquidation helps protect the protocol from bad debt and maintain overall solvency.",
      },
      {
        question: "How can I avoid liquidation?",
        answer:
          "Users should regularly monitor their Health Factor and maintain sufficient collateral relative to their outstanding debt.",
      },
    ],
  },
  {
    title: "Token & staking",
    items: [
      {
        question: "Has the VLX token launched?",
        answer: "No. VLX has not launched yet, and the Token Generation Event has not taken place.",
      },
      {
        question: "When will TGE take place?",
        answer:
          "The TGE date has not been announced yet. Follow official Velkonix channels for future updates.",
      },
      {
        question: "Is staking available?",
        answer:
          "Not yet. The staking system and xVLX mechanics described in the documentation will be introduced after launch.",
      },
      {
        question: "What is xVLX?",
        answer:
          "xVLX is the future staked version of VLX. It will represent participation in the protocol's value distribution system once staking becomes available.",
      },
    ],
  },
  {
    title: "Risks & updates",
    items: [
      {
        question: "What are the main risks?",
        answer: "Like all DeFi protocols, Velkonix carries risks, including:",
        bullets: [
          "smart contract vulnerabilities",
          "oracle failures",
          "liquidation risk",
          "market volatility",
        ],
      },
      {
        question: "Where can I follow project updates?",
        answer:
          "Official announcements, launch information, and protocol updates will be shared through Velkonix's official social channels and documentation.",
      },
    ],
  },
];

export function FaqPage() {
  return (
    <PageContainer className={styles.page}>
      <PageHeader
        title="FAQ"
        subtitle="frequently asked questions about Velkonix"
        titleAs="h2"
        subtitleVariant="label"
        className={styles.pageHeader}
      />

      <div className={styles.content}>
        {FAQ_CATEGORIES.map((category) => {
          const anchor = category.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          return (
            <Section key={anchor}>
              <Typography as="h3" id={anchor} className={styles.categoryTitle}>
                {category.title}
              </Typography>
              <Card className={styles.categoryCard}>
                <ul className={styles.itemList}>
                  {category.items.map((item) => (
                    <li key={item.question} className={styles.item}>
                      <details className={styles.details}>
                        <summary className={styles.summary}>
                          <span className={styles.question}>{item.question}</span>
                          <span className={styles.chevron} aria-hidden="true" />
                        </summary>
                        <div className={styles.answer}>
                          <Typography as="p" variant="body" muted>
                            {Array.isArray(item.answer) ? item.answer.join(" ") : item.answer}
                          </Typography>
                          {item.bullets ? (
                            <ul className={styles.bullets}>
                              {item.bullets.map((bullet) => (
                                <li key={bullet}>
                                  <Typography as="span" variant="body" muted>
                                    {bullet}
                                  </Typography>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </Card>
            </Section>
          );
        })}
      </div>
    </PageContainer>
  );
}
