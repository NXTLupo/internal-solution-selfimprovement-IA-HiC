import * as React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from 'nxt-proto-ds';

export const CountyRisk = () => (
  <div style={{ maxWidth: 560 }}>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>County</TableHead>
          <TableHead>Crop</TableHead>
          <TableHead>Flood</TableHead>
          <TableHead>Drought</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Cass, ND</TableCell>
          <TableCell>Corn</TableCell>
          <TableCell>Elevated</TableCell>
          <TableCell>Neutral</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Story, IA</TableCell>
          <TableCell>Soybeans</TableCell>
          <TableCell>Moderate</TableCell>
          <TableCell>Neutral</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Saline, KS</TableCell>
          <TableCell>Wheat</TableCell>
          <TableCell>Low</TableCell>
          <TableCell>Watch</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Lancaster, NE</TableCell>
          <TableCell>Corn</TableCell>
          <TableCell>Low</TableCell>
          <TableCell>Neutral</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
);

export const SourceLibrary = () => (
  <div style={{ maxWidth: 560 }}>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Source</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>USDA crop insurance participation</TableCell>
          <TableCell>Government</TableCell>
          <TableCell>
            <Badge variant="success">Indexed</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>KFF employer health benefits survey</TableCell>
          <TableCell>Research</TableCell>
          <TableCell>
            <Badge variant="success">Indexed</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Reuters reinsurance pricing brief</TableCell>
          <TableCell>News</TableCell>
          <TableCell>
            <Badge variant="secondary">Queued</Badge>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Enrollment file, April cycle</TableCell>
          <TableCell>Client upload</TableCell>
          <TableCell>
            <Badge variant="info">Processing</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
);
