from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_HTML = {
    "index.html", "categorias.html", "categoria.html", "ao-vivo.html",
    "live.html", "login.html", "registro.html", "recuperar-senha.html",
    "sobre.html", "perfil.html", "config-live.html", "sair.html",
}
FORBIDDEN = {
    "admin.html", "faq.html", "recursos.html", "robots.txt", "sitemap.xml",
    "site.webmanifest", "llms.txt", "google87f94d9d56cacf74.html", "favicon.svg",
}


class ReferenceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        key = "src" if tag in {"script", "img", "iframe"} else "href"
        if tag in {"a", "link", "script", "img", "iframe"} and values.get(key):
            self.references.append(values[key])


def local_target(source, reference):
    url = urlsplit(reference)
    if url.scheme or url.netloc or not url.path:
        return None
    path = url.path.lstrip("/")
    if not path:
        return ROOT / "index.html"
    candidate = ROOT / path if reference.startswith("/") else source.parent / path
    if not candidate.suffix:
        candidate = candidate.with_suffix(".html")
    return candidate


errors = []
html_files = {path.name for path in ROOT.glob("*.html")}
if html_files != EXPECTED_HTML:
    errors.append(f"HTML inesperado/ausente: {sorted(html_files ^ EXPECTED_HTML)}")

for name in FORBIDDEN:
    if (ROOT / name).exists():
        errors.append(f"Arquivo proibido ainda existe: {name}")

for html in sorted(ROOT.glob("*.html")):
    parser = ReferenceParser()
    parser.feed(html.read_text(encoding="utf-8"))
    for reference in parser.references:
        target = local_target(html, reference)
        if target and not target.exists():
            errors.append(f"{html.name}: referência local ausente: {reference}")

for css in (ROOT / "assets/css").glob("*.css"):
    for reference in re.findall(r"url\(['\"]?([^)'\"]+)", css.read_text(encoding="utf-8")):
        target = local_target(css, reference)
        if target and not target.exists():
            errors.append(f"{css.relative_to(ROOT)}: asset ausente: {reference}")

for javascript in (ROOT / "assets/js").glob("*.js"):
    result = subprocess.run(["node", "--check", str(javascript)], capture_output=True, text=True)
    if result.returncode:
        errors.append(result.stderr.strip())

runtime_text = "\n".join(
    path.read_text(encoding="utf-8")
    for pattern in ("*.html", "assets/js/*.js", "assets/css/*.css")
    for path in ROOT.glob(pattern)
)
for obsolete in ("faq.html", "admin.html", "recursos.html", "loja.html", "pagamento.html"):
    if obsolete in runtime_text:
        errors.append(f"Referência obsoleta encontrada: {obsolete}")

if errors:
    raise SystemExit("\n".join(errors))
print(f"PASS: {len(html_files)} telas, links locais, assets, sintaxe JS e escopo de arquivos")
