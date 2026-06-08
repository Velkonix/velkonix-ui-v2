import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import logo from "../../logo-wordmark.svg";
import discordLogo from "../assets/discord-11.svg";
import gitbookLogo from "../assets/gitbook.svg";
import githubLogo from "../assets/github-icon-1.svg";
import xLogo from "../assets/x-logo.svg";

import { AssetPage } from "../pages/AssetPage";
import { DashboardPage } from "../pages/DashboardPage";
import { FaqPage } from "../pages/FaqPage";
import { HomePage } from "../pages/HomePage";
import { MarketsPage } from "../pages/MarketsPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { StakingPage } from "../pages/StakingPage";
import { TermsPage } from "../pages/TermsPage";
import { UiKitPage } from "../pages/UiKitPage";
import { useWallet } from "./providers/WalletProvider";
import {
  AppLayout,
  DashboardNavIcon,
  FaqNavIcon,
  Footer,
  Header,
  HeaderNavItem,
  Link,
  MarketsNavIcon,
  StakingNavIcon,
  WalletConnectButton,
} from "../shared/ui";
import styles from "./App.module.css";

const isDev = import.meta.env.DEV;

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const wallet = useWallet();
  const isRootPage = location.pathname === "/";

  const navItem = (to: string, label: string, icon: ReactNode) => (
    <HeaderNavItem
      href={to}
      label={label}
      icon={icon}
      isActive={location.pathname.startsWith(to)}
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
      }}
    />
  );

  return (
    <AppLayout
      header={
        isRootPage ? undefined : (
          <Header
            logo={
              <Link href="/" className={styles.logoLink}>
                <img src={logo} alt="Velkonix" className={styles.logo} />
              </Link>
            }
            nav={
              <div className={styles.navLinks}>
                {navItem("/markets", "Markets", <MarketsNavIcon />)}
                {navItem("/dashboard", "Dashboard", <DashboardNavIcon />)}
                {navItem("/staking", "Staking", <StakingNavIcon />)}
                {navItem("/faq", "FAQ", <FaqNavIcon />)}
              </div>
            }
            actions={<WalletConnectButton />}
          />
        )
      }
      footer={
        <Footer
          className={styles.iconOnlyFooter}
          links={
            <div className={styles.footerLinks}>
              <Link href="https://x.com" target="_blank" rel="noreferrer">
                <img src={xLogo} alt="X" className={styles.xLogo} />
              </Link>
              <Link href="https://discord.gg/XHPxKQwe" target="_blank" rel="noreferrer">
                <img src={discordLogo} alt="Discord" className={styles.discordLogo} />
              </Link>
              <Link href="https://github.com/Velkonix" target="_blank" rel="noreferrer">
                <img src={githubLogo} alt="GitHub" className={styles.githubLogo} />
              </Link>
              <Link href="https://docs.github.com" target="_blank" rel="noreferrer">
                <img src={gitbookLogo} alt="GitBook" className={styles.gitbookLogo} />
              </Link>
              <Link
                href="/terms"
                className={styles.legalLink}
                onClick={(event) => {
                  event.preventDefault();
                  navigate("/terms");
                }}
              >
                TERMS
              </Link>
              <Link
                href="/privacy"
                className={styles.legalLink}
                onClick={(event) => {
                  event.preventDefault();
                  navigate("/privacy");
                }}
              >
                PRIVACY
              </Link>
            </div>
          }
        />
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/staking" element={<StakingPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/asset/:assetId" element={<AssetPage />} />
        {isDev ? <Route path="/ui-kit" element={<UiKitPage />} /> : null}
        {wallet.mode === "real" && wallet.isConnected && wallet.isWrongNetwork ? (
          <Route path="*" element={<Navigate to="/markets" replace />} />
        ) : null}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <div className="app">
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </div>
  );
}
