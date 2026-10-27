import { EditProductPage } from "@/features/inventory/components/edit-product-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditProductPage id={id} />;
}
