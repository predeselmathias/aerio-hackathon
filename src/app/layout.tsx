import "~/styles/globals.css";
import "leaflet/dist/leaflet.css";

import { type Metadata } from "next";
import { TRPCReactProvider } from "~/trpc/react";
import { AppShell } from "~/app/_components/app-shell";

export const metadata: Metadata = {
  title: "Aerio — Romania Drone Flight Planner",
  description:
    "Plan a drone flight in Romania with ROMATSA airspace references and local request tools.",
  icons: [{ rel: "icon", url: "/aerio.svg", type: "image/svg+xml" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <TRPCReactProvider>
          <AppShell>{children}</AppShell>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
