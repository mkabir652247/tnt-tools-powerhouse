import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact TNT Tools — Sales & Support" },
      {
        name: "description",
        content:
          "Contact the TNT Tools team for product advice, bulk pricing, warranty claims and after-sales support.",
      },
      { property: "og:title", content: "Contact TNT Tools — Sales & Support" },
      { property: "og:description", content: "Product advice, bulk pricing and after-sales support." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  message: z.string().trim().min(1, "Please write a message").max(1000),
});

function Contact() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const result = schema.safeParse(data);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      setSent(false);
      return;
    }
    setErrors({});
    setSent(true);
    e.currentTarget.reset();
  }

  return (
    <div className="container-tnt py-12">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-3 text-3xl sm:text-4xl">Talk to the TNT Tools Team</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Questions about specifications, bulk pricing or warranty? Send a message and our team will
        respond within one working day.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form onSubmit={onSubmit} className="rounded-lg border border-border bg-surface p-6" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" error={errors.name} />
            <Field label="Email" name="email" type="email" error={errors.email} />
          </div>
          <div className="mt-4">
            <label htmlFor="message" className="mb-1.5 block text-sm font-semibold">
              Message
            </label>
            <textarea id="message" name="message" rows={5} maxLength={1000} className="field-tnt" />
            {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
          </div>
          <button type="submit" className="btn-orange mt-5">
            Send Message
          </button>
          {sent && (
            <p className="mt-4 text-sm text-[var(--success)]">
              Thanks — your message has been recorded. Our team will be in touch.
            </p>
          )}
        </form>

        <aside className="h-fit rounded-lg border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-wide">Reach Us</h2>
          <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <Phone width={18} height={18} className="mt-0.5 shrink-0 text-primary" />
              +92 300 000 0000
            </li>
            <li className="flex gap-3">
              <Mail width={18} height={18} className="mt-0.5 shrink-0 text-primary" />
              support@tnttools.example
            </li>
            <li className="flex gap-3">
              <MapPin width={18} height={18} className="mt-0.5 shrink-0 text-primary" />
              Tool Market Road, Karachi, Pakistan
            </li>
            <li className="flex gap-3">
              <Clock width={18} height={18} className="mt-0.5 shrink-0 text-primary" />
              Mon–Sat, 9:00–19:00
            </li>
          </ul>
          <p className="mt-5 text-xs text-muted-foreground">
            These contact details are placeholders — send us your real phone, email and address and
            we will put them in.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  error,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input id={name} name={name} type={type} maxLength={255} className="field-tnt" />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
