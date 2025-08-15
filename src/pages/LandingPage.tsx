import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check,
  Wrench,
  Users,
  Shield,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";

export default function LandingPage() {
  const isMobile = useMobile();
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600" />
              <span className="text-2xl font-bold tracking-tight">ServicePro</span>
            </Link>

            <nav className={isMobile ? "hidden" : "hidden md:block"}>
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#home"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                    >
                      Home
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#features"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                    >
                      Features
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#how"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                    >
                      How it works
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#pricing"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                    >
                      Pricing
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      href="#faq"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                    >
                      FAQ
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </nav>

            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button className="rounded-2xl">Log in</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main id="home" className="flex-1">
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80')",
            }}
          />
          <div className="absolute inset-0 -z-10 bg-black/40" />
          <div className="container mx-auto px-4 py-20 md:py-28 text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/50 px-3 py-1 text-sm bg-white/10 backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4" />
              <span className="">New: Smart Dispatching just landed</span>
            </motion.div>

            <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Run your field service business on autopilot
            </h1>
            <p className="mt-5 text-lg md:text-xl max-w-2xl mx-auto">
              ServicePro centralizes jobs, teams, schedules, and invoices—so you can focus on delivering great service, not juggling spreadsheets.
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Link to="/login">
                <Button size="lg" className="rounded-2xl">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <p className="mt-3 text-xs opacity-80">No credit card required • 14‑day free trial • Cancel anytime</p>

            {/* Social proof / logos */}
            <div className="mt-14 grid grid-cols-2 md:grid-cols-5 gap-6 items-center opacity-80">
              {["Acme HVAC", "BrightClean", "FixIt Co.", "Northstar Solar", "PipeWorks"].map(
                (brand) => (
                  <div key={brand} className="text-sm md:text-base font-medium">
                    {brand}
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section id="features" className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Everything you need—nothing you don’t</h2>
            <p className="mt-3 text-muted-foreground">
              Tools that keep techs on time, customers informed, and cash flowing.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Wrench className="h-6 w-6" />}
              title="Job Management"
              text="Create, assign, and track jobs with instant status updates."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Smart Scheduling"
              text="Auto-assign by location, skill, and availability to reduce travel time."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Team App"
              text="Mobile‑first workflows for techs to check in, capture photos, and collect signatures."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Quotes & Invoices"
              text="Generate quotes, convert to jobs, and get paid faster with online payments."
            />
            <FeatureCard
              icon={<Check className="h-6 w-6" />}
              title="Customer Portal"
              text="Give clients real‑time ETAs, job history, and secure payments."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Automation"
              text="Templates, reminders, and triggers that run your ops while you sleep."
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-muted/30 border-y">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="rounded-full" variant="secondary">Workflow</Badge>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold">From request to payment in three steps</h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <StepWithImage
                number="1"
                title="Capture & assign"
                text="Log requests from web, phone, or email. Auto‑assign to the right tech."
                imageUrl="https://images.pexels.com/photos/3825584/pexels-photo-3825584.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500"
              />
              <StepWithImage
                number="2"
                title="Do the work"
                text="Techs follow checklists, upload photos, and collect approvals on site."
                imageUrl="https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500"
              />
              <StepWithImage
                number="3"
                title="Invoice & get paid"
                text="One‑click invoices with online payment links and automatic reminders."
                imageUrl="https://images.pexels.com/photos/442151/pexels-photo-442151.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500"
              />
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid gap-6 md:grid-cols-3">
            <Stat value="28%" label="Faster job completion" />
            <Stat value="2x" label="More on‑time arrivals" />
            <Stat value="$12k" label="Avg. monthly cash flow increase" />
          </div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl text-center mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold">Loved by field service teams</h2>
            <p className="mt-3 text-muted-foreground">Real results from real crews.</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "ServicePro cut our dispatch time in half and customers get automatic ETAs.",
                name: "Maya Patel",
                role: "Ops Manager, BrightClean",
              },
              {
                quote:
                  "Our techs stopped texting for job details. Everything they need is in the app.",
                name: "Jordan Lee",
                role: "Founder, FixIt Co.",
              },
              {
                quote:
                  "Invoices go out same day now—and we get paid faster.",
                name: "Carla Nguyen",
                role: "Owner, PipeWorks",
              },
            ].map((t) => (
              <Card key={t.name} className="rounded-2xl">
                <CardContent className="p-6">
                  <p className="text-base leading-relaxed">“{t.quote}”</p>
                  <div className="mt-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t.name}</span> · {t.role}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-muted/30 border-y">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="text-center max-w-2xl mx-auto">
              <Badge className="rounded-full" variant="secondary">Simple pricing</Badge>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold">Only pay for seats you use</h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <PricingCard
                title="Starter"
                price="$19"
                period="per user / month"
                features={[
                  "Up to 3 team members",
                  "Jobs & scheduling",
                  "Email support",
                ]}
                cta="Start free"
              />
              <PricingCard
                featured
                title="Growth"
                price="$49"
                period="per user / month"
                features={[
                  "Unlimited team members",
                  "Automations",
                  "Customer portal",
                  "Priority support",
                ]}
                cta="Start free"
              />
              <PricingCard
                title="Business"
                price="Custom"
                period="Contact sales"
                features={[
                  "Advanced permissions",
                  "SLA & audit logs",
                  "Dedicated success manager",
                ]}
                cta="Talk to sales"
              />
            </div>
          </div>
        </section>

        {/* CTA / Newsletter */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <Card className="rounded-3xl border-dashed">
            <CardContent className="p-8 md:p-12 grid md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold">Get product updates & tips</h3>
                <p className="mt-2 text-muted-foreground">
                  Join 5,000+ service pros leveling up their ops every month.
                </p>
              </div>
              <form className="flex gap-3">
                <Input type="email" placeholder="you@company.com" className="h-11" />
                <Button type="button" className="h-11 rounded-2xl">Subscribe</Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section id="faq" className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Frequently asked questions</h2>
            <p className="mt-3 text-muted-foreground">
              Can’t find what you’re looking for? <Link to="/contact" className="underline">Contact us</Link>.
            </p>
          </div>
          <div className="mt-8 max-w-3xl mx-auto space-y-4">
            <FAQ q="Can I try ServicePro for free?" a="Yes! Every plan includes a 14‑day free trial—no credit card required." />
            <FAQ q="Do you have a mobile app?" a="Absolutely. Our iOS and Android apps are built for technicians on the go." />
            <FAQ q="Can I import my existing data?" a="Yes, CSV import and onboarding support are included on Growth and above." />
            <FAQ q="How does billing work?" a="Pricing is per active user per month. You can add/remove seats anytime." />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-10">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600" />
                <span className="text-xl font-bold">ServicePro</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground max-w-xs">
                Software that keeps your field service business humming.
              </p>
            </div>
            <FooterCol title="Product" links={[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "Roadmap", href: "#" },
            ]} />
            <FooterCol title="Company" links={[
              { label: "About", href: "#" },
              { label: "Careers", href: "#" },
              { label: "Contact", href: "/contact" },
            ]} />
            <FooterCol title="Resources" links={[
              { label: "Blog", href: "#" },
              { label: "Help Center", href: "#" },
              { label: "Status", href: "#" },
            ]} />
          </div>

          <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>© {new Date().getFullYear()} ServicePro. All rights reserved.</div>
            <div className="flex gap-4">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="space-y-1">
        <div className="h-10 w-10 rounded-xl bg-muted grid place-items-center">{icon}</div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

function StepWithImage({
  number,
  title,
  text,
  imageUrl,
}: {
  number: string;
  title: string;
  text: string;
  imageUrl: string;
}) {
  return (
    <div className="relative bg-background border rounded-2xl p-6">
      <div className="absolute -top-3 -left-3 h-10 w-10 grid place-items-center rounded-2xl border bg-white font-bold">
        {number}
      </div>
      <img src={imageUrl} alt={title} className="w-full h-48 object-cover rounded-t-2xl" />
      <h3 className="text-lg font-semibold mt-4">{title}</h3>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 text-center">
        <div className="text-4xl font-extrabold tracking-tight">{value}</div>
        <div className="mt-1 text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function PricingCard({
  featured,
  title,
  price,
  period,
  features,
  cta,
}: {
  featured?: boolean;
  title: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
}) {
  return (
    <Card
      className={`rounded-2xl flex flex-col ${
        featured ? "border-2 border-primary shadow-lg" : ""
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{title}</CardTitle>
          {featured && <Badge className="rounded-full">Most Popular</Badge>}
        </div>
        <div className="mt-4">
          <span className="text-4xl font-extrabold">{price}</span>
          <span className="ml-2 text-sm text-muted-foreground">{period}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Link to={cta === "Talk to sales" ? "/contact" : "/signup"}>
          <Button className="w-full rounded-2xl mt-4">
            {cta}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border rounded-2xl p-4">
      <summary className="cursor-pointer select-none list-none text-left flex items-center justify-between">
        <span className="font-medium">{q}</span>
        <span className="transition-transform group-open:rotate-45">
          <PlusIcon />
        </span>
      </summary>
      <p className="mt-3 text-muted-foreground">{a}</p>
    </details>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="font-semibold mb-3">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} className="hover:text-foreground transition-colors">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
