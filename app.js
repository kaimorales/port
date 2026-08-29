// quiet scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.06, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// hairline under the nav once you scroll
const bar = document.querySelector('.topbar');
if (bar) {
  const onScroll = () => bar.classList.toggle('stuck', window.scrollY > 4);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// mark the nav link for whichever section you're in
const spy = document.querySelector('#spy');
if (spy) {
  const links = [...spy.querySelectorAll('a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  if (sections.length) {
    const setActive = () => {
      const line = window.scrollY + window.innerHeight * 0.35;
      let current = null;
      sections.forEach((sec) => { if (sec.offsetTop <= line) current = sec; });
      links.forEach((a) => {
        a.classList.toggle('active', current && a.getAttribute('href') === '#' + current.id);
      });
    };
    setActive();
    window.addEventListener('scroll', setActive, { passive: true });
    window.addEventListener('resize', setActive);
  }
}
