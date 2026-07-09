import * as React from 'react';
import { Folder, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TreeNode {
  /** Node label - a real file or folder name. */
  label: string;
  /** Children; presence makes this a folder node. */
  children?: TreeNode[];
  /** Collapse this folder initially (folders default open). */
  defaultCollapsed?: boolean;
}

export interface TreeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Root nodes of the hierarchy. */
  nodes: TreeNode[];
  /** Optional uppercase kicker above the card. */
  label?: string;
}

const TreeRow: React.FC<{ node: TreeNode; depth: number }> = ({ node, depth }) => {
  const isFolder = !!node.children?.length;
  const [open, setOpen] = React.useState(!node.defaultCollapsed);
  return (
    <li role="treeitem" aria-expanded={isFolder ? open : undefined}>
      <button
        type="button"
        onClick={isFolder ? () => setOpen((o) => !o) : undefined}
        style={{ paddingLeft: 12 + depth * 20 }}
        className={cn(
          'flex w-full items-center gap-2 py-1.5 pr-3 text-left',
          isFolder && 'transition-colors hover:bg-muted'
        )}
      >
        <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center text-grey">
          {isFolder ? (
            <Folder className="h-[15px] w-[15px]" strokeWidth={1.8} />
          ) : (
            <FileText className="h-[15px] w-[15px]" strokeWidth={1.8} />
          )}
        </span>
        <span className={cn('truncate text-micro text-ink', isFolder && 'font-title font-medium')}>
          {node.label}
        </span>
      </button>
      {isFolder && open && (
        <ul role="group">
          {node.children!.map((c, i) => (
            <TreeRow key={`${c.label}-${i}`} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

/** proto/Tree (Figma 455:17) - the file/folder hierarchy on a paper card: folder and
 * file glyphs, depth-indented rows, role=tree semantics with aria-expanded parents. */
export const Tree = React.forwardRef<HTMLDivElement, TreeProps>(
  ({ nodes, label, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
      {label && (
        <span className="px-1 font-title text-nano font-medium uppercase tracking-wider text-grey">{label}</span>
      )}
      <ul role="tree" className="rounded-lg border border-hairline bg-paper py-2">
        {nodes.map((n, i) => (
          <TreeRow key={`${n.label}-${i}`} node={n} depth={0} />
        ))}
      </ul>
    </div>
  )
);
Tree.displayName = 'Tree';
