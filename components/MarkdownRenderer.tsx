import React from 'react';
import { View, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
import Katex from 'react-native-katex';

interface MarkdownRendererProps {
  content: string;
}

const processMath = (text: string) => {
  if (!text) return '';
  return text
    .replace(/(\$\$|\\\[)(.*?)(\$\$|\\\])/gs, (_, start, math) => `\`__MATH_BLOCK__${math.replace(/\n/g, ' ')}__MATH_BLOCK__\``)
    .replace(/(?<!\$)\$(?!\$)(.*?)(?<!\$)\$(?!\$)/g, (_, math) => `\`__MATH_INLINE__${math}__MATH_INLINE__\``)
    .replace(/\\\((.*?)\\\)/g, (_, math) => `\`__MATH_INLINE__${math}__MATH_INLINE__\``);
};

export const MarkdownRenderer = React.memo(({ content }: MarkdownRendererProps) => {
  return (
    <Markdown
      rules={{
        code_inline: (node, children, parent, styles) => {
          const content = node.content;
          if (content.startsWith('__MATH_BLOCK__') && content.endsWith('__MATH_BLOCK__')) {
            return (
              <View key={node.key} style={{ marginVertical: 8, alignItems: 'center', width: '100%' }}>
                <Katex expression={content.replace(/__MATH_BLOCK__/g, '')} />
              </View>
            );
          }
          if (content.startsWith('__MATH_INLINE__') && content.endsWith('__MATH_INLINE__')) {
            return <Katex key={node.key} expression={content.replace(/__MATH_INLINE__/g, '')} />;
          }
          return (
            <Text key={node.key} style={styles.code_inline}>
              {content}
            </Text>
          );
        }
      }}
      style={{
        body: { fontFamily: 'Assistant', fontSize: 15, color: '#1E293B', lineHeight: 24 },
        heading1: { fontFamily: 'AssistantBold', fontSize: 20, marginTop: 12, marginBottom: 6 },
        heading2: { fontFamily: 'AssistantBold', fontSize: 18, marginTop: 10, marginBottom: 6 },
        heading3: { fontFamily: 'AssistantBold', fontSize: 16, marginTop: 8, marginBottom: 6 },
        paragraph: { marginVertical: 6 },
        list_item: { marginVertical: 4 },
        code_inline: { backgroundColor: '#F1F5F9', borderRadius: 4, padding: 2, fontFamily: 'monospace' },
        code_block: { backgroundColor: '#1E293B', borderRadius: 8, padding: 12, color: '#F8FAFC', marginVertical: 10, fontFamily: 'monospace' },
      }}
    >
      {processMath(content || '')}
    </Markdown>
  );
});

export default MarkdownRenderer;
