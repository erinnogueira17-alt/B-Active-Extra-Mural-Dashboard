import "./globals.css";

export const metadata = {
  title: "B-Active Group Ops Dashboard",
  description: "Internal operations dashboard for B-Active Group extra-mural programs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
