import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Colors from Material Ocean theme
const chalky = '#e2b86b'
const coral = '#f78c6c'
const cyan = '#80cbc4'
const invalid = '#ff5370'
const ivory = '#eeffff'
const stone = '#7e8a90'
const malibu = '#82aaff'
const sage = '#c3e88d'
const whiskey = '#ffcb6b'
const violet = '#c792ea'
const darkBackground = '#0F111A'
const highlightBackground = '#1F2233'
const background = '#0F111A'
const tooltipBackground = '#090B10'
const selection = '#1F2233'
const cursor = '#FFCC00'

// The editor theme styles
const materialOceanTheme = EditorView.theme({
  '&': {
    color: ivory,
    backgroundColor: background
  },
  '.cm-content': {
    caretColor: cursor
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: cursor
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: selection
  },
  '.cm-panels': {
    backgroundColor: darkBackground,
    color: ivory
  },
  '.cm-panels.cm-panels-top': {
    borderBottom: '2px solid black'
  },
  '.cm-panels.cm-panels-bottom': {
    borderTop: '2px solid black'
  },
  '.cm-searchMatch': {
    backgroundColor: '#72a1ff59',
    outline: '1px solid #457dff'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#6199ff2f'
  },
  '.cm-activeLine': {
    backgroundColor: highlightBackground
  },
  '.cm-selectionMatch': {
    backgroundColor: '#aafe661a'
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: '#bad0f847',
    outline: '1px solid #515a6b'
  },
  '.cm-gutters': {
    backgroundColor: background,
    color: stone,
    border: 'none'
  },
  '.cm-activeLineGutter': {
    backgroundColor: highlightBackground
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ddd'
  },
  '.cm-tooltip': {
    border: 'none',
    backgroundColor: tooltipBackground
  },
  '.cm-tooltip .cm-tooltip-arrow:before': {
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent'
  },
  '.cm-tooltip .cm-tooltip-arrow:after': {
    borderTopColor: tooltipBackground,
    borderBottomColor: tooltipBackground
  },
  '.cm-tooltip-autocomplete': {
    '& > ul > li[aria-selected]': {
      backgroundColor: highlightBackground,
      color: ivory
    }
  }
}, { dark: true })

// The highlighting style
const materialOceanHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: violet },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: cyan },
  { tag: [t.function(t.variableName), t.labelName], color: malibu },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: whiskey },
  { tag: [t.definition(t.name), t.separator], color: ivory },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: coral },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: cyan },
  { tag: [t.meta, t.comment], color: stone },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: stone, textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: coral },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: whiskey },
  { tag: [t.processingInstruction, t.string, t.inserted], color: sage },
  { tag: t.invalid, color: invalid }
])

// Complete theme creation
export const materialOcean = [
  materialOceanTheme,
  syntaxHighlighting(materialOceanHighlightStyle)
] 