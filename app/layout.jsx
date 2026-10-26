export const metadata = {
  title: "FORMA — Design as a Service",
  description: "A plataforma que conecta clientes, designers e empresas em um único fluxo criativo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
