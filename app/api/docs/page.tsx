import { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "API Документация | Finappka",
  description: "REST API документация для Finappka",
};

export default function ApiDocsPage() {
  return (
    <html lang="ru">
      <head>
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
        />
      </head>
      <body style={{ margin: 0 }}>
        <div id="swagger-ui"></div>
        
        <Script
          src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"
          strategy="beforeInteractive"
        />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = () => {
                window.ui = SwaggerUIBundle({
                  url: '/api/docs/openapi.json',
                  dom_id: '#swagger-ui',
                  deepLinking: true,
                  presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                  ],
                  plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                  ],
                  layout: "StandaloneLayout"
                });
              };
            `,
          }}
        />
      </body>
    </html>
  );
}
