"use client";

import { flexRender, type ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, type LegacyFeatures, useLegacyTable } from "@tanstack/react-table/legacy";
import { Table, TableWrap, THead, Th, Td, Tr } from "@/components/ui/table";

export type AppColumn<T extends object> = ColumnDef<LegacyFeatures, T & Record<string, unknown>, unknown>;

export function DataTable<T extends object>({ columns, data }: { columns: AppColumn<T>[]; data: T[] }) {
  const rows = data as Array<T & Record<string, unknown>>;
  const table = useLegacyTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <TableWrap>
      <Table>
        <THead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <Th key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</Th>
              ))}
            </tr>
          ))}
        </THead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <Tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
              ))}
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}
