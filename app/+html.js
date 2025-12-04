export default function Root({ children }) {
  return (
    <html lang="es">
      <head>
        <base href="/oxycalc/" />
      </head>
      <body>{children}</body>
    </html>
  );
}
