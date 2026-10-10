import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

interface MarkdownRendererProps {
  content: string;
}

export function sanitizeMarkdownMath(text: string): string {
  if (!text) return '';
  return text.replace(/`+(\$[^`]+?\$|\$\$[\s\S]+?\$\$)`+/g, '$1');
}

/**
 * Web-specific Markdown & KaTeX renderer that does not depend on react-native-webview.
 * Runs directly in an isolated iframe with KaTeX and Marked scripts loaded via CDN.
 */
export const MarkdownRenderer = React.memo(({ content }: MarkdownRendererProps) => {
  const [iframeHeight, setIframeHeight] = useState(120);
  const [isLoaded, setIsLoaded] = useState(false);
  const frameRef = useRef<any>(null);

  const cleanContent = sanitizeMarkdownMath(content || '');
  const encodedContent = encodeURIComponent(cleanContent);

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    body {
      font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      color: #111827;
      line-height: 1.5;
      padding: 0;
      margin: 0;
      background-color: transparent;
      overflow-x: hidden;
    }
    pre {
      background-color: #1E293B;
      color: #F8FAFC;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 14px;
    }
    code {
      background-color: #F1F5F9;
      color: #0F172A;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
    }
    pre code { background-color: transparent; color: inherit; padding: 0; }
    h1 { font-size: 16px; color: #111827; margin-top: 1em; margin-bottom: 0.25em; font-weight: 700; }
    h2 { font-size: 14px; color: #111827; margin-top: 0.8em; margin-bottom: 0.2em; font-weight: 700; }
    h3 { font-size: 13px; color: #374151; margin-top: 0.7em; margin-bottom: 0.15em; font-weight: 600; }
    h4, h5, h6 { font-size: 13px; color: #374151; margin-top: 0.5em; margin-bottom: 0.1em; font-weight: 600; }
    #content-container > *:first-child { margin-top: 0 !important; }
    a { color: #3B82F6; text-decoration: none; }
    p { margin-bottom: 0.6em; }
    .katex-display { overflow-x: auto; overflow-y: hidden; padding: 8px 0; }
  </style>
</head>
<body>
  <div id="content-container"></div>
  <script>
    function sendHeight() {
      const container = document.getElementById("content-container");
      if (container) {
        const height = Math.max(container.scrollHeight, container.offsetHeight, 60);
        window.parent.postMessage({ type: 'CRAMSNAP_MARKDOWN_HEIGHT', height: height }, '*');
      }
    }
    document.addEventListener("DOMContentLoaded", function() {
      try {
        const contentDiv = document.getElementById("content-container");
        var rawMarkdown = decodeURIComponent("${encodedContent}")
          .replace(/\\x60+(\\$\\$[\\s\\S]+?\\$\\$|\\$[^\\x60\\r\\n]+?\\$)\\x60+/g, "$1");
        contentDiv.innerHTML = marked.parse(rawMarkdown);
        renderMathInElement(contentDiv, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "\\\\[", right: "\\\\]", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\\\(", right: "\\\\)", display: false}
          ],
          throwOnError: false,
          errorColor: "#EF4444"
        });
        sendHeight();
        setInterval(sendHeight, 300);
      } catch (err) {
        console.error(err);
      }
    });
  </script>
</body>
</html>`;

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CRAMSNAP_MARKDOWN_HEIGHT' && typeof e.data.height === 'number') {
        setIframeHeight(e.data.height + 15);
        setIsLoaded(true);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  return (
    <View style={[styles.container, { height: iframeHeight }]}>
      <iframe
        ref={frameRef}
        srcDoc={htmlContent}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: 'transparent',
          overflow: 'hidden',
        }}
        onLoad={() => setIsLoaded(true)}
      />
      {!isLoaded && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#94A3B8" />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    minHeight: 80,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});

export default MarkdownRenderer;
