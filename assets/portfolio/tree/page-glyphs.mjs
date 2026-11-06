// Sample the real local page layout, including text wrapping and the painting.
// No screenshot service, DOM replacement, remote assets, or extra library.
const RAMP = ' .,:;+=ox%#@';
function font(style) {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

function hiddenInDisclosure(element) {
  // A closed details body can still have nonzero Range bounds. Only its own
  // summary is visible, and an outer closed disclosure can hide that too.
  let closed = element.closest('details:not([open])');
  while (closed) {
    if (!closed.querySelector(':scope > summary')?.contains(element)) return true;
    closed = closed.parentElement?.closest('details:not([open])');
  }
  return false;
}

export async function pageGlyphs(page, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const painting = page.querySelector('.home-painting');
  if (painting && !painting.complete) {
    await Promise.race([painting.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 500))]);
  }
  if (painting?.naturalWidth) {
    const rect = painting.getBoundingClientRect();
    const crop = painting.closest('.home-painting-frame')?.getBoundingClientRect() || rect;
    const scale = Math.max(rect.width / painting.naturalWidth, rect.height / painting.naturalHeight);
    const dw = painting.naturalWidth * scale, dh = painting.naturalHeight * scale;
    ctx.save();
    ctx.beginPath(); ctx.rect(crop.x, crop.y, crop.width, crop.height); ctx.clip();
    ctx.drawImage(painting, rect.x + (rect.width - dw) * .5, rect.y + (rect.height - dh), dw, dh);
    ctx.restore();
  }
  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let node;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!node.textContent.trim() || parent.closest('[hidden], .visually-hidden, noscript, script, svg')) continue;
    if (hiddenInDisclosure(parent)) continue;
    const style = getComputedStyle(parent);
    if (style.visibility !== 'visible' || style.display === 'none') continue;
    ctx.font = font(style);
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'alphabetic';
    let offset = 0;
    for (const char of node.textContent) {
      range.setStart(node, offset);
      offset += char.length;
      range.setEnd(node, offset);
      const rect = range.getBoundingClientRect();
      if (!char.trim() || !rect.width || rect.bottom < 0 || rect.top > height) continue;
      const metrics = ctx.measureText(char);
      const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8;
      const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2;
      const baseline = rect.top + (rect.height - ascent - descent) / 2 + ascent;
      ctx.fillText(char, rect.left, baseline);
    }
  }
  for (const link of page.querySelectorAll('.home-nav a')) {
    if (!link.getClientRects().length || link.closest('[hidden]') || hiddenInDisclosure(link)) continue;
    const style = getComputedStyle(link), rect = link.getBoundingClientRect();
    ctx.fillStyle = style.textDecorationColor;
    ctx.fillRect(rect.left, rect.top + rect.height / 2 + parseFloat(style.fontSize) * .5 + 3, rect.width, .7);
  }
  const input = page.querySelector('#question');
  if (input) {
    const rect = input.getBoundingClientRect(), style = getComputedStyle(input);
    ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.width, rect.height); ctx.clip();
    ctx.font = font(style);
    ctx.fillStyle = input.value ? style.color : getComputedStyle(input, '::placeholder').color;
    ctx.textBaseline = 'middle';
    ctx.fillText(input.value || input.placeholder, rect.left + parseFloat(style.paddingLeft), rect.top + rect.height / 2);
    ctx.restore();
    const lineElement = page.querySelector('.question-line');
    const line = lineElement.getBoundingClientRect(), lineStyle = getComputedStyle(lineElement);
    const thickness = parseFloat(lineStyle.borderBottomWidth) || 0;
    ctx.fillStyle = lineStyle.borderBottomColor;
    ctx.fillRect(line.left, line.bottom - thickness, line.width, thickness);
  }
  await Promise.all([...page.querySelectorAll('svg')].map(async svg => {
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height || svg.closest('[hidden]') || hiddenInDisclosure(svg)) return;
    const copy = svg.cloneNode(true), style = getComputedStyle(svg);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', rect.width); copy.setAttribute('height', rect.height);
    copy.style.color = style.color;
    copy.style.fill = style.fill;
    copy.style.stroke = style.stroke;
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
    try { await image.decode(); ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height); } catch { /* Decorative icon only. */ }
  }));
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const glyphs = [], stepX = 3.5, stepY = 4.5;
  for (let y = 2; y < height; y += stepY) {
    for (let x = 2; x < width; x += stepX) {
      const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
      const alpha = pixels[index + 3] / 255;
      if (alpha < .12) continue;
      const color = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const brightness = (color[0] * .2126 + color[1] * .7152 + color[2] * .0722) / 255;
      const density = Math.min(1, (1 - brightness) * 1.4);
      glyphs.push({ x, y, color, alpha, size: 5.5, char: RAMP[Math.max(1, Math.round(density * (RAMP.length - 1)))] });
    }
  }
  return glyphs;
}
