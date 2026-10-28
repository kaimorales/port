"""Check the navigation and assets of the site without JavaScript or dependencies."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, file):
        super().__init__(convert_charrefs=True)
        self.refs, self.ids, self.headings, self.main_links = [], set(), [], []
        self.main_text, self.main_count, self.in_main = [], 0, False
        self.lang = None
        self.feed(file.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html':
            self.lang = attrs.get('lang')
        if tag == 'main':
            self.main_count += 1
            self.in_main = True
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'h1':
            self.headings.append(tag)
        for key in ('src', 'href'):
            if attrs.get(key):
                self.refs.append(attrs[key])
        if tag == 'a' and self.in_main and attrs.get('href'):
            self.main_links.append(attrs['href'])

    def handle_endtag(self, tag):
        if tag == 'main':
            self.in_main = False

    def handle_data(self, data):
        if self.in_main:
            self.main_text.append(data)


class SiteTests(unittest.TestCase):
    def test_home_opens_independent_sections(self):
        home = Page(ROOT / 'index.html')
        for name in ('projects', 'experience', 'about', 'contact'):
            with self.subTest(section=name):
                self.assertIn(f'{name}.html', home.main_links,
                              'Sections must open real pages without JavaScript')
                target = ROOT / f'{name}.html'
                self.assertTrue(target.is_file())
                section = Page(target)
                self.assertEqual(section.main_count, 1)
                self.assertGreater(len(' '.join(section.main_text).strip()), 40)

    def test_project_index_opens_six_detail_pages(self):
        index = Page(ROOT / 'projects.html')
        links = [link for link in index.main_links if link.startswith('projects/')]
        self.assertEqual(len(set(links)), 6)
        for link in links:
            with self.subTest(project=link):
                file = ROOT / link
                self.assertTrue(file.is_file())
                page = Page(file)
                self.assertGreater(len(' '.join(page.main_text)), 200)
                self.assertIn('../projects.html', page.refs)

    def test_every_local_link_and_asset_resolves(self):
        for file in ROOT.rglob('*.html'):
            for ref in Page(file).refs:
                url = urlsplit(ref)
                if url.scheme or url.netloc:
                    continue
                with self.subTest(page=str(file.relative_to(ROOT)), ref=ref):
                    target = (file.parent / unquote(url.path)).resolve() if url.path else file
                    if target.is_dir():
                        target /= 'index.html'
                    self.assertTrue(target.is_relative_to(ROOT), 'Local URLs must stay portable')
                    self.assertTrue(target.is_file(), f'Missing local target: {ref}')
                    if url.fragment and target.suffix == '.html':
                        self.assertIn(unquote(url.fragment), Page(target).ids)

    def test_every_page_has_a_single_named_main_view(self):
        for file in ROOT.rglob('*.html'):
            with self.subTest(page=str(file.relative_to(ROOT))):
                page = Page(file)
                self.assertEqual(page.lang, 'en')
                self.assertEqual(page.main_count, 1)
                self.assertEqual(len(page.headings), 1)


if __name__ == '__main__':
    unittest.main()
