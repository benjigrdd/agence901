'use client';

import type { RichTextDoc } from '@app/shared';
import { richTextToPlainText, RichTextDocSchema } from '@app/shared';
import type { Editor } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { LucideIcon } from 'lucide-react';
import { Bold, Heading2, Heading3, Italic, Link2, Link2Off, List, ListOrdered } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type RichTextEditorProps = {
  id: string;
  label: string;
  value: RichTextDoc;
  onChange: (doc: RichTextDoc) => void;
  maxLength?: number;
  error?: string;
  describedBy?: string;
};

const isHttps = (url: string) => /^https:\/\/[^\s]+$/i.test(url);

/** Editeur limite au schema `RichTextDoc` : H2, H3, gras, italique, listes, liens https. */
export function RichTextEditor({ id, label, value, onChange, maxLength, error, describedBy }: RichTextEditorProps) {
  const counterId = `${id}-compteur`;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['https'],
          isAllowedUri: (url) => isHttps(url),
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        'aria-describedby': [describedBy, counterId].filter(Boolean).join(' '),
        ...(error ? { 'aria-invalid': 'true' } : {}),
        class: 'prose-sm min-h-40 max-w-none p-3 focus:outline-none [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline',
      },
    },
    onUpdate: ({ editor: e }) => {
      const parsed = RichTextDocSchema.safeParse(e.getJSON());
      if (parsed.success) onChange(parsed.data);
    },
  });

  const length = richTextToPlainText(value).length;

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium" id={`${id}-libelle`}>
        {label}
      </span>
      <div className={cn('rounded-md border', error ? 'border-destructive' : 'border-input')}>
        {editor ? <Toolbar editor={editor} labelledBy={`${id}-libelle`} /> : null}
        <EditorContent editor={editor} />
      </div>
      <p id={counterId} className="text-muted-foreground text-right text-xs" aria-live="polite">
        {length} caractère{length > 1 ? 's' : ''}
        {maxLength ? ` sur ${maxLength}` : ''}
      </p>
    </div>
  );
}

type ToolbarButtonProps = { icon: LucideIcon; label: string; active: boolean; onClick: () => void; shortcut?: string };

function ToolbarButton({ icon: Icon, label, active, onClick, shortcut }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon"
      aria-label={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}

function Toolbar({ editor, labelledBy }: { editor: Editor; labelledBy: string }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      link: e.isActive('link'),
    }),
  });
  return (
    <div role="toolbar" aria-labelledby={labelledBy} className="flex flex-wrap gap-1 border-b p-1">
      <ToolbarButton icon={Heading2} label="Titre de niveau 2" active={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton icon={Heading3} label="Titre de niveau 3" active={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <ToolbarButton icon={Bold} label="Gras" shortcut="Ctrl+B" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton icon={Italic} label="Italique" shortcut="Ctrl+I" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton icon={List} label="Liste à puces" active={state.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton icon={ListOrdered} label="Liste numérotée" active={state.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <LinkButton editor={editor} active={state.link} />
    </div>
  );
}

function LinkButton({ editor, active }: { editor: Editor; active: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (active) {
    return <ToolbarButton icon={Link2Off} label="Retirer le lien" active onClick={() => editor.chain().focus().unsetLink().run()} />;
  }
  const apply = () => {
    const href = url.trim();
    if (!isHttps(href)) {
      setError('Adresse en https:// requise');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setOpen(false);
    setUrl('');
    setError(null);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Ajouter un lien" aria-pressed={false}>
          <Link2 aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2">
        <Label htmlFor={id}>Adresse du lien</Label>
        <Input
          id={id}
          type="url"
          placeholder="https://"
          value={url}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erreur` : undefined}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply();
            }
          }}
        />
        {error ? (
          <p id={`${id}-erreur`} className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <Button type="button" size="sm" onClick={apply}>
          Insérer le lien
        </Button>
      </PopoverContent>
    </Popover>
  );
}
