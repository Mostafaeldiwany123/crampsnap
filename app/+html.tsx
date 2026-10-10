import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        <title>CramSnap - AI College Notes & Scanner</title>
        <meta name="description" content="AI Lecture & Document Scanner for College Students" />

        {/* PWA Settings */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CramSnap" />

        <ScrollViewStyleReset />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;500;600;700;800&family=Nunito:wght@400;600;700&family=PT+Sans:wght@400;700&family=Space+Mono&display=swap" rel="stylesheet" />

        {/* Register Service Worker for PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
* {
  font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  outline: none !important;
  -webkit-tap-highlight-color: transparent;
}
body {
  background-color: #F8FAFC;
  color: #0F172A;
  font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
@font-face {
  font-family: 'AssistantBold';
  src: local('Assistant Bold'), local('Assistant-Bold');
  font-weight: 700;
}
@font-face {
  font-family: 'AssistantSemiBold';
  src: local('Assistant SemiBold'), local('Assistant-SemiBold');
  font-weight: 600;
}
@font-face {
  font-family: 'AssistantExtraBold';
  src: local('Assistant ExtraBold'), local('Assistant-ExtraBold');
  font-weight: 800;
}
@font-face {
  font-family: 'Nunito';
  src: local('Nunito');
}
@font-face {
  font-family: 'NunitoBold';
  src: local('Nunito Bold'), local('Nunito-Bold');
  font-weight: 700;
}
@font-face {
  font-family: 'NunitoSemiBold';
  src: local('Nunito SemiBold'), local('Nunito-SemiBold');
  font-weight: 600;
}
@font-face {
  font-family: 'PTSans';
  src: local('PT Sans'), local('PTSans-Regular');
}
@font-face {
  font-family: 'PTSansBold';
  src: local('PT Sans Bold'), local('PTSans-Bold');
  font-weight: 700;
}
@font-face {
  font-family: 'SpaceMono';
  src: local('Space Mono'), local('SpaceMono-Regular');
}
button, input, textarea, select {
  font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
*:focus, *:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}`;
