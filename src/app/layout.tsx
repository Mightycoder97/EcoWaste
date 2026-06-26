import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata: Metadata = {
  title: 'EcoWaste Finder - Buscador y CRM de Residuos Peligrosos',
  description: 'Herramienta moderna de búsqueda, calificación y gestión de clientes de residuos peligrosos (hospitales, clínicas, laboratorios) impulsada por DeepSeek V4.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        {googleKey && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=places`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}

