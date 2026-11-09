// 2026-10-05: the Design Desk failed to load on a Windows checkout (CRLF DESIGN.md).
import { it, expect } from 'vitest';
import * as fs from 'fs';
import { parseDesignMd } from './designMdLoader';
it('parses the on-disk DESIGN.md (CRLF on Windows)', () => {
    const src = fs.readFileSync(require('path').resolve(__dirname, '../../DESIGN.md'), 'utf8');
    expect(parseDesignMd(src).tokens.name).toBeTruthy();
    expect(parseDesignMd(src.replace(/\r?\n/g, '\r\n')).tokens.brands).toBeTruthy();
});
