import "./globals.css";
import RegisterServiceWorker from "./RegisterServiceWorker.jsx";

// The manifest + icons + appleWebApp fields below are what make this
// installable as an app ("Add to Home Screen" on mobile, an install
// prompt on desktop Chrome/Edge) straight from the browser — no separate
// codebase or app-store submission needed. themeColor lives in the
// separate `viewport` export below, per Next's metadata API.
export const metadata = {
  title: "B-Active Group Ops Dashboard",
  description: "Internal operations dashboard for B-Active Group extra-mural programs",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "B-Active Ops",
  },
};

export const viewport = {
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
