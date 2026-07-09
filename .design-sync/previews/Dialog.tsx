import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from 'nxt-proto-ds';

// Radix portal component: rendered with open so the content mounts statically.
export const ConfirmRun = () => (
  <Dialog open modal={false}>
    <DialogContent style={{ maxWidth: 420 }}>
      <DialogHeader>
        <DialogTitle>Start benchmark run?</DialogTitle>
        <DialogDescription>
          The run compares your April enrollment file against similar-size employers and takes a few
          minutes to finish.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost">Cancel</Button>
        <Button>Start run</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const DeleteWarning = () => (
  <Dialog open modal={false}>
    <DialogContent style={{ maxWidth: 420 }}>
      <DialogHeader>
        <DialogTitle>Delete this enrollment file?</DialogTitle>
        <DialogDescription>
          Reports already generated from the file stay available; the source rows are removed
          permanently.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline">Keep file</Button>
        <Button variant="destructive">Delete file</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
