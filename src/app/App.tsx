import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { AssetPage } from "../pages/AssetPage";
import { HomePage } from "../pages/HomePage";
import { MarketsPage } from "../pages/MarketsPage";
import { UiKitPage } from "../pages/UiKitPage";
import { AppLayout, Footer, Header, Link, WalletConnectButton } from "../shared/ui";
import styles from "./App.module.css";

type AppProps = {
  mockMode?: boolean;
};

const isDev = import.meta.env.DEV;

function MockAppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPage = location.pathname === "/";

  const navLink = (to: string, label: string) => (
    <Link
      href={to}
      className={location.pathname.startsWith(to) ? styles.activeNavLink : styles.navLink}
      onClick={(event) => {
        event.preventDefault();
        navigate(to);
      }}
    >
      {label}
    </Link>
  );

  return (
    <AppLayout
      header={
        isRootPage ? undefined : (
          <Header
            logo={
              <Link href="/" className={styles.logoLink}>
                <span className={styles.logo}>Velkonix</span>
              </Link>
            }
            nav={
              <div className={styles.navLinks}>
                {navLink("/markets", "Markets")}
              </div>
            }
            actions={<WalletConnectButton />}
          />
        )
      }
      footer={
        <Footer
          links={
            <div className={styles.footerLinks}>
              <Link href="https://x.com" target="_blank" rel="noreferrer">
                X
              </Link>
              <Link href="https://discord.com" target="_blank" rel="noreferrer">
                Discord
              </Link>
              <Link href="https://github.com" target="_blank" rel="noreferrer">
                GitHub
              </Link>
              <Link href="https://docs.github.com" target="_blank" rel="noreferrer">
                GitBook
              </Link>
            </div>
          }
          label="Velkonix"
        />
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/asset/:assetId" element={<AssetPage />} />
        {isDev ? <Route path="/ui-kit" element={<UiKitPage />} /> : null}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App({ mockMode = false }: AppProps) {
  if (!mockMode) {
    const isUiKitPath = typeof window !== "undefined" && window.location.pathname === "/ui-kit";
    return (
      <div className="app">
        {isDev && isUiKitPath ? <UiKitPage /> : <HomePage />}
      </div>
    );
  }

  return <BrowserRouter><MockAppShell /></BrowserRouter>;
}
