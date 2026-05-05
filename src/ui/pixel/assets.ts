const sliceRoot = '../../assets/pixel-ui2/slices';
const transparentRoot = '../../assets/pixel-ui2/transparent';
const derivedRoot = '../../assets/pixel-ui2/derived';

const uiSheet = '6c2a8a89-9ee9-4a85-a993-0d6df3e0741c';
const badgeSheet = '4994b3f3-1640-4ed1-91e7-11bd43e4d06a';
const objectSheet = '22bf844f-bbfd-4913-a940-4f654a34fb3d';
const characterSheet = '61eaae55-91a6-4bd3-9590-3dc7f8b7e44e';

function slice(sheet: string, index: number) {
  const file = `${sheet}-${String(index).padStart(3, '0')}.png`;
  return new URL(`${sliceRoot}/${sheet}/${file}`, import.meta.url).href;
}

function sheet(name: string) {
  return new URL(`${transparentRoot}/${name}.png`, import.meta.url).href;
}

function derived(file: string) {
  return new URL(`${derivedRoot}/${file}`, import.meta.url).href;
}

function panelParts(
  name: string,
  border: { top: number; right: number; bottom: number; left: number },
  ornamentLayout: { width: number; height: number; top: string; right: string; left: string; transform: string },
) {
  const root = `panel/${name}`;
  return {
    topLeft: derived(`${root}/top-left.png`),
    top: derived(`${root}/top.png`),
    topRight: derived(`${root}/top-right.png`),
    right: derived(`${root}/right.png`),
    bottomRight: derived(`${root}/bottom-right.png`),
    bottom: derived(`${root}/bottom.png`),
    bottomLeft: derived(`${root}/bottom-left.png`),
    left: derived(`${root}/left.png`),
    ornament: derived(`${root}/ornament.png`),
    center: derived(`${root}/center.png`),
    nineSlice: derived(`${root}/nine-slice.png`),
    border,
    ornamentLayout,
  };
}

function controlParts(name: string, metrics: { left: number; middle: number; right: number; height: number }) {
  const root = `control/${name}`;
  return {
    left: derived(`${root}/left.png`),
    middle: derived(`${root}/middle.png`),
    right: derived(`${root}/right.png`),
    metrics,
  };
}

