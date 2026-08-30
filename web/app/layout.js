import { Inter } from "next/font/google";
import "./globals.css";
import Authprovider from "./api/Authprovider/Authprovider";
import ThemeProvider from "./components/ThemeProvider";
import ToastProvider from "./components/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "FitVoyage",
  description: "Track your workouts, build your program, hit your goals.",
};

// Runs before first paint so the saved theme is applied without a flash of
// the wrong colours. Kept tiny and inline on purpose — anything larger
// would defeat the point.
const themeScript = `
(function () {
  try {
    var mode = localStorage.getItem("befit:theme-mode") || "system";
    var accent = localStorage.getItem("befit:theme-accent") || "red";
    var dark = mode === "dark" || (mode === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-accent", accent);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <Authprovider>{children}</Authprovider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
