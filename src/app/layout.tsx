import type { Metadata } from "next";
import "../styles.css";
export const metadata: Metadata = {
  title: { default: "AMBS Visibility Hub", template: "%s · AMBS" },
  description: "Pilotage SEO et GEO vérifiable pour les sites AMBS.",
  icons: { icon: "/favicon.png" },
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-3"
        >
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
