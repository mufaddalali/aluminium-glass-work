"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { messages } from "@/constants/messages";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { api, getErrorMessage } from "@/lib/axios";

type LoginValues = { email: string; password: string };

export function LoginForm() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: LoginValues) {
    try {
      await api.post("/auth/login", values);
      toast.success(messages.login.success);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, messages.login.invalid));
    }
  }

  return (
    <form className="surface-card w-full max-w-md space-y-5 p-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div>
        <p className="text-sm font-semibold tracking-tight text-primary">{messages.appName}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{messages.login.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{messages.login.description}</p>
      </div>
      <Field label={messages.login.email} htmlFor="email" error={form.formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="username" {...form.register("email")} />
      </Field>
      <Field label={messages.login.password} htmlFor="password" error={form.formState.errors.password?.message}>
        <div className="relative">
          <Input id="password" type={visible ? "text" : "password"} autoComplete="current-password" className="pe-12" {...form.register("password")} />
          <button type="button" className="absolute inset-y-0 end-2 my-auto h-8 rounded-md px-2 text-muted-foreground hover:bg-muted" aria-label={visible ? messages.login.hide : messages.login.show} onClick={() => setVisible((value) => !value)}>
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>{messages.login.submit}</Button>
    </form>
  );
}
