import { EditCustomer } from "@/features/customers/components/customer-screens";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditCustomer id={id} />;
}
