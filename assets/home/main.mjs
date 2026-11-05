import { requestReply } from '../chat/client.mjs';
import { CHAT_ENDPOINT } from '../chat/config.mjs';

const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
const endpoint = local ? '/api/chat' : CHAT_ENDPOINT;
const form = document.querySelector('#question-form');
const input = document.querySelector('#question');
const send = form.querySelector('button');
const answer = document.querySelector('#answer');
const status = document.querySelector('#reply-status');
const reset = document.querySelector('#start-over');
let history = [], pending = null;

function busy(value) {
  send.disabled = value;
  input.readOnly = value;
  answer.setAttribute('aria-busy', String(value));
}
function renderAnswer(question, text) {
  answer.replaceChildren();
  const heading = document.createElement('p');
  heading.className = 'answer-question';
  heading.textContent = question;
  answer.append(heading);
  for (const paragraph of text.split(/\n\s*\n/)) {
    const p = document.createElement('p');
    p.className = 'answer-text';
    p.textContent = paragraph;
    answer.append(p);
  }
  answer.hidden = false;
}
async function ask(question) {
  const text = question.trim();
  if (!text || pending) return;
  const controller = new AbortController();
  pending = controller;
  reset.hidden = false;
  status.textContent = 'Thinking…';
  busy(true);
  try {
    const reply = await requestReply({ endpoint, question: text, history, signal: controller.signal });
    if (pending !== controller) return;
    renderAnswer(text, reply);
    history.push({role:'user',content:text}, {role:'assistant',content:reply});
    history = history.slice(-6);
    input.value = '';
    input.placeholder = 'Ask a follow-up…';
    status.textContent = '';
  } catch (error) {
    if (pending !== controller || error.name === 'AbortError') return;
    status.textContent = error.name === 'TimeoutError'
      ? 'That took too long. Please try again.' : error.message;
  } finally {
    if (pending === controller) { pending = null; busy(false); }
  }
}
form.addEventListener('submit', event => { event.preventDefault(); ask(input.value); });
reset.addEventListener('click', () => {
  pending?.abort();
  pending = null;
  history = [];
  busy(false);
  answer.replaceChildren();
  answer.hidden = true;
  status.textContent = '';
  reset.hidden = true;
  input.value = '';
  input.placeholder = 'Ask about me…';
  input.focus({preventScroll:true});
});

import('../tree/intro.mjs').then(({ mountTreeMorph }) => mountTreeMorph())
  .catch(() => document.documentElement.classList.remove('morph-pending'));
