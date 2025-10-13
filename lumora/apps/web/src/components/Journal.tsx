'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, PenLine, Bold, Italic, List, ListOrdered, Type, MinusCircle } from 'lucide-react';
import { useApiHeaders } from '@/hooks/useApiHeaders';
import type { JournalEntry } from '@/types/domain';

const FONT_FAMILY_OPTIONS = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Merriweather', value: '"Merriweather", serif' },
  { label: 'Source Sans', value: '"Source Sans Pro", sans-serif' },
  { label: 'Mono', value: '"Fira Code", monospace' },
] as const;

const FONT_SIZE_OPTIONS = [
  { label: 'Small', value: '14px' },
  { label: 'Normal', value: '16px' },
  { label: 'Large', value: '18px' },
  { label: 'Extra Large', value: '22px' },
] as const;

const FONT_SIZE_COMMAND_MAP: Record<string, string> = {
  '14px': '2',
  '16px': '3',
  '18px': '4',
  '22px': '5',
};

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

interface JournalErrorState {
  fetch?: string;
  submit?: string;
}

export function Journal() {
  const headers = useApiHeaders();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>(FONT_FAMILY_OPTIONS[0].value);
  const [selectedFontSize, setSelectedFontSize] = useState<string>(FONT_SIZE_OPTIONS[1].value);
  const [errors, setErrors] = useState<JournalErrorState>({});
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);

  const hasUser = useMemo(() => Boolean(headers['x-user-id']), [headers]);
  const editorIsEmpty = useMemo(() => extractPlainText(content).trim().length === 0, [content]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch (error) {
      console.warn('Rich text commands are not fully supported in this browser.', error);
    }
  }, []);

  const captureSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      return;
    }
    selectionRef.current = range.cloneRange();
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = selectionRef.current;
    if (!editor || !selection || !range) {
      return;
    }
    editor.focus();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      captureSelection();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    if (editor.innerHTML !== content) {
      editor.innerHTML = content;
    }
  }, [content]);

  useEffect(() => {
    if (!hasUser) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/journals', { headers, cache: 'no-store' });
        if (!response.ok) {
          if (response.status === 401) {
            setEntries([]);
            setErrors((prev) => ({
              ...prev,
              fetch: 'Log in to view your saved journal entries.',
            }));
            return;
          }
          if (response.status === 403) {
            setEntries([]);
            setErrors((prev) => ({
              ...prev,
              fetch: 'Your account does not have access to the journal feature.',
            }));
            return;
          }
          const responseText = await response.text().catch(() => '');
          console.warn('Failed to load journal entries', { status: response.status, responseText });
          setEntries([]);
          setErrors((prev) => ({
            ...prev,
            fetch: 'We could not load your journal right now. Please try again shortly.',
          }));
          return;
        }
        const data = (await response.json()) as { entries: JournalEntry[] };
        setEntries((data.entries ?? []).sort((a, b) => b.createdAt - a.createdAt));
        setErrors((prev) => ({ ...prev, fetch: undefined }));
      } catch (error) {
        console.error('Unexpected error while loading journal entries', error);
        setErrors((prev) => ({
          ...prev,
          fetch: 'We could not load your journal right now. Please try again shortly.',
        }));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [headers, hasUser]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const editor = editorRef.current;
    const rawHtml = editor?.innerHTML ?? '';
    const sanitizedHtml = sanitizeHtml(rawHtml);
    const plainText = extractPlainText(sanitizedHtml);

    if (!plainText.trim()) {
      setErrors((prev) => ({
        ...prev,
        submit: 'Write a few thoughts before saving.',
      }));
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/journals', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: sanitizedHtml }),
      });
      if (!response.ok) {
        throw new Error('Failed to save journal entry.');
      }
      const data = (await response.json()) as { entry: JournalEntry };
      setEntries((prev) => [data.entry, ...prev]);
      if (editor) {
        editor.innerHTML = '';
      }
      setContent('');
      selectionRef.current = null;
      setErrors((prev) => ({ ...prev, submit: undefined }));
    } catch (error) {
      console.error(error);
      setErrors((prev) => ({
        ...prev,
        submit: 'We could not save this entry. Please try again.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const applyFormatting = (format: 'bold' | 'italic' | 'heading' | 'unorderedList' | 'orderedList') => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    restoreSelection();
    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    expandSelectionIfCollapsed(selection, editor);
    if (format === 'bold') {
      document.execCommand('bold');
    } else if (format === 'italic') {
      document.execCommand('italic');
    } else if (format === 'heading') {
      document.execCommand('styleWithCSS', false, 'false');
      const applied =
        document.execCommand('formatBlock', false, 'H2') ||
        document.execCommand('formatBlock', false, 'h2') ||
        document.execCommand('formatBlock', false, '<h2>');
      document.execCommand('styleWithCSS', false, 'true');
      if (!applied) {
        wrapSelectionWithHeading(selection, editor);
      }
    } else if (format === 'unorderedList') {
      document.execCommand('styleWithCSS', false, 'false');
      if (!document.execCommand('insertUnorderedList')) {
        toggleList(selection, editor, 'ul');
      }
      document.execCommand('styleWithCSS', false, 'true');
    } else if (format === 'orderedList') {
      document.execCommand('styleWithCSS', false, 'false');
      if (!document.execCommand('insertOrderedList')) {
        toggleList(selection, editor, 'ol');
      }
      document.execCommand('styleWithCSS', false, 'true');
    }
    setContent(editor.innerHTML);
    captureSelection();
  };
  const clearFormatting = () => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreSelection();
    document.execCommand('removeFormat');
    document.execCommand('formatBlock', false, '<p>');
    setContent(editor.innerHTML);
    captureSelection();
  };

  const applyFontFamily = (fontFamily: string) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    restoreSelection();
    editor.focus();
    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontName', false, fontFamily);
      convertFontTags(editor);
      setSelectedFontFamily(fontFamily);
      setContent(editor.innerHTML);
      captureSelection();
    } catch (error) {
      console.warn('Unable to apply font family.', error);
    }
  };

  const applyFontSize = (fontSize: string) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const commandValue = FONT_SIZE_COMMAND_MAP[fontSize];
    if (!commandValue) {
      return;
    }
    restoreSelection();
    editor.focus();
    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('fontSize', false, commandValue);
      convertFontTags(editor, fontSize);
      setSelectedFontSize(fontSize);
      setContent(editor.innerHTML);
      captureSelection();
    } catch (error) {
      console.warn('Unable to apply font size.', error);
    }
  };

  if (!hasUser) {
    return (
      <div className="px-6 py-8">
        <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Log in to start journaling with Lumora.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-indigo-50 p-2">
            <PenLine className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Daily Journal</h1>
            <p className="text-sm text-slate-600">
              Capture how you&apos;re feeling, reflect on your day, and build a mindful habit.
            </p>
          </div>
        </div>
      </div>

      <form
        className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formatting</span>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedFontFamily}
              onChange={(event) => applyFontFamily(event.target.value)}
              aria-label="Font family"
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {FONT_FAMILY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={selectedFontSize}
              onChange={(event) => applyFontSize(event.target.value)}
              aria-label="Font size"
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              {FONT_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormatting('heading')}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <Type className="h-3 w-3" />
              Heading
            </button> */}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormatting('bold')}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <Bold className="h-3 w-3" />
              Bold
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormatting('italic')}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <Italic className="h-3 w-3" />
              Italic
            </button>
            {/* <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormatting('unorderedList')}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <List className="h-3 w-3" />
              Bullets
            </button>
             <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormatting('orderedList')}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <ListOrdered className="h-3 w-3" />
              Numbers
            </button> */}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={clearFormatting}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
            >
              <MinusCircle className="h-3 w-3" />
              Clear
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="journal-entry" className="text-sm font-medium text-slate-700">
            What&apos;s on your mind?
          </label>
          <div className="relative">
            <div
              id="journal-entry"
              ref={editorRef}
              className="min-h-[200px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 outline-none"
              contentEditable={!submitting}
              role="textbox"
              aria-multiline="true"
              aria-placeholder="Write freely. Format with the toolbar to add headings, emphasis, or lists."
              onInput={(event) => {
                const html = (event.target as HTMLDivElement).innerHTML;
                setContent(html);
                if (errors.submit) {
                  setErrors((prev) => ({ ...prev, submit: undefined }));
                }
                captureSelection();
              }}
              onBlur={(event) => {
                const html = (event.target as HTMLDivElement).innerHTML;
                setContent(html);
                captureSelection();
              }}
              data-gramm="false"
              data-gramm_editor="false"
              onKeyUp={captureSelection}
              onMouseUp={captureSelection}
              onFocus={captureSelection}
              suppressContentEditableWarning
            />
            {editorIsEmpty && (
              <span className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400">
                Write freely. Format with the toolbar to add headings, emphasis, or lists.
              </span>
            )}
          </div>
          {errors.submit && <p className="text-xs font-medium text-rose-600">{errors.submit}</p>}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save entry
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your entries</h2>
        {errors.fetch ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {errors.fetch}
          </div>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Loading your journal…
          </div>
        ) : null}
        {!loading && entries.length === 0 && !errors.fetch ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No entries yet. Your reflections will appear here once you start journaling.
          </div>
        ) : null}
        <div className="space-y-3">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              <div
                className="mt-3 prose prose-sm max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(entry.content) }}
              />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function sanitizeHtml(input: string): string {
  if (!input) {
    return '';
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  convertFontTags(doc.body);
  const allowedTags = new Set([
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
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const nodesToRemove: Element[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Element;
    if (!allowedTags.has(node.tagName.toLowerCase())) {
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
  return doc.body.innerHTML.trim();
}

function extractPlainText(input: string): string {
  if (!input) {
    return '';
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, 'text/html');
  return doc.body.textContent ?? '';
}

function convertFontTags(root: HTMLElement, fallbackSize?: string) {
  const fontNodes = root.querySelectorAll('font');
  fontNodes.forEach((fontNode) => {
    const span = document.createElement('span');
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

function wrapSelectionWithHeading(selection: Selection, editor: HTMLElement) {
  if (!selection || selection.rangeCount === 0) {
    return;
  }
  const range = selection.getRangeAt(0);
  const targetBlock = getBlockElementForRange(range, editor);
  if (!targetBlock) {
    return;
  }
  const isHeading = targetBlock.tagName.toLowerCase() === 'h2';
  const replacementTag = isHeading ? 'p' : 'h2';
  const replacement = replaceElementTag(targetBlock, replacementTag);
  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(replacement);
  selection.addRange(newRange);
}

function toggleList(selection: Selection, editor: HTMLElement, listTag: 'ul' | 'ol') {
  if (!selection || selection.rangeCount === 0) {
    return;
  }
  const range = selection.getRangeAt(0);
  const block = getBlockElementForRange(range, editor);
  if (!block) {
    return;
  }
  if (block.tagName.toLowerCase() === 'li' && block.parentElement?.tagName.toLowerCase() === listTag) {
    const listElement = block.parentElement;
    const paragraph = document.createElement('p');
    while (block.firstChild) {
      paragraph.appendChild(block.firstChild);
    }
    listElement.parentElement?.insertBefore(paragraph, listElement.nextSibling);
    block.remove();
    if (listElement.childElementCount === 0) {
      listElement.remove();
    }
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(paragraph);
    selection.addRange(newRange);
    return;
  }
  if (block.tagName.toLowerCase() === listTag) {
    const fragment = document.createDocumentFragment();
    const created: HTMLElement[] = [];
    Array.from(block.children).forEach((child) => {
      if (child instanceof HTMLElement && child.tagName.toLowerCase() === 'li') {
        const paragraph = document.createElement('p');
        while (child.firstChild) {
          paragraph.appendChild(child.firstChild);
        }
        fragment.appendChild(paragraph);
        created.push(paragraph);
      }
    });
    block.replaceWith(fragment);
    if (created[0]) {
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(created[0]);
      selection.addRange(newRange);
    }
    return;
  }
  const list = document.createElement(listTag);
  const listItem = document.createElement('li');
  while (block.firstChild) {
    listItem.appendChild(block.firstChild);
  }
  if (!listItem.textContent?.trim()) {
    listItem.appendChild(document.createElement('br'));
  }
  list.appendChild(listItem);
  block.replaceWith(list);
  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(listItem);
  selection.addRange(newRange);
}

const BLOCK_LEVEL_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'li', 'ul', 'ol']);

function getBlockElementForRange(range: Range, root: HTMLElement): HTMLElement | null {
  const startBlock = findClosestBlock(range.startContainer, root);
  if (startBlock) {
    return startBlock;
  }
  return findClosestBlock(range.endContainer, root);
}

function findClosestBlock(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLElement) {
      if (BLOCK_LEVEL_TAGS.has(current.tagName.toLowerCase())) {
        return current;
      }
      if (current.parentElement === root) {
        return current;
      }
    }
    current = current.parentNode;
  }
  return null;
}

function replaceElementTag(element: HTMLElement, newTagName: string): HTMLElement {
  if (element.tagName.toLowerCase() === newTagName.toLowerCase()) {
    return element;
  }
  const replacement = document.createElement(newTagName);
  if (element.getAttribute('style')) {
    replacement.setAttribute('style', element.getAttribute('style') ?? '');
  }
  while (element.firstChild) {
    replacement.appendChild(element.firstChild);
  }
  element.replaceWith(replacement);
  return replacement;
}

function expandSelectionIfCollapsed(selection: Selection, root: HTMLElement): void {
  if (!selection.isCollapsed || selection.rangeCount === 0) {
    return;
  }
  const range = selection.getRangeAt(0);
  const block = getBlockElementForRange(range, root);
  if (!block) {
    return;
  }
  const expandedRange = document.createRange();
  expandedRange.selectNodeContents(block);
  selection.removeAllRanges();
  selection.addRange(expandedRange);
}
