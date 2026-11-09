/**
 * NXT Humans Design Tokens — Single Source of Truth
 * Import this module in any slide generator script.
 * Do NOT re-type hex values — always reference these constants.
 */

const COLORS = {
  BLACK: '0D0D0D',
  WHITE: 'FFFFFF',
  HEADING: '0D0D0D',
  BODY: '333333',
  SECONDARY: '666666',
  MUTED: '999999',
  SUBTLE: 'BBBBBB',
  RULE: 'E0E0E0',
  RULE_LIGHT: 'EEEEEE',
  PANEL: 'F5F5F0',
  CHARTREUSE: 'B8B800',
  CYAN: '00B7C3',
  TEAL_DEEP: '115054',
  RECOMMEND_BG: 'B8B800',
  RECOMMEND_TEXT: '0D0D0D',
  EVIDENCE_BG: 'E8F6F7',
  EVIDENCE_BORDER: '00B7C3',
  WARNING_BG: 'FFF8E1',
  WARNING_BORDER: 'B8B800',
  POSITIVE_BG: 'F0F8F0',
  POSITIVE_BORDER: '4CAF50',
  CRITICAL_BG: 'FFF0F0',
  CRITICAL_BORDER: 'CC3333',
};

const FONTS = {
  HEADLINE: 'Bebas Neue',
  BODY: 'Archivo',
  MONO: 'JetBrains Mono',
};

const TYPE_SCALE = {
  display: { size: 72, face: 'Bebas Neue' },
  h1:      { size: 36, face: 'Bebas Neue' },
  h2:      { size: 28, face: 'Bebas Neue' },
  h3:      { size: 18, face: 'Bebas Neue' },
  stat:    { size: 48, face: 'Bebas Neue' },
  lead:    { size: 14, face: 'Archivo', weight: 300 },
  base:    { size: 12, face: 'Archivo' },
  sm:      { size: 10, face: 'Archivo' },
  xs:      { size: 8,  face: 'Archivo' },
};

const SPACING = {
  MARGIN_X: 0.6,
  MARGIN_TOP: 0.5,
  CONTENT_W: 12.13,
  HALF_W: 5.87,
  GAP: 0.4,
  FOOTER_Y: 5.30,
  FOOTER_TEXT_Y: 5.40,
  SIDEBAR_W: 0.35,
  RULE_ACCENT_W: 0.8,
  RULE_ACCENT_H: 0.04,
  DOT_SIZE: 0.06,
  DOT_GAP: 0.04,
};

const SLIDE = {
  WIDTH: 13.33,
  HEIGHT: 7.5,
  LAYOUT: 'LAYOUT_WIDE',
};

// Color-block grid default fills
const QUAD_FILLS = {
  TL: { fill: COLORS.BLACK, text: COLORS.WHITE },
  TR: { fill: COLORS.CHARTREUSE, text: COLORS.BLACK },
  BL: { fill: COLORS.PANEL, text: COLORS.HEADING },
  BR: { fill: COLORS.TEAL_DEEP, text: COLORS.WHITE },
};

module.exports = { COLORS, FONTS, TYPE_SCALE, SPACING, SLIDE, QUAD_FILLS };
