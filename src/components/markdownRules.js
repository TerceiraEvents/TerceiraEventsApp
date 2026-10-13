import React from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import Text from './Text';

const childrenRule = (type) => function MarkdownChildren(node, children, parent, styles, inherited = {}) { return <Text key={node.key} style={[inherited, styles[type]]}>{children}</Text>; };
const contentRule = (type, trim = false) => function MarkdownContent(node, children, parent, styles, inherited = {}) { return <Text key={node.key} style={[inherited, styles[type]]}>{trim ? node.content.replace(/\n$/, '') : node.content}</Text>; };

/** Uses shared Text for Markdown spans, code, breaks, links and list markers. */
export const markdownRules = {
  ...Object.fromEntries(['strong', 'em', 's', 'textgroup', 'inline', 'span'].map((type) => [type, childrenRule(type)])),
  text: contentRule('text'),
  code_inline: contentRule('code_inline'),
  code_block: contentRule('code_block', true),
  fence: contentRule('fence', true),
  hardbreak: (node, children, parent, styles) => <Text key={node.key} style={styles.hardbreak}>{'\n'}</Text>,
  softbreak: (node, children, parent, styles) => <Text key={node.key} style={styles.softbreak}>{'\n'}</Text>,
  link: (node, children, parent, styles, onLinkPress) => <Text key={node.key} style={styles.link} accessibilityRole="link" onPress={() => { if (!onLinkPress || onLinkPress(node.attributes.href) !== false) Linking.openURL(node.attributes.href); }}>{children}</Text>,
  list_item: (node, children, parent, styles, inherited = {}) => {
    const list = parent.find((entry) => ['ordered_list', 'bullet_list'].includes(entry.type));
    const ordered = list?.type === 'ordered_list' ? list : null;
    const bullet = list?.type === 'bullet_list';
    const type = ordered ? 'ordered_list' : 'bullet_list';
    const marker = ordered ? `${(ordered.attributes?.start ?? 1) + node.index}${node.markup || ''}` : '•';
    const style = StyleSheet.flatten(styles.list_item) || {};
    const textFields = ['fontSize', 'lineHeight', 'fontWeight', 'fontFamily', 'fontStyle', 'fontVariant', 'color', 'letterSpacing', 'textAlign', 'textTransform', 'textDecorationLine', 'textDecorationColor', 'textDecorationStyle', 'textShadowColor', 'textShadowOffset', 'textShadowRadius', 'includeFontPadding', 'writingDirection'];
    const markerStyle = Object.fromEntries(Object.entries(style).filter(([key]) => textFields.includes(key)));
    const inheritedText = Object.fromEntries(Object.entries(StyleSheet.flatten(inherited) || {}).filter(([key]) => textFields.includes(key)));
    const viewStyle = Object.fromEntries(Object.entries(style).filter(([key]) => !textFields.includes(key)));
    return <View key={node.key} style={[viewStyle, { flexDirection: 'row', alignItems: 'flex-start' }]}>{(ordered || bullet) && <Text accessible={Boolean(ordered)} style={[inheritedText, markerStyle, styles[`${type}_icon`]]}>{marker}</Text>}<View style={styles[`${type}_content`]}>{children}</View></View>;
  },
};
