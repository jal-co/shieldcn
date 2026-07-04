import type { Metadata } from "next"
import Link from "next/link"
import { SiteShell } from "@/components/site-shell"
import { pageMetadata } from "@/lib/metadata"

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms governing your use of shieldcn — accounts, the Plus subscription, billing, refunds, acceptable use, and liability.",
  path: "/terms",
})

const CONTACT = "shieldcn@fwdtojustin.com"

export default function TermsPage() {
  return (
    <SiteShell>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-2xl px-6 py-16 md:px-10">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Agreement</h2>
              <p>
                These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of
                shieldcn (the &ldquo;Service&rdquo;), a badge and README service. By creating an
                account, subscribing, or otherwise using the Service, you agree to
                these Terms. If you do not agree, do not use the Service. We may
                update these Terms from time to time; material changes will be
                reflected by the &ldquo;Last updated&rdquo; date above, and continued use after
                a change constitutes acceptance.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">The Service</h2>
              <p>
                shieldcn generates badge images and README assets you can embed in
                repositories, documentation, and websites. Public badge generation
                is free. Some features (collectively, &ldquo;Plus&rdquo;) require a paid
                subscription. We may add, change, or remove features over time. We
                strive for high availability but provide the Service on an
                &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis without any uptime guarantee.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Accounts</h2>
              <p>
                You may create an account with an email and password or via GitHub.
                You are responsible for keeping your credentials secure and for all
                activity under your account. You must be at least 13 years old (or
                the minimum age of digital consent in your jurisdiction) to use the
                Service. Provide accurate information and keep it current. We may
                suspend or terminate accounts that violate these Terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Plus subscription &amp; billing</h2>
              <p>
                Plus is billed on a recurring basis (currently $10/month) through our
                payment processor,{" "}
                <a
                  href="https://polar.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Polar
                </a>
                , who acts as merchant of record and handles payment, taxes, and
                invoicing. By subscribing, you authorize us and Polar to charge your
                payment method on each renewal until you cancel. Prices may change;
                we will give notice before a change affects your renewal. You can
                cancel at any time from your account or the customer portal —
                cancellation stops future charges and your Plus access continues
                until the end of the current billing period.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Refunds</h2>
              <p>
                All payments are non-refundable and all sales are final. Canceling a
                subscription stops future billing but does not refund the current or
                any prior billing period, and we do not provide prorated refunds for
                partial periods. As a courtesy, we may — at our sole discretion —
                grant a goodwill refund in exceptional cases (for example, a
                duplicate or clearly erroneous charge). To request one, contact us at{" "}
                <a href={`mailto:${CONTACT}`} className="underline underline-offset-2 hover:text-foreground">
                  {CONTACT}
                </a>
                . Any goodwill refund is not a waiver of this policy. Nothing here
                limits rights you may have that cannot be waived under applicable
                law.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Acceptable use</h2>
              <p>You agree not to:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>use the Service for any unlawful, infringing, or fraudulent purpose;</li>
                <li>
                  abuse, overload, or attempt to circumvent rate limits, or access the
                  Service through automated means beyond ordinary badge embedding;
                </li>
                <li>
                  probe, scan, or attempt to breach the security of the Service or its
                  infrastructure;
                </li>
                <li>
                  upload or generate content that is unlawful, malicious, defamatory,
                  or that infringes another party&apos;s rights;
                </li>
                <li>resell or redistribute the Service as your own without permission.</li>
              </ul>
              <p>
                We may rate-limit, suspend, or terminate access for conduct that, in
                our judgment, violates these Terms or risks harm to the Service or
                others.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Your content</h2>
              <p>
                You retain ownership of the content you provide (such as saved
                badges, READMEs, and brand assets). You grant us a limited license to
                host, process, and display that content solely to operate the
                Service for you. You are responsible for having the rights to any
                logos, names, or assets you upload, and for ensuring your use of
                third-party marks in badges complies with those parties&apos; terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Intellectual property</h2>
              <p>
                The Service, including its software, design, and branding, is owned
                by shieldcn and its licensors and is protected by applicable law.
                Portions of the project may be released under an open-source license;
                where that is the case, the applicable license governs your use of
                that code. Third-party marks displayed in badges belong to their
                respective owners.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Disclaimers</h2>
              <p>
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
                warranties of any kind, whether express or implied, including
                warranties of merchantability, fitness for a particular purpose, and
                non-infringement. We do not warrant that the Service will be
                uninterrupted, error-free, or secure, or that badge data will be
                accurate or current.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Limitation of liability</h2>
              <p>
                To the maximum extent permitted by law, shieldcn and its operators
                will not be liable for any indirect, incidental, special,
                consequential, or punitive damages, or for any loss of profits, data,
                or goodwill, arising from your use of the Service. Our total
                liability for any claim relating to the Service will not exceed the
                greater of the amount you paid us in the twelve months before the
                claim or USD $50.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Termination</h2>
              <p>
                You may stop using the Service and delete your account at any time.
                We may suspend or terminate your access if you breach these Terms or
                if we discontinue the Service. On termination, your right to use the
                Service ends; sections that by their nature should survive
                (including payment obligations, disclaimers, and limitation of
                liability) will survive.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Governing law</h2>
              <p>
                These Terms are governed by the laws of the State of North Carolina,
                USA, without regard to its conflict-of-laws rules. You agree that the
                state and federal courts located in North Carolina will have
                exclusive jurisdiction over any dispute arising from these Terms or
                the Service, and you consent to venue in those courts, except where
                applicable law requires otherwise.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Contact</h2>
              <p>
                Questions about these Terms? Reach us at{" "}
                <a href={`mailto:${CONTACT}`} className="underline underline-offset-2 hover:text-foreground">
                  {CONTACT}
                </a>{" "}
                or open an issue on{" "}
                <a
                  href="https://github.com/jal-co/shieldcn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  GitHub
                </a>
                . See also our{" "}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
    </SiteShell>
  )
}
