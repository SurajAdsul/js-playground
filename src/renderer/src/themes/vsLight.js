import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Colors from Visual Studio Light theme
const blue = '#0000ff'
const darkBlue = '#000080'
const green = '#008000'
const darkGreen = '#2e8b57'
const red = '#a31515'
const darkRed = '#800000'
const magenta = '#af00db'
const gray = '#808080'
const black = '#000000'
const background = '#ffffff'
const selection = '#add6ff'
const cursor = '#000000'
const lineHighlight = '#f3f3f3'
const tooltipBackground = '#f3f3f3'

// The editor theme styles
const vsLightTheme = EditorView.theme({
  '&': {
    color: black,
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
    backgroundColor: background,
    color: black
  },
  '.cm-panels.cm-panels-top': {
    borderBottom: '1px solid #ddd'
  },
  '.cm-panels.cm-panels-bottom': {
    borderTop: '1px solid #ddd'
  },
  '.cm-searchMatch': {
    backgroundColor: '#ffff0054',
    outline: '1px solid #00000033'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#ffff0089'
  },
  '.cm-activeLine': {
    backgroundColor: lineHighlight
  },
  '.cm-selectionMatch': {
    backgroundColor: '#aafe661a'
  },
  '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: '#bad0f847',
    outline: '1px solid #33333333'
  },
  '.cm-gutters': {
    backgroundColor: background,
    color: gray,
    border: 'none',
    borderRight: '1px solid #e5e5e5'
  },
  '.cm-activeLineGutter': {
    backgroundColor: lineHighlight
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ddd'
  },
  '.cm-tooltip': {
    border: '1px solid #ddd',
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
      backgroundColor: selection,
      color: black
    }
  }
}, { dark: false })

// The highlighting style
const vsLightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: blue },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: black },
  { tag: [t.propertyName], color: darkBlue },
  { tag: [t.function(t.variableName), t.labelName], color: darkBlue },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: darkBlue },
  { tag: [t.definition(t.name), t.separator], color: black },
  { tag: [t.typeName, t.className, t.namespace], color: darkGreen },
  { tag: [t.number], color: darkRed },
  { tag: [t.changed, t.annotation, t.modifier, t.self], color: magenta },
  { tag: [t.operator, t.operatorKeyword], color: black },
  { tag: [t.url, t.escape, t.regexp, t.link], color: darkRed },
  { tag: [t.meta, t.comment], color: green },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: gray, textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: darkBlue },
  { tag: [t.atom, t.bool], color: darkBlue },
  { tag: [t.processingInstruction, t.string, t.inserted], color: red },
  { tag: t.invalid, color: red }
])

// Complete theme creation
export const vsLight = [
  vsLightTheme,
  syntaxHighlighting(vsLightHighlightStyle)
] 