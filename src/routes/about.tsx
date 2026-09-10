import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, ShieldCheck, Tag, Zap } from "lucide-react";
import workshopImage from "@/assets/workshop.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TNT Tools — Professional Tool Supplier" },
      {
        name: "description",
        content:
          "TNT Tools supplies reliable power tools, construction equipment, water pumps and workshop essentials to professionals, technicians and contractors.",
      },
      { property: "og:title", content: "About TNT Tools — Professional Tool Supplier" },
      {
        property: "og:description",
        content: "Quality, reliability, performance and value for money on every tool we stock.",
      },
    ],
  }),
  component: About,
});

const PILLARS = [
  { icon: ShieldCheck, title: "Quality", text: "Tested components, honest specifications, no shortcuts." },
  { icon: BadgeCheck, title: "Reliability", text: "Equipment chosen to survive daily professional use." },
  { icon: Zap, title: "Performance", text: "Real torque, real pressure, real output figures." },
  { icon: Tag, title: "Value for Money", text: "Professional grade without the professional markup." },
];

function About() {
  return (
    <div>
      <section className="container-tnt py-14">
        <p className="eyebrow">About TNT Tools</p>
        <h1 className="mt-3 max-w-3xl text-3xl sm:text-5xl">
          Tools Built for the People Who Use Them Every Day
        </h1>
        <p className="mt-5 max-w-3xl text-muted-foreground">
          TNT Tools provides reliable power tools, construction equipment, water pumps, and workshop
          essentials for professionals, technicians, contractors, and DIY users. We stock what we
          would use ourselves — machines that keep working after the first hard month on site.
        </p>
      </section>

      <section className="border-y border-border bg-surface/40 py-14">
        <div className="container-tnt grid items-center gap-10 lg:grid-cols-2">
          <img
            src={workshopImage}
            alt="TNT Tools workshop with tool wall and workbench"
            loading="lazy"
            width={1536}
            height={1024}
            className="w-full rounded-lg border border-border object-cover"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card-tool p-5">
                <Icon width={20} height={20} className="text-primary" />
                <h2 className="mt-3 font-display text-base font-extrabold uppercase tracking-wide">
                  {title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-tnt py-14">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { value: "15+", label: "Years supplying trade customers" },
            { value: "9", label: "Equipment categories in stock" },
            { value: "24h", label: "Typical dispatch time" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-surface p-6 text-center">
              <p className="font-display text-4xl font-extrabold text-primary">{s.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/shop" className="btn-orange">
            Shop the Range
          </Link>
          <Link to="/contact" className="btn-ghost-outline">
            Talk to Us
          </Link>
        </div>
      </section>
    </div>
  );
}
