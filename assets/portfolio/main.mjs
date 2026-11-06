import { mountProjectArt } from './project-art.mjs';
import { typeReply, cancelReply } from './small-motion.mjs';
import { mountTreeMorph } from './tree/intro.mjs';
import { requestReply } from './chat/client.mjs';
import { CHAT_ENDPOINT } from '../chat/config.mjs';

const stage = document.querySelector('#stage');
const media = matchMedia('(prefers-reduced-motion: reduce)');
const template = route => document.querySelector(`template[data-route="${route}"]`);
const panels = new Map();
const animations = new Set();
let motion = !media.matches;
let current = '';
let section = '';
let art = null;
let activeProject = null;
let replyGeneration = 0;
let chatHistory = [];
let pending = null;
let panelSwap = null;

// Keep the identity, navigation, and footer mounted throughout the visit.
stage.append(template('').content.cloneNode(true));
const main = stage.querySelector('main');
const nav = stage.querySelector('.home-nav');
const footer = stage.querySelector('footer');
const conversation = stage.querySelector('.home-conversation');
const page = stage.querySelector('.home-page');
const anchor = document.createElement('div');
anchor.className = 'home-anchor';
const painting = main.querySelector('.home-painting-frame');
const introduction = main.querySelector('.home-introduction');
painting.before(anchor);
anchor.append(painting, introduction, conversation, footer);
const region = document.createElement('div');
region.className = 'content-region';
region.id = 'section-content';
main.append(region);
const emptyPanel = document.createElement('section');
emptyPanel.dataset.section = '';
region.append(emptyPanel);
panels.set('', emptyPanel);
const homeLink = document.createElement('a');
homeLink.href = '#/';
homeLink.textContent = 'home';
nav.prepend(homeLink);

for (const route of ['projects', 'experience', 'about', 'contact']) {
  const content = template(route).content.querySelector('main').cloneNode(true);
  content.querySelector('.back-nav')?.remove();
  const heading = content.querySelector('h1');
  heading.remove();
  const panel = document.createElement('section');
  panel.className = 'section-panel';
  panel.dataset.section = route;
  panel.setAttribute('aria-label', heading.textContent);
  const sectionHeading = document.createElement('h2');
  sectionHeading.className = 'section-heading';
  sectionHeading.textContent = heading.textContent;
  panel.append(sectionHeading);
  panel.hidden = true;
  panel.append(...content.childNodes);
  region.append(panel);
  panels.set(route, panel);
}

// Every project remains part of its original list, including its expanded body.
for (const link of panels.get('projects').querySelectorAll('.project-link')) {
  const route = link.getAttribute('href').slice(2);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'project-link';
  button.dataset.project = route;
  button.append(...link.childNodes);
  button.setAttribute('aria-expanded', 'false');
  const detail = document.createElement('div');
  detail.className = 'project-detail';
  detail.id = route.replace('/', '-');
  detail.hidden = true;
  button.setAttribute('aria-controls', detail.id);
  const content = template(route).content.querySelector('main').cloneNode(true);
  content.querySelector('.back-nav')?.remove();
  content.querySelector('h1')?.remove();
  const host = content.querySelector('#project-art');
  if (host) { host.removeAttribute('id'); host.className = 'project-art'; }
  const replay = content.querySelector('#replay-art');
  if (replay) { replay.removeAttribute('id'); replay.dataset.replay = ''; }
  detail.append(...content.childNodes);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close-project';
  close.textContent = 'close project ↑';
  close.dataset.close = route;
  detail.append(close);
  link.replaceWith(button);
  button.after(detail);
}