export const pixelUi2Assets = {
  sheets: {
    controls: sheet(uiSheet),
    badgesAndMascot: sheet(badgeSheet),
    objectsAndIcons: sheet(objectSheet),
    characterStates: sheet(characterSheet),
  },
  frame: {
    darkPanel: slice(uiSheet, 1),
    parchmentPanel: slice(uiSheet, 2),
    insetPanel: slice(uiSheet, 3),
    titlePanel: slice(uiSheet, 5),
    reviewPanel: slice(uiSheet, 10),
    notePanel: slice(uiSheet, 11),
    compactDark: slice(uiSheet, 12),
    compactParchment: slice(uiSheet, 17),
    command: slice(uiSheet, 43),
    divider: slice(uiSheet, 69),
    thinDivider: slice(uiSheet, 70),
  },
  part: {
    panel: {
      dark: panelParts(
        'dark',
        { top: 30, right: 32, bottom: 24, left: 31 },
        { width: 46, height: 29, top: '-6px', right: 'auto', left: '50%', transform: 'translate(-50%, -50%)' },
      ),
      parchment: panelParts(
        'parchment',
        { top: 32, right: 33, bottom: 27, left: 33 },
        { width: 58, height: 27, top: '-6px', right: 'auto', left: '50%', transform: 'translate(-50%, -50%)' },
      ),
      inset: panelParts(
        'inset',
        { top: 28, right: 33, bottom: 28, left: 33 },
        { width: 68, height: 26, top: '-6px', right: 'auto', left: '50%', transform: 'translate(-50%, -50%)' },
      ),
      review: panelParts(
        'review',
        { top: 29, right: 27, bottom: 29, left: 30 },
        { width: 44, height: 44, top: '-5px', right: 'auto', left: '50%', transform: 'translate(-50%, -50%)' },
      ),
      note: panelParts(
        'note',
        { top: 31, right: 30, bottom: 31, left: 30 },
        { width: 36, height: 55, top: '50%', right: '-4px', left: 'auto', transform: 'translate(50%, -50%)' },
      ),
    },
    control: {
      primary: controlParts('primary', { left: 24, middle: 13, right: 24, height: 45 }),
      secondary: controlParts('secondary', { left: 24, middle: 13, right: 24, height: 45 }),
      success: controlParts('success', { left: 24, middle: 13, right: 24, height: 45 }),
      danger: controlParts('danger', { left: 24, middle: 12, right: 24, height: 45 }),
      ghost: controlParts('ghost', { left: 24, middle: 13, right: 24, height: 45 }),
      badgeIdle: controlParts('badgeIdle', { left: 16, middle: 7, right: 16, height: 36 }),
      badgeRunning: controlParts('badgeRunning', { left: 22, middle: 13, right: 22, height: 45 }),
      badgeReview: controlParts('badgeReview', { left: 16, middle: 6, right: 16, height: 36 }),
      badgeSuccess: controlParts('badgeSuccess', { left: 22, middle: 13, right: 22, height: 45 }),
      badgeWarning: controlParts('badgeWarning', { left: 22, middle: 13, right: 22, height: 45 }),
      badgeError: controlParts('badgeError', { left: 22, middle: 12, right: 22, height: 45 }),
      chip: controlParts('chip', { left: 16, middle: 7, right: 16, height: 43 }),
      command: controlParts('command', { left: 24, middle: 13, right: 24, height: 45 }),
      select: controlParts('select', { left: 24, middle: 13, right: 24, height: 45 }),
    },
  },
  button: {
    primary: slice(uiSheet, 29),
    secondary: slice(uiSheet, 30),
    success: slice(uiSheet, 31),
    danger: slice(uiSheet, 32),
    ghost: slice(uiSheet, 34),
    ghostWide: slice(uiSheet, 35),
    icon: slice(uiSheet, 39),
  },
  input: {
    command: slice(uiSheet, 44),
    select: slice(uiSheet, 45),
    textarea: slice(uiSheet, 7),
    search: slice(uiSheet, 44),
  },
  badge: {
    idle: slice(uiSheet, 34),
    running: slice(uiSheet, 30),
    review: slice(uiSheet, 38),
    success: slice(uiSheet, 31),
    warning: slice(uiSheet, 29),
    error: slice(uiSheet, 32),
    chip: slice(uiSheet, 46),
  },
  icon: {
    guildHall: slice(objectSheet, 1),
    questBoard: slice(objectSheet, 2),
    review: slice(objectSheet, 16),
    quest: slice(objectSheet, 8),
    questLog: slice(objectSheet, 5),
    report: slice(objectSheet, 12),
    companion: slice(objectSheet, 7),
    settings: slice(objectSheet, 6),
    diagnostics: slice(objectSheet, 4),
    bridgeReal: slice(objectSheet, 17),
    bridgeMock: slice(objectSheet, 34),
    bridgeAuto: slice(objectSheet, 59),
    hermesAvailable: slice(objectSheet, 9),
    hermesUnavailable: slice(objectSheet, 18),
    noFallback: slice(objectSheet, 29),
    returned: slice(objectSheet, 23),
    approved: slice(objectSheet, 16),
    revise: slice(objectSheet, 15),
    error: slice(objectSheet, 22),
    warning: slice(objectSheet, 22),
    search: slice(objectSheet, 45),
    close: slice(objectSheet, 47),
    minimize: slice(objectSheet, 37),
    maximize: slice(objectSheet, 49),
    dropdownArrow: slice(objectSheet, 35),
    chevron: slice(objectSheet, 41),
    plus: slice(objectSheet, 43),
    send: slice(objectSheet, 40),
    document: slice(objectSheet, 19),
    scroll: slice(objectSheet, 13),
    seal: slice(objectSheet, 20),
    featherPen: slice(objectSheet, 21),
    spark: slice(objectSheet, 51),
    marker: slice(uiSheet, 68),
    rune: slice(uiSheet, 75),
  },
  avatar: {
    idle: slice(characterSheet, 1),
    thinking: slice(characterSheet, 6),
    running: slice(characterSheet, 4),
    needsReview: slice(characterSheet, 3),
    error: slice(characterSheet, 7),
    approved: slice(characterSheet, 8),
  },
  mascot: {
    idle: slice(badgeSheet, 37),
    running: slice(badgeSheet, 40),
    needsReview: slice(badgeSheet, 38),
    error: slice(badgeSheet, 39),
  },
  ornament: {
    corner: slice(uiSheet, 65),
    goldGem: slice(uiSheet, 75),
    blueGem: slice(uiSheet, 76),
    greenGem: slice(uiSheet, 77),
    redGem: slice(uiSheet, 78),
    purpleGem: slice(uiSheet, 79),
  },
} as const;

export type PixelUi2Assets = typeof pixelUi2Assets;
