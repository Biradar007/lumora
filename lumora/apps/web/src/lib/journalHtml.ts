const FONT_SIZE_LOOKUP: Record<string, string> = {
  '1': '12px',
  '2': '14px',
  '3': '16px',
  '4': '18px',
  '5': '22px',
  '6': '26px',
  '7': '32px',
};

const ALLOWED_INLINE_STYLES = new Set([
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
  'color',
  'line-height',
  'letter-spacing',
]);

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'span',
  'div',
]);

export function sanitizeJournalHtml(input: string): string {
  if (!input) {
    return '';
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  const body = doc.body;

  convertFontTags(body);

  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
  const nodesToRemove: Element[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Element;
    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      nodesToRemove.push(node);
      continue;
    }

    [...node.attributes].forEach((attr) => {
      if (attr.name === 'style') {
        const sanitizedStyle = attr.value
          .split(';')
          .map((rule) => rule.trim())
          .filter(Boolean)
          .map((rule) => {
            const [property, value] = rule.split(':').map((segment) => segment.trim());
            if (!property || !value) {
              return null;
            }
            if (!ALLOWED_INLINE_STYLES.has(property.toLowerCase())) {
              return null;
            }
            return `${property}: ${value}`;
          })
          .filter(Boolean)
          .join('; ');

        if (sanitizedStyle) {
          node.setAttribute('style', sanitizedStyle);
        } else {
          node.removeAttribute('style');
        }
        return;
      }

      node.removeAttribute(attr.name);
    });
  }

  nodesToRemove.forEach((node) => {
    const parent = node.parentNode;
    if (!parent) {
      return;
    }
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
  });

  return body.innerHTML.trim();
}

export function extractPlainText(input: string): string {
  if (!input) {
    return '';
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  return doc.body.textContent ?? '';
}

function convertFontTags(root: HTMLElement, fallbackSize?: string) {
  const { ownerDocument } = root;
  if (!ownerDocument) {
    return;
  }

  const fontNodes = root.querySelectorAll('font');
  fontNodes.forEach((fontNode) => {
    const span = ownerDocument.createElement('span');
    const face = fontNode.getAttribute('face');
    const sizeAttr = fontNode.getAttribute('size');
    const color = fontNode.getAttribute('color');

    if (face) {
      span.style.fontFamily = face;
    }
    const resolvedSize = sizeAttr ? FONT_SIZE_LOOKUP[sizeAttr] ?? fallbackSize : fallbackSize;
    if (resolvedSize) {
      span.style.fontSize = resolvedSize;
    }
    if (color) {
      span.style.color = color;
    }

    while (fontNode.firstChild) {
      span.appendChild(fontNode.firstChild);
    }
    fontNode.replaceWith(span);
  });
}