function animate(node, frames, options = {}) {
  if (!motion) return;
  const animation = node.animate(frames, { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)', ...options });
  animations.add(animation);
  const clean = () => animations.delete(animation);
  animation.addEventListener('finish', clean, { once: true });
  animation.addEventListener('cancel', clean, { once: true });
}
function clearPanelMotion(panel) {
  panel.style.removeProperty('opacity');
  panel.style.removeProperty('transform');
  panel.inert = false;
}
function finishPanelSwap() {
  if (!panelSwap) return;
  const swap = panelSwap;
  panelSwap = null;
  swap.animation?.cancel();
  for (const panel of panels.values()) {
    panel.hidden = panel !== panels.get(section);
    clearPanelMotion(panel);
  }
  region.style.removeProperty('min-height');
  region.removeAttribute('aria-busy');
  mountArt();
}
async function switchPanel(next) {
  const visible = [...panels.values()].find(panel => !panel.hidden);
  const opacity = getComputedStyle(visible).opacity;
  const transform = getComputedStyle(visible).transform;
  panelSwap?.animation?.cancel();
  const swap = { visible, animation: null };
  panelSwap = swap;
  visible.style.opacity = opacity;
  visible.style.transform = transform;

  // Reserve the taller page until the fade and scroll finish.
  const oldHeight = region.getBoundingClientRect().height;
  if (next !== visible) {
    Object.assign(next.style, { position: 'absolute', visibility: 'hidden', width: '100%' });
    next.hidden = false;
    const nextHeight = next.getBoundingClientRect().height + parseFloat(getComputedStyle(region).paddingTop);
    next.hidden = true;
    for (const property of ['position', 'visibility', 'width']) next.style.removeProperty(property);
    region.style.minHeight = `${Math.max(oldHeight, nextHeight)}px`;
  }
  region.setAttribute('aria-busy', 'true');
  const play = async (panel, frames, options) => {
    swap.animation = panel.animate(frames, { fill: 'forwards', ...options });
    try { await swap.animation.finished; } catch { return false; }
    return panelSwap === swap;
  };
  if (next !== visible) {
    visible.inert = true;
    if (!await play(visible, [{ opacity }, { opacity: 0 }], { duration: 150, easing: 'ease-in' })) return;
    visible.hidden = true;
    clearPanelMotion(visible);
    swap.animation.cancel();
    art?.destroy();
    art = null;
    next.hidden = false;
    swap.visible = next;
    if (section === 'projects') mountArt();
    if (!await play(next, [
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' })) return;
  } else if (!await play(next, [
    { opacity, transform }, { opacity: 1, transform: 'none' }
  ], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' })) return;
  clearPanelMotion(next);
  swap.animation.cancel();
  panelSwap = null;
  region.style.removeProperty('min-height');
  region.removeAttribute('aria-busy');
}
function settle({ commitPanel = true } = {}) {
  for (const animation of animations) animation.finish();
  animations.clear();
  document.querySelectorAll('.outgoing-panel').forEach(node => node.remove());
  if (commitPanel) finishPanelSwap();
}
function positions() {
  const nodes = [...panels.get('projects').querySelectorAll('.project-list > li')];
  return new Map(nodes.filter(node => node.getClientRects().length).map(node => [node, node.getBoundingClientRect().top]));
}
function flow(before) {
  for (const [node, top] of before) {
    if (!node.getClientRects().length) continue;
    const dy = top - node.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) animate(node, [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }]);
  }
}
function mountArt() {
  if (panelSwap && panelSwap.visible !== panels.get('projects') && section === 'projects') return;
  art?.destroy();
  art = null;
  const host = activeProject?.querySelector('.project-art');
  if (section === 'projects' && host) art = mountProjectArt(host, { scene: host.dataset.scene, reducedMotion: !motion });
}
function showProject(route, { reveal = true } = {}) {
  if (activeProject?.id === route.replace('/', '-')) { if (!art) mountArt(); return; }
  const before = positions();
  if (activeProject) {
    activeProject.hidden = true;
    activeProject.previousElementSibling.setAttribute('aria-expanded', 'false');
  }
  activeProject = route.startsWith('projects/') ? document.getElementById(route.replace('/', '-')) : null;
  if (activeProject) {
    activeProject.hidden = false;
    activeProject.previousElementSibling.setAttribute('aria-expanded', 'true');
    if (reveal) animate(activeProject, [{ opacity: 0, transform: 'translateY(-8px)', clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0% 0)' }], { duration: 450 });
  }
  flow(before);
  mountArt();
}
function navigate(route, { historyMode = 'push', animateChange = motion, focusProject = false } = {}) {
  route = template(route) ? route : '';
  const nextSection = route.split('/')[0];
  const sectionChanged = nextSection !== section;
  const changed = route !== current;
  const oldAnchor = anchor.getBoundingClientRect();
  const betweenSections = animateChange && section && nextSection && sectionChanged;
  settle({ commitPanel: !betweenSections });
  if (nextSection !== section) {
    const previous = panels.get(section);
    const next = panels.get(nextSection);
    if (betweenSections) {
      section = nextSection;
      switchPanel(next);
    } else {
      if (animateChange && section) {
        const ghost = previous.cloneNode(true);
        ghost.classList.add('outgoing-panel');
        ghost.setAttribute('aria-hidden', 'true');
        ghost.inert = true;
        ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        const bounds = previous.getBoundingClientRect();
        Object.assign(ghost.style, { position: 'fixed', inset: 'auto', left: `${bounds.left}px`,
          top: `${bounds.top}px`, width: `${bounds.width}px`, zIndex: '1' });
        document.body.append(ghost);
        animate(ghost, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-in-out' });
        setTimeout(() => ghost.remove(), 280);
      }
      previous.hidden = true;
      next.hidden = false;
      section = nextSection;
      page.classList.toggle('is-open', Boolean(section));
      if (animateChange) {
        const newAnchor = anchor.getBoundingClientRect();
        const dx = oldAnchor.left - newAnchor.left;
        const dy = oldAnchor.top - newAnchor.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(oldAnchor.width - newAnchor.width) > 1) {
          animate(anchor, [
            { width: `${oldAnchor.width}px`, transform: `translate(${dx}px, ${dy}px)` },
            { width: `${newAnchor.width}px`, transform: 'translate(0, 0)' }
          ], { duration: 720, easing: 'cubic-bezier(.45,0,.2,1)' });
        }
        if (section) animate(next, [
          { opacity: 0, transform: 'translateX(10px)' },
          { opacity: 1, transform: 'translateX(0)' }
        ], { duration: 400, delay: 320, easing: 'ease-in-out', fill: 'backwards' });
      }
    }
    if (!betweenSections) {
      art?.destroy();
      art = null;
    }
  }
  if (section === 'projects') showProject(route, { reveal: animateChange });
  current = route;
  for (const link of nav.querySelectorAll('a[href^="#/"]')) {
    const selected = link.getAttribute('href') === `#/${section}`;
    if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  }
  document.title = `${section ? section[0].toUpperCase() + section.slice(1) + ' · ' : ''}Kai Morales`;
  if (historyMode && (changed || !location.hash)) history[historyMode === 'replace' ? 'replaceState' : 'pushState']({}, '', `#/${route}`);
  if (sectionChanged && historyMode !== 'replace') {
    const behavior = animateChange ? 'smooth' : 'instant';
    if (innerWidth <= 800 && section) region.scrollIntoView({ block: 'start', behavior });
    else if (scrollY > 8) scrollTo({ top: 0, behavior });
  }
  if (focusProject) activeProject?.previousElementSibling.focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  const project = event.target.closest('[data-project]');
  const close = event.target.closest('[data-close]');
  if (project || close) {
    const route = project?.dataset.project;
    const closing = close || route === current;
    const trigger = close ? close.closest('.project-detail').previousElementSibling : project;
    navigate(closing ? 'projects' : route);
    if (closing) trigger.focus({ preventScroll: true });
    // Keep a project title reachable when collapsing a long detail above it.
    const y = trigger.getBoundingClientRect().top;
    if (y < 65 || y > (closing ? innerHeight - 75 : innerHeight * .4)) trigger.scrollIntoView({ block: 'start', behavior: motion ? 'smooth' : 'instant' });
    return;
  }
  if (event.target.closest('[data-replay]')) { art?.replay(); return; }
  const link = event.target.closest('a[href^="#/"]');
  if (!link) return;
  event.preventDefault();
  navigate(link.getAttribute('href').slice(2));
});
addEventListener('popstate', () => navigate(location.hash.slice(2), { historyMode: null }));
addEventListener('resize', settle);
document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });

const form = conversation.querySelector('#question-form');
const input = conversation.querySelector('#question');
const answer = conversation.querySelector('#answer');
const reset = conversation.querySelector('#start-over');
const status = conversation.querySelector('#reply-status');
const send = form.querySelector('button');
function stopReply() {
  replyGeneration++;
  cancelReply(answer.querySelector('.answer-body'));
  answer.style.opacity = '';
  pending?.abort();
  pending = null;
  send.disabled = false;
  input.readOnly = false;
  answer.setAttribute('aria-busy', 'false');
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question || pending) return;
  const generation = ++replyGeneration;
  const controller = new AbortController();
  pending = controller;
  send.disabled = true;
  input.readOnly = true;
  reset.hidden = false;
  answer.setAttribute('aria-busy', 'true');
  status.textContent = 'Thinking…';
  try {
    const reply = await requestReply({ endpoint: CHAT_ENDPOINT, question, history: chatHistory, signal: controller.signal });
    if (generation !== replyGeneration) return;
    chatHistory.push({ role: 'user', content: question }, { role: 'assistant', content: reply });
    chatHistory = chatHistory.slice(-6);
    const asked = document.createElement('p');
    asked.className = 'answer-question';
    asked.textContent = question;
    const response = document.createElement('div');
    response.className = 'answer-body';
    answer.replaceChildren(asked, response);
    answer.hidden = false;
    answer.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    status.textContent = '';
    input.value = '';
    input.placeholder = 'ask a follow-up…';
    await typeReply(response, reply, { reducedMotion: !motion });
  } catch (error) {
    if (generation !== replyGeneration || error.name === 'AbortError') return;
    status.textContent = error.name === 'TimeoutError' ? 'That took too long. Please try again.' : error.message;
  } finally {
    if (pending === controller) {
      pending = null;
      send.disabled = false;
      input.readOnly = false;
      answer.setAttribute('aria-busy', 'false');
    }
  }
});
reset.addEventListener('click', () => {
  stopReply();
  chatHistory = [];
  answer.replaceChildren();
  answer.hidden = true;
  reset.hidden = true;
  status.textContent = '';
  input.value = '';
  input.placeholder = 'ask about me…';
  input.focus({ preventScroll: true });
});
media.addEventListener('change', () => { motion = !media.matches; cancelReply(answer.querySelector('.answer-body')); settle(); mountArt(); });
navigate(location.hash.startsWith('#/') ? location.hash.slice(2) : location.hash.slice(1), { historyMode: 'replace', animateChange: false });
mountTreeMorph();
