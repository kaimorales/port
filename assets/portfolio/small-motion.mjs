// Reveal replies in reading order using ordinary, selectable text.
const activeReplies = new WeakMap();
const segmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const characters = text => segmenter
  ? Array.from(segmenter.segment(text), part => part.segment) : Array.from(text);

export function cancelReply(element) {
  activeReplies.get(element)?.();
}

export async function typeReply(element, text, { reducedMotion = false } = {}) {
  cancelReply(element);
  const content = document.createElement('div');
  content.dataset.replyContent = '';
  let total = 0;
  const paragraphs = String(text).split(/\n\s*\n/).map((paragraph, index) => {
    const p = document.createElement('p');
    p.style.margin = index ? '13px 0 0' : '0';
    p.hidden = index > 0;
    const node = document.createTextNode('');
    p.append(node);
    content.append(p);
    const letters = characters(paragraph);
    const part = { p, node, letters, start: total, shown: 0 };
    total += letters.length;
    return part;
  });
  element.replaceChildren(content);
  element.hidden = false;

  const reveal = count => {
    for (const part of paragraphs) {
      const shown = Math.min(part.letters.length, Math.max(0, count - part.start));
      if (shown <= part.shown) continue;
      part.p.hidden = false;
      part.node.appendData(part.letters.slice(part.shown, shown).join(''));
      part.shown = shown;
    }
  };
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (!total || reducedMotion || preference.matches || document.hidden) {
    reveal(total);
    return;
  }

  // Start immediately, then use elapsed time so frame rate never changes pace.
  reveal(1);
  const duration = Math.min(6000, (total - 1) * 12);
  await new Promise(resolve => {
    let frame = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      reveal(total);
      document.removeEventListener('visibilitychange', visibility);
      preference.removeEventListener('change', preferenceChange);
      if (activeReplies.get(element) === finish) activeReplies.delete(element);
      resolve();
    };
    const visibility = () => { if (document.hidden) finish(); };
    const preferenceChange = () => { if (preference.matches) finish(); };
    activeReplies.set(element, finish);
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', preferenceChange);
    const started = performance.now();
    const type = now => {
      if (!content.isConnected) { finish(); return; }
      const progress = duration ? Math.min(1, (now - started) / duration) : 1;
      reveal(1 + Math.floor(progress * (total - 1)));
      if (progress >= 1) finish();
      else frame = requestAnimationFrame(type);
    };
    frame = requestAnimationFrame(type);
  });
}
