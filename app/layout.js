import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Shell from "../components/Shell";

export const metadata = {
  title: "StreamDesh",
  description: "Video sharing and streaming platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
