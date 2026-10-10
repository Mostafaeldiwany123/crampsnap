import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, shrink-to-fit=no, viewport-fit=cover"
        />

        <title>CramSnap</title>
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
        <link
          href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;500;600;700;800&family=Nunito:wght@400;600;700&family=PT+Sans:wght@400;700&family=Space+Mono&display=swap"
          rel="stylesheet"
        />

        {/* Register Service Worker for PWA & Prevent Browser Page Pinch-Zoom on Camera */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.title = 'CramSnap';
              if (typeof window !== 'undefined') {
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(err) {
                      console.log('SW registration failed: ', err);
                    });
                  });
                }
                // Block mobile browser pinch zoom from zooming the entire page layout
                document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
                document.addEventListener('gesturechange', function(e) { e.preventDefault(); });
                document.addEventListener('gestureend', function(e) { e.preventDefault(); });
                window.addEventListener('wheel', function(e) {
                  if (e.ctrlKey) {
                    e.preventDefault();
                  }
                }, { passive: false });
                document.addEventListener('touchmove', function(e) {
                  if (e.touches && e.touches.length > 1) {
                    e.preventDefault();
                  }
                }, { passive: false });
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
  font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  font-weight: 300 !important;
  outline: none !important;
  -webkit-tap-highlight-color: transparent;
}
b, strong, h1, h2, h3, h4, h5, h6 {
  font-family: 'Assistant', sans-serif !important;
  font-weight: 400 !important;
}
html, body, #root {
  touch-action: manipulation;
  overscroll-behavior: none;
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
  src: local('Assistant'), local('Assistant-Regular');
  font-weight: 400;
}
@font-face {
  font-family: 'AssistantSemiBold';
  src: local('Assistant'), local('Assistant-Regular');
  font-weight: 400;
}
@font-face {
  font-family: 'AssistantExtraBold';
  src: local('Assistant'), local('Assistant-Regular');
  font-weight: 400;
}
@font-face {
  font-family: 'Nunito';
  src: local('Assistant'), local('Assistant-Regular');
  font-weight: 300;
}
@font-face {
  font-family: 'NunitoBold';
  src: local('Assistant'), local('Assistant-Regular');
  font-weight: 400;
}
@font-face {
  font-family: 'NunitoSemiBold';
  src: local('Assistant'), local('Assistant-Regular');
  font-weight: 400;
}
@font-face {
  font-family: 'PTSans';
  src: local('Assistant'), local('Assistant-Regular');
  font-weight: 300;
}
@font-face {
  font-family: 'PTSansBold';
  src: local('Assistant'), local('Assistant-Regular');
  font-weight: 400;
}
@font-face {
  font-family: 'SpaceMono';
  src: local('Assistant'), local('Assistant-Regular');
  font-weight: 300;
}
button, input, textarea, select {
  font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  font-weight: 300 !important;
}
*:focus, *:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}`;
