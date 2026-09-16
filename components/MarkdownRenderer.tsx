import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Sanitizes markdown content to ensure KaTeX math is not mistakenly
 * trapped inside inline backticks (`$x$` or `\frac{...}`) or code blocks.
 */
export function sanitizeMarkdownMath(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Unwrap display math inside backticks: `$$...$$` -> $$...$$
  cleaned = cleaned.replace(/`+(\$\$[\s\S]+?\$\$)`+/g, '$1');

  // 2. Unwrap inline math inside backticks: `$formula$` -> $formula$
  cleaned = cleaned.replace(/`+(\$[^`\r\n]+?\$|\\[\(\[][\s\S]+?\\[\)\]])`+/g, '$1');

  // 3. Unwrap LaTeX commands enclosed in backticks without dollar signs:
  // e.g. `\frac{1}{2}` or `\sqrt{x^2 + y^2}` or `\alpha + \beta`
  cleaned = cleaned.replace(/`+([^`\r\n]*?\\[a-zA-Z]+[^`\r\n]*?)`+/g, (match, inner) => {
    const isLatex = /\\(?:frac|sqrt|int|sum|prod|lim|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|tau|phi|omega|Delta|Sigma|partial|nabla|infty|pm|mp|times|div|cdot|leq|geq|neq|approx|equiv|forall|exists|in|notin|subset|cup|cap|vec|hat|bar|tilde|mathbf|mathrm|text|begin|end|matrix|pmatrix|bmatrix|vmatrix|cases|left|right|over)\b/.test(inner);
    if (isLatex) {
      const trimmed = inner.trim();
      if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
        return trimmed;
      }
      return `$${trimmed}$`;
    }
    return match;
  });

  return cleaned;
}

export const MarkdownRenderer = React.memo(({ content }: MarkdownRendererProps) => {
  const [webViewHeight, setWebViewHeight] = useState(100);
  const [isLoaded, setIsLoaded] = useState(false);

  // Pre-clean math before passing to webview
  const cleanContent = sanitizeMarkdownMath(content || '');
  const encodedContent = encodeURIComponent(cleanContent);

  const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  
  <!-- KaTeX CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  
  <!-- Scripts -->
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  
  <style>
    html, body {
      height: auto !important;
      min-height: 100%;
    }
    body {
      font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, sans-serif;
      font-size: 14px;
      color: #111827;
      line-height: 1.5;
      padding: 0;
      margin: 0;
      background-color: transparent;
      padding-bottom: 20px;
    }
    
    ::-webkit-scrollbar {
      display: none;
    }
    
    /* Code block styling */
    pre {
      background-color: #1E293B;
      color: #F8FAFC;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 14px;
    }
    
    /* Inline code styling */
    code {
      background-color: #F1F5F9;
      color: #0F172A;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
    }
    
    pre code {
      background-color: transparent;
      color: inherit;
      padding: 0;
    }

    h1 { font-size: 16px; color: #111827; margin-top: 1em; margin-bottom: 0.25em; font-weight: 700; }
    h2 { font-size: 14px; color: #111827; margin-top: 0.8em; margin-bottom: 0.2em; font-weight: 700; }
    h3 { font-size: 13px; color: #374151; margin-top: 0.7em; margin-bottom: 0.15em; font-weight: 600; }
    h4, h5, h6 { font-size: 13px; color: #374151; margin-top: 0.5em; margin-bottom: 0.1em; font-weight: 600; }
    
    /* Remove top margin from very first element to avoid big gap */
    #content-container > *:first-child {
      margin-top: 0 !important;
    }

    a {
      color: #3B82F6;
      text-decoration: none;
    }

    p {
      margin-bottom: 0.6em;
    }

    /* Math rendering fixes */
    .katex-display {
      overflow-x: auto;
      overflow-y: hidden;
      padding: 8px 0;
    }

    /* Keep height updating dynamic */
    #content-container {
      padding-bottom: 1px; /* Ensure bottom margin doesn't collapse */
    }
  </style>
</head>
<body>
  <div id="content-container"></div>
  
  <script>
    function updateHeight() {
      // Measure the actual wrapper div instead of body/html to prevent the height
      // from infinitely expanding if the WebView viewport gets larger than the content
      const container = document.getElementById("content-container");
      if (container) {
        const height = container.offsetHeight;
        window.ReactNativeWebView.postMessage(height.toString());
      }
    }

    document.addEventListener("DOMContentLoaded", function() {
      try {
        const contentDiv = document.getElementById("content-container");
        
        // Decode the markdown from React Native
        var rawMarkdown = decodeURIComponent("${encodedContent}");
        
        // Ensure no backticks wrap math expressions
        rawMarkdown = rawMarkdown.replace(/\\x60+(\\$\\$[\\s\\S]+?\\$\\$)\\x60+/g, "$1");
        rawMarkdown = rawMarkdown.replace(/\\x60+(\\$[^\\x60\\r\\n]+?\\$|\\\\[\\[\\(][\\s\\S]+?\\\\[\\]\\)])\\x60+/g, "$1");
        
        // Parse markdown to HTML
        contentDiv.innerHTML = marked.parse(rawMarkdown);
        
        // Safeguard: Check if any <code> elements contain math.
        // If marked parsed backticked math into <code> tags, unwrap them into spans so KaTeX renders them
        var codeEls = contentDiv.querySelectorAll("code");
        for (var c = 0; c < codeEls.length; c++) {
          var codeEl = codeEls[c];
          var codeText = codeEl.textContent || "";
          if (codeText.indexOf("$") !== -1 || /\\\\(?:frac|sqrt|int|sum|prod|lim|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|tau|phi|omega|Delta|Sigma|partial|nabla|infty|pm|mp|times|div|cdot|leq|geq|neq|approx|equiv)\\b/.test(codeText)) {
            var span = document.createElement("span");
            var mathText = codeText.trim();
            if (!mathText.startsWith("$") && !mathText.startsWith("\\\\(") && !mathText.startsWith("\\\\[") && !mathText.startsWith("$$")) {
              mathText = "$" + mathText + "$";
            }
            span.textContent = mathText;
            codeEl.parentNode.replaceChild(span, codeEl);
          }
        }

        // Render KaTeX for all math blocks and inline math
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

        // Report height immediately and after images load
        updateHeight();
        
        // Check periodically to catch async layout changes
        setInterval(updateHeight, 300);
        
        // Setup ResizeObserver to report height changes dynamically
        const observer = new ResizeObserver(() => updateHeight());
        observer.observe(document.body);
        
      } catch (err) {
        console.error(err);
      }
    });
  </script>
</body>
</html>
  `;

  return (
    <View style={[styles.container, { height: webViewHeight }]}>
      <WebView
        source={{ html: htmlTemplate }}
        originWhitelist={['*']}
        onMessage={(event) => {
          if (event.nativeEvent.data) {
            setWebViewHeight(Number(event.nativeEvent.data));
          }
        }}
        onLoadEnd={() => setIsLoaded(true)}
        scrollEnabled={false}
        scalesPageToFit={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: 'transparent', opacity: 0.99 }}
        containerStyle={{ flex: 1, backgroundColor: 'transparent' }}
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
    minHeight: 100,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  }
});

export default MarkdownRenderer;
