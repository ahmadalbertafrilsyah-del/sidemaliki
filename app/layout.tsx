import "./globals.css"; // File CSS-mu yang tadi

export const metadata = {
  title: "SIDE-MALIKI",
  description: "Sistem Informasi dan Administrasi Digital DEMALIKI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* Link Bootstrap & FontAwesome dari kodingan aslimu */}
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Arial@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        
        {/* Script Bootstrap */}
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" async></script>
      </body>
    </html>
  );
}