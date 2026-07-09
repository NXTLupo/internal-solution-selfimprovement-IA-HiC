import * as React from 'react';
import { cn } from '../lib/utils';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '../ui/command';

export interface CmdCommand {
  /** Command label ("Open project...", "Toggle theme"). */
  label: string;
  /** Keyboard shortcut chip, mono ("Ctrl K", "Ctrl P"). */
  shortcut?: string;
  /** Leading icon node (lucide, sized h-4 w-4). */
  icon?: React.ReactNode;
}

export interface CmdGroup {
  /** Group heading ("Navigation", "Actions"). */
  heading: string;
  /** The commands under this heading. */
  commands: CmdCommand[];
}

export interface CmdProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Grouped commands rendered in the palette. */
  groups: CmdGroup[];
  /** Search placeholder. */
  placeholder?: string;
  /** Message shown when the query matches nothing. */
  emptyMessage?: string;
  /** Called with the command label on selection. */
  onSelectCommand?: (label: string) => void;
}

/** proto/Cmd (Figma 462:34) - the ready command palette: hairline-ruled search row,
 * quiet mono group headings, panel-highlighted active row, trailing mono shortcut
 * chips. Composes the '../ui/command' (cmdk) primitives; open/close chrome
 * (Ctrl+K, Esc) belongs to the hosting dialog. */
export const Cmd = React.forwardRef<HTMLDivElement, CmdProps>(
  ({ groups, placeholder = 'Type a command...', emptyMessage = 'No results found.', onSelectCommand, className, ...props }, ref) => (
    <div ref={ref} className={cn('w-full max-w-[360px]', className)} {...props}>
      <Command className="rounded-lg">
        <CommandInput placeholder={placeholder} />
        <CommandList>
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          {groups.map((g) => (
            <CommandGroup key={g.heading} heading={g.heading}>
              {g.commands.map((c) => (
                <CommandItem
                  key={c.label}
                  onSelect={onSelectCommand ? () => onSelectCommand(c.label) : undefined}
                >
                  {c.icon && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-grey">{c.icon}</span>
                  )}
                  {c.label}
                  {c.shortcut && <CommandShortcut>{c.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </div>
  )
);
Cmd.displayName = 'Cmd';
