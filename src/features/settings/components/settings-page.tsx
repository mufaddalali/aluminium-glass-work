"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { settingsSchema } from "@/features/settings/schemas/settings.schema";
import { getSettings, updateSettings, uploadLogo } from "@/features/settings/services/settings.service";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/query/query-keys";
import type { z } from "zod";

type FormInput = z.input<typeof settingsSchema>;
type Values = z.output<typeof settingsSchema>;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: queryKeys.settings.current, queryFn: getSettings });
  if (settings.isLoading) return <TableSkeleton />;
  if (!settings.data) return <ErrorState onRetry={() => void settings.refetch()} />;
  return <SettingsForm initial={settings.data} onSaved={async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.settings.current }); }} />;
}

function SettingsForm({ initial, onSaved }: { initial: Awaited<ReturnType<typeof getSettings>>; onSaved: () => Promise<void> }) {
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      businessName: initial.businessName,
      address: initial.address ?? "",
      phone: initial.phone ?? "",
      email: initial.email ?? "",
      invoicePrefix: initial.invoicePrefix,
      currency: initial.currency,
      taxEnabled: initial.taxEnabled,
      taxRate: initial.taxRate,
      taxLabel: initial.taxLabel,
      defaultTerms: initial.defaultTerms ?? "",
      defaultNotes: initial.defaultNotes ?? "",
      paymentTermDays: initial.paymentTermDays,
      timeZone: initial.timeZone,
    },
  });
  const save = useMutation({
    mutationFn: (values: Values) => updateSettings(values),
    onSuccess: async () => { toast.success("Settings saved."); await onSaved(); },
    onError: (error) => toast.error(getErrorMessage(error, "Settings could not be saved.")),
  });
  const logo = useMutation({
    mutationFn: (file: File) => uploadLogo(file),
    onSuccess: async () => { toast.success("Logo saved."); await onSaved(); },
    onError: (error) => toast.error(getErrorMessage(error, "The logo could not be uploaded.")),
  });
  return (
    <form className="space-y-8" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
      <PageHeader title="Settings" description="These details appear on printed invoices." />
      <div className="surface-card grid gap-4 p-5 md:grid-cols-2">
        <Field label="Business name" htmlFor="businessName" error={form.formState.errors.businessName?.message}><Input id="businessName" {...form.register("businessName")} /></Field>
        <Field label="Phone" htmlFor="phone"><Input id="phone" {...form.register("phone")} /></Field>
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}><Input id="email" {...form.register("email")} /></Field>
        <Field label="Currency" htmlFor="currency"><Input id="currency" {...form.register("currency")} /></Field>
        <Field label="Invoice prefix" htmlFor="invoicePrefix"><Input id="invoicePrefix" {...form.register("invoicePrefix")} /></Field>
        <Field label="Time zone" htmlFor="timeZone"><Input id="timeZone" {...form.register("timeZone")} /></Field>
        <Field label="Tax label" htmlFor="taxLabel"><Input id="taxLabel" {...form.register("taxLabel")} /></Field>
        <Field label="Tax rate %" htmlFor="taxRate"><Input id="taxRate" {...form.register("taxRate")} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register("taxEnabled")} />Enable tax on invoices</label>
        <Field label="Payment term days" htmlFor="paymentTermDays"><Input id="paymentTermDays" {...form.register("paymentTermDays")} /></Field>
        <div className="md:col-span-2"><Field label="Address" htmlFor="address"><Textarea id="address" {...form.register("address")} /></Field></div>
        <div className="md:col-span-2"><Field label="Default notes" htmlFor="defaultNotes"><Textarea id="defaultNotes" {...form.register("defaultNotes")} /></Field></div>
        <div className="md:col-span-2"><Field label="Default terms" htmlFor="defaultTerms"><Textarea id="defaultTerms" {...form.register("defaultTerms")} /></Field></div>
        <Field label="Logo" htmlFor="logo">
          <Input id="logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) logo.mutate(file); }} />
          {initial.hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the logo is served from an authenticated route
            <img alt="Current logo" src="/api/settings/logo" className="mt-3 h-16 w-auto" />
          ) : null}
        </Field>
      </div>
      <Button type="submit" loading={save.isPending}>Save settings</Button>
    </form>
  );
}
