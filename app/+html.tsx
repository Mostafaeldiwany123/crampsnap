import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
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
  background-color: #ffffff;
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
button, input, textarea, select {
  font-family: 'Assistant', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
*:focus, *:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #ffffff;
  }
}`;
