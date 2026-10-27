import Link from "next/link";
import { Button } from "@/components/ui/button";

export function RowActions({ viewHref, editHref }: { viewHref?: string; editHref?: string }) {
  return (
    <div className="flex gap-2">
      {viewHref ? <Button variant="primary" size="sm" asChild><Link href={viewHref}>View</Link></Button> : null}
      {editHref ? <Button variant="secondary" size="sm" asChild><Link href={editHref}>Edit</Link></Button> : null}
    </div>
  );
}
