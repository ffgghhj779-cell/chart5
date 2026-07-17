// All canvas colour values in one place
export const COLORS = {
  // Candle bodies + wicks
  bull:       '#26a69a',
  bear:       '#ef5350',
  bullVol:    'rgba(38,166,154,.76)',
  bearVol:    'rgba(255,112,67,.76)',

  // Grid / axes
  grid:       'rgba(0,0,0,.048)',
  gridStrong: 'rgba(0,0,0,.08)',
  axisTxt:    'rgba(55,55,55,.72)',
  crosshair:  'rgba(80,80,150,.35)',

  // Profile cluster base colours (as [r,g,b] for alpha compositing)
  upper: [91,  155, 213],   // blue
  lower: [38,  166, 154],   // teal/green
  poc:   [255, 152,   0],   // orange

  // Horizontal liquidity lines
  pocLine:  'rgba(255,152,0,.96)',
  vahLine:  'rgba(255,152,0,.55)',
  valLine:  'rgba(38,166,154,.65)',
  vaFill:   'rgba(41,98,255,.04)',

  // Background gradient
  bg0: '#fffde6',
  bg1: '#fff8a8',
  bg2: '#fffccc',
};
