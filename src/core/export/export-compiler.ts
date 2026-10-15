import { SiteConfiguration, SiteConfigurationSchema } from "@/core/schema/site-config";
import { resolveTheme, themeTokensToCssVariables } from "@/themes/default-themes";
import { ExportCompilationError } from "@/core/errors";
import { ExportOutputFile } from "./types";

/**
 * Fortress AI — Core Static HTML Compiler (TDD §21.1–§21.5, §36.1, FR-080)
 * Compiles canonical SiteConfiguration into pure standalone HTML/CSS/JS files.
 * Invariant: Portable output must execute on any static web host without platform runtime.
 */

export interface CompileOptions {
  includeSitemap?: boolean;
  includeRobots?: boolean;
  inlineScripts?: boolean;
  baseUrlOverride?: string;
}

export function compileSiteHtml(
  rawConfig: SiteConfiguration,
  options: CompileOptions = {}
): { files: ExportOutputFile[]; routes: string[]; assetsCount: number } {
  const config = SiteConfigurationSchema.parse(rawConfig);
  const resolvedTheme = resolveTheme(config.theme.themeId, config.theme.tokenOverrides);
  const cssVariables = themeTokensToCssVariables(resolvedTheme);

  const files: ExportOutputFile[] = [];
  const routes: string[] = [];
  let assetsCount = 0;

  // CSS variables string
  const cssVariablesString = Object.entries(cssVariables)
    .map(([key, val]) => `${key}: ${val};`)
    .join(" ");

  const baseStyles = getBaseStyles(cssVariablesString);
  const clientScript = getClientScript();

  // Add standalone assets/app.js and assets/style.css
  files.push({
    path: "assets/style.css",
    content: baseStyles,
    contentType: "text/css",
  });

  files.push({
    path: "assets/app.js",
    content: clientScript,
    contentType: "application/javascript",
  });

  const baseUrl = options.baseUrlOverride || `https://${config.platformSlug}.fortress-ai.com`;

  // Render each page route
  for (const page of config.pages) {
    try {
      let headerHtml = "";
      let mainHtml = "";
      let footerHtml = "";

      for (const section of page.sections) {
        const secHtml = renderSectionInstanceToHtml(section, config);
        assetsCount += section.assetBindings?.length || 0;
        if (section.sectionId === "shell.header") {
          headerHtml += secHtml;
        } else if (section.sectionId === "shell.footer") {
          footerHtml += secHtml;
        } else {
          mainHtml += secHtml;
        }
      }

      const pageBodyHtml = `${headerHtml}\n    <main id="main-content">\n      ${mainHtml}\n    </main>\n    ${footerHtml}`;

      const canonicalUrl = page.seo.canonicalUrl || `${baseUrl}${page.slug === "/" ? "" : page.slug}`;

      const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(page.seo.title || config.businessProfile.name)}</title>
  <meta name="description" content="${escapeHtml(page.seo.description || config.businessProfile.summary)}" />
  ${page.seo.noIndex ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow" />'}
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(page.seo.title || config.businessProfile.name)}" />
  <meta property="og:description" content="${escapeHtml(page.seo.description || config.businessProfile.summary)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:site_name" content="${escapeHtml(config.businessProfile.name)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(page.seo.title || config.businessProfile.name)}" />
  <meta name="twitter:description" content="${escapeHtml(page.seo.description || config.businessProfile.summary)}" />

  <!-- Linked CSS & Standalone Fallback -->
  <link rel="stylesheet" href="./assets/style.css" />
  <style>
    /* Inline critical tokens fallback */
    :root { ${cssVariablesString} }
  </style>
</head>
<body>
  ${pageBodyHtml}

  <script src="./assets/app.js"></script>
</body>
</html>`;

      const filePath = page.slug === "/" ? "index.html" : `${page.slug.replace(/^\//, "")}.html`;
      files.push({
        path: filePath,
        content: htmlDocument,
        contentType: "text/html",
      });
      routes.push(page.slug);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Compilation error";
      throw new ExportCompilationError(`Failed to compile static route "${page.slug}": ${msg}`);
    }
  }

  // Generate sitemap.xml
  if (options.includeSitemap !== false) {
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${config.pages
  .filter((p) => !p.seo.noIndex)
  .map(
    (p) => `  <url>
    <loc>${baseUrl}${p.slug === "/" ? "" : p.slug}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>${p.slug === "/" ? "daily" : "weekly"}</changefreq>
    <priority>${p.slug === "/" ? "1.0" : "0.8"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    files.push({
      path: "sitemap.xml",
      content: sitemapXml,
      contentType: "application/xml",
    });
  }

  // Generate robots.txt
  if (options.includeRobots !== false) {
    const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`;
    files.push({
      path: "robots.txt",
      content: robotsTxt,
      contentType: "text/plain",
    });
  }

  return { files, routes, assetsCount };
}

/**
 * Renders an individual section instance into static HTML5 markup.
 * Supports all 20 manifest section types in Fortress AI.
 */
export function renderSectionInstanceToHtml(sec: any, siteConfig?: SiteConfiguration): string {
  const content = sec.content || {};
  const asset = sec.assetBindings?.[0];
  const instanceId = sec.instanceId || `sec_${Math.random().toString(36).substring(2, 9)}`;

  switch (sec.sectionId) {
    case "shell.header": {
      const brand = content.brandName || siteConfig?.navigation.brandName || siteConfig?.businessProfile.name || "Fortress";
      const links = content.links || siteConfig?.navigation.links || [];
      return `
      <header class="header-bar" id="${instanceId}">
        <div class="header-inner max-w-7xl">
          <a href="/" class="brand-title">${escapeHtml(brand)}</a>
          <button class="mobile-toggle" aria-label="Toggle Navigation Menu" aria-expanded="false" data-toggle="mobile-nav">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
          </button>
          <nav class="nav-links" id="desktop-nav">
            ${links
              .map(
                (l: any) =>
                  `<a href="${escapeHtml(l.targetRoute || l.href)}" class="nav-link ${l.isButton ? "btn-secondary" : ""}">${escapeHtml(l.label)}</a>`
              )
              .join("")}
            ${content.ctaText ? `<a href="${escapeHtml(content.ctaRoute || "/contact")}" class="btn-primary">${escapeHtml(content.ctaText)}</a>` : ""}
          </nav>
        </div>
        <div class="mobile-drawer" id="mobile-nav" hidden>
          <div class="mobile-drawer-content">
            ${links
              .map(
                (l: any) =>
                  `<a href="${escapeHtml(l.targetRoute || l.href)}" class="mobile-nav-link">${escapeHtml(l.label)}</a>`
              )
              .join("")}
            ${content.ctaText ? `<a href="${escapeHtml(content.ctaRoute || "/contact")}" class="btn-primary" style="margin-top:1rem; width:100%; text-align:center;">${escapeHtml(content.ctaText)}</a>` : ""}
          </div>
        </div>
      </header>`;
    }

    case "hero.split": {
      const assetUrl = asset?.url || "assets/images/placeholder.svg";
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div class="hero-grid">
          <div>
            ${content.badge ? `<span class="badge">${escapeHtml(content.badge)}</span>` : ""}
            <h1 class="hero-h1">${escapeHtml(content.headline || "")}</h1>
            <p class="hero-p">${escapeHtml(content.subheadline || "")}</p>
            <div style="display:flex; gap:1rem; flex-wrap:wrap;">
              ${content.primaryCtaLabel ? `<a href="${escapeHtml(content.primaryCtaRoute || "/contact")}" class="btn-primary">${escapeHtml(content.primaryCtaLabel)}</a>` : ""}
              ${content.secondaryCtaLabel ? `<a href="${escapeHtml(content.secondaryCtaRoute || "/services")}" class="btn-secondary">${escapeHtml(content.secondaryCtaLabel)}</a>` : ""}
            </div>
          </div>
          <div>
            <img src="${escapeHtml(assetUrl)}" alt="${escapeHtml(asset?.altText || content.headline || "Hero image")}" class="hero-media" loading="eager" />
          </div>
        </div>
      </section>`;
    }

    case "hero.centered": {
      return `
      <section class="py-20 max-w-4xl px-4 text-center" id="${instanceId}">
        ${content.badge ? `<span class="badge">${escapeHtml(content.badge)}</span>` : ""}
        <h1 class="hero-h1" style="font-size:3.5rem;">${escapeHtml(content.headline || "")}</h1>
        <p class="hero-p" style="margin-left:auto; margin-right:auto;">${escapeHtml(content.subheadline || "")}</p>
        <div style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap;">
          ${content.primaryCtaLabel ? `<a href="${escapeHtml(content.primaryCtaRoute || "/contact")}" class="btn-primary">${escapeHtml(content.primaryCtaLabel)}</a>` : ""}
          ${content.secondaryCtaLabel ? `<a href="${escapeHtml(content.secondaryCtaRoute || "/about")}" class="btn-secondary">${escapeHtml(content.secondaryCtaLabel)}</a>` : ""}
        </div>
      </section>`;
    }

    case "hero.lead-form": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div class="hero-grid">
          <div>
            <h1 class="hero-h1">${escapeHtml(content.headline || "")}</h1>
            <p class="hero-p">${escapeHtml(content.subheadline || "")}</p>
            <ul style="list-style:none; padding:0; margin:1rem 0;">
              ${(content.perks || []).map((p: string) => `<li style="margin-bottom:0.5rem; font-weight:500;">✓ ${escapeHtml(p)}</li>`).join("")}
            </ul>
          </div>
          <div class="card-item" style="padding:2rem;">
            <h2 style="font-size:1.5rem; font-weight:700; margin-bottom:1rem;">${escapeHtml(content.formTitle || "Inquire Today")}</h2>
            <p style="font-size:0.875rem; color:var(--theme-muted); margin-bottom:1.5rem;">${escapeHtml(content.formSubtitle || "Complete the inquiry form below.")}</p>
            <form action="mailto:${escapeHtml(siteConfig?.businessProfile.email || "info@example.com")}" method="POST" enctype="text/plain" class="static-inquiry-form">
              <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.875rem; font-weight:600; margin-bottom:0.25rem;">Name</label>
                <input type="text" name="name" required style="width:100%; padding:0.625rem; border:1px solid var(--theme-border); border-radius:var(--theme-radius-btn);" />
              </div>
              <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.875rem; font-weight:600; margin-bottom:0.25rem;">Email</label>
                <input type="email" name="email" required style="width:100%; padding:0.625rem; border:1px solid var(--theme-border); border-radius:var(--theme-radius-btn);" />
              </div>
              <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.875rem; font-weight:600; margin-bottom:0.25rem;">Message</label>
                <textarea name="message" rows="3" required style="width:100%; padding:0.625rem; border:1px solid var(--theme-border); border-radius:var(--theme-radius-btn);"></textarea>
              </div>
              <button type="submit" class="btn-primary" style="width:100%;">${escapeHtml(content.ctaButtonText || "Send Inquiry")}</button>
            </form>
          </div>
        </div>
      </section>`;
    }

    case "hero.editorial": {
      const assetUrl = asset?.url || "assets/images/placeholder.svg";
      return `
      <section class="py-20 max-w-7xl px-4" id="${instanceId}">
        <div class="hero-grid">
          <div>
            ${content.kicker ? `<div style="font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:var(--theme-accent); margin-bottom:0.75rem;">${escapeHtml(content.kicker)}</div>` : ""}
            <h1 class="hero-h1">${escapeHtml(content.headline || "")}</h1>
            <p class="hero-p">${escapeHtml(content.subheadline || "")}</p>
            ${content.pullQuote ? `<blockquote style="border-left:2px solid var(--theme-accent); padding-left:1rem; font-style:italic; margin:1rem 0;">${escapeHtml(content.pullQuote)}</blockquote>` : ""}
            <div style="margin-top:1.5rem;"><a href="${escapeHtml(content.ctaRoute || "/about")}" class="btn-primary">${escapeHtml(content.ctaLabel || "Learn More")}</a></div>
          </div>
          <div>
            <img src="${escapeHtml(assetUrl)}" alt="${escapeHtml(asset?.altText || content.headline || "Featured photography")}" class="hero-media" loading="eager" />
          </div>
        </div>
      </section>`;
    }

    case "services.card-grid": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div style="text-align:center; max-width:48rem; margin:0 auto;">
          <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700;">${escapeHtml(content.heading || "Our Services")}</h2>
          ${content.intro ? `<p style="color:var(--theme-muted); font-size:1.125rem; margin-top:0.75rem;">${escapeHtml(content.intro)}</p>` : ""}
        </div>
        <div class="cards-grid">
          ${(content.items || [])
            .map(
              (item: any) => `
            <div class="card-item">
              ${item.badge ? `<span class="badge" style="margin-bottom:0.75rem;">${escapeHtml(item.badge)}</span>` : ""}
              <h3 style="font-family:var(--theme-font-display); font-size:1.25rem; font-weight:700; margin:0 0 0.5rem 0;">${escapeHtml(item.title)}</h3>
              <p style="color:var(--theme-muted); font-size:0.875rem; margin:0 0 1.5rem 0;">${escapeHtml(item.description)}</p>
              ${item.ctaLabel ? `<a href="${escapeHtml(item.targetRoute || "/contact")}" style="font-size:0.875rem; font-weight:600; color:var(--theme-primary);">${escapeHtml(item.ctaLabel)} &rarr;</a>` : ""}
            </div>`
            )
            .join("")}
        </div>
      </section>`;
    }

    case "services.alternating-rows": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div style="text-align:center; max-width:48rem; margin:0 auto 3rem auto;">
          <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700;">${escapeHtml(content.sectionHeading || "Capabilities")}</h2>
          ${content.sectionIntro ? `<p style="color:var(--theme-muted); margin-top:0.5rem;">${escapeHtml(content.sectionIntro)}</p>` : ""}
        </div>
        ${(content.rows || [])
          .map(
            (r: any) => `
          <div style="padding:2rem 0; border-bottom:1px solid var(--theme-border);">
            <h3 style="font-size:1.5rem; font-weight:700; margin-bottom:0.5rem;">${escapeHtml(r.title)}</h3>
            <p style="color:var(--theme-muted); font-size:1rem; margin-bottom:1rem;">${escapeHtml(r.description)}</p>
          </div>`
          )
          .join("")}
      </section>`;
    }

    case "services.list-detailed": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700; border-bottom:1px solid var(--theme-border); padding-bottom:1rem; margin-bottom:2rem;">${escapeHtml(content.headline || "Capabilities")}</h2>
        ${(content.items || [])
          .map(
            (item: any) => `
          <div style="display:flex; gap:2rem; padding:1.5rem 0; border-bottom:1px solid var(--theme-border);">
            <div style="font-family:monospace; font-size:1.5rem; font-weight:700; color:var(--theme-accent); width:3rem;">${escapeHtml(item.number || "•")}</div>
            <div style="flex:1;">
              <h3 style="font-size:1.25rem; font-weight:700;">${escapeHtml(item.title)}</h3>
              <p style="color:var(--theme-muted); font-size:0.875rem; margin-top:0.5rem;">${escapeHtml(item.summary || item.description || "")}</p>
            </div>
          </div>`
          )
          .join("")}
      </section>`;
    }

    case "services.pricing-table": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div style="text-align:center; max-width:48rem; margin:0 auto 3rem auto;">
          <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700;">${escapeHtml(content.heading || "Pricing Plans")}</h2>
        </div>
        <div class="cards-grid">
          ${(content.tiers || [])
            .map(
              (t: any) => `
            <div class="card-item" style="border:1px solid var(--theme-border); padding:2rem;">
              <h3 style="font-size:1.25rem; font-weight:700;">${escapeHtml(t.name)}</h3>
              <div style="font-size:2rem; font-weight:800; margin:1rem 0;">${escapeHtml(t.priceFormatted || t.price || "$0")}</div>
              <p style="color:var(--theme-muted); font-size:0.875rem; margin-bottom:1.5rem;">${escapeHtml(t.description)}</p>
              <a href="${escapeHtml(t.ctaRoute || "/contact")}" class="btn-primary" style="width:100%; text-align:center;">${escapeHtml(t.ctaLabel || "Get Started")}</a>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
    }

    case "about.story": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700; margin-bottom:1.5rem;">${escapeHtml(content.title || "About Us")}</h2>
        ${(content.storyParagraphs || [])
          .map((p: string) => `<p style="font-size:1.125rem; line-height:1.7; color:var(--theme-muted); margin-bottom:1rem;">${escapeHtml(p)}</p>`)
          .join("")}
        ${content.missionStatement ? `<blockquote style="padding:1rem 1.5rem; border-left:4px solid var(--theme-accent); background:var(--theme-surface); font-style:italic; margin:1.5rem 0;">${escapeHtml(content.missionStatement)}</blockquote>` : ""}
      </section>`;
    }

    case "about.values-grid": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div style="text-align:center; max-width:48rem; margin:0 auto 3rem auto;">
          <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700;">${escapeHtml(content.heading || "Our Principles")}</h2>
        </div>
        <div class="cards-grid">
          ${(content.pillars || [])
            .map(
              (p: any) => `
            <div class="card-item">
              <h3 style="font-size:1.125rem; font-weight:700; margin-bottom:0.5rem;">${escapeHtml(p.title)}</h3>
              <p style="color:var(--theme-muted); font-size:0.875rem;">${escapeHtml(p.description)}</p>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
    }

    case "about.team-grid": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div style="text-align:center; max-width:48rem; margin:0 auto 3rem auto;">
          <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700;">${escapeHtml(content.headline || "Leadership")}</h2>
        </div>
        <div class="cards-grid">
          ${(content.members || [])
            .map(
              (m: any) => `
            <div class="card-item" style="text-align:center;">
              <h3 style="font-size:1.25rem; font-weight:700;">${escapeHtml(m.name)}</h3>
              <div style="font-size:0.75rem; font-weight:600; text-transform:uppercase; color:var(--theme-primary); margin:0.25rem 0 0.75rem 0;">${escapeHtml(m.role)}</div>
              <p style="color:var(--theme-muted); font-size:0.875rem;">${escapeHtml(m.bio)}</p>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
    }

    case "proof.metrics-counter": {
      return `
      <section class="py-16 max-w-7xl px-4" style="border-top:1px solid var(--theme-border); border-bottom:1px solid var(--theme-border);" id="${instanceId}">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:2rem; text-align:center;">
          ${(content.metrics || [])
            .map(
              (m: any) => `
            <div>
              <div style="font-size:2.5rem; font-weight:800; color:var(--theme-primary); font-family:var(--theme-font-display);">${escapeHtml(m.value)}</div>
              <div style="font-size:0.875rem; font-weight:600; margin-top:0.25rem;">${escapeHtml(m.label)}</div>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
    }

    case "proof.testimonials-slider": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div style="text-align:center; max-width:48rem; margin:0 auto 3rem auto;">
          <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700;">${escapeHtml(content.heading || "Client Feedback")}</h2>
        </div>
        <div class="cards-grid">
          ${(content.testimonials || [])
            .map(
              (t: any) => `
            <div class="card-item">
              <blockquote style="font-style:italic; font-size:1rem; margin-bottom:1rem;">&ldquo;${escapeHtml(t.quote)}&rdquo;</blockquote>
              <div style="font-weight:700; font-size:0.875rem;">${escapeHtml(t.authorName)}</div>
              <div style="font-size:0.75rem; color:var(--theme-muted);">${escapeHtml(t.authorTitle || "")}</div>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
    }

    case "faq.accordion": {
      return `
      <section class="py-16 max-w-4xl px-4" id="${instanceId}">
        <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700; text-align:center; margin-bottom:2.5rem;">${escapeHtml(content.heading || "Frequently Asked Questions")}</h2>
        ${(content.items || [])
          .map(
            (item: any) => `
          <details class="faq-item" style="padding:1.25rem; border:1px solid var(--theme-border); border-radius:var(--theme-radius-card); margin-bottom:1rem; background:var(--theme-bg);">
            <summary style="font-weight:700; font-size:1.125rem; cursor:pointer;">${escapeHtml(item.question)}</summary>
            <p style="margin-top:0.75rem; color:var(--theme-muted); font-size:0.875rem; line-height:1.6;">${escapeHtml(item.answer)}</p>
          </details>`
          )
          .join("")}
      </section>`;
    }

    case "cta.fullwidth-accent": {
      return `
      <section class="py-20 px-4" style="background:var(--theme-primary); color:#ffffff; text-align:center;" id="${instanceId}">
        <div class="max-w-4xl" style="margin:0 auto;">
          <h2 style="font-size:2.5rem; font-weight:800; margin-bottom:1rem; color:#ffffff;">${escapeHtml(content.headline || "Ready to Begin?")}</h2>
          ${content.subhead ? `<p style="font-size:1.125rem; opacity:0.9; margin-bottom:2rem; color:#ffffff;">${escapeHtml(content.subhead)}</p>` : ""}
          <a href="${escapeHtml(content.ctaRoute || "/contact")}" class="btn-primary" style="background:var(--theme-accent); color:#ffffff; font-size:1rem; padding:0.875rem 2rem;">${escapeHtml(content.ctaLabel || "Get in Touch")}</a>
        </div>
      </section>`;
    }

    case "contact.split-details": {
      const email = content.email || siteConfig?.businessProfile.email || "info@example.com";
      const phone = content.phone || siteConfig?.businessProfile.phone || "";
      const location = content.location || siteConfig?.businessProfile.location || "";
      const whatsapp = content.whatsapp || siteConfig?.businessProfile.whatsapp || "";

      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div class="hero-grid">
          <div>
            <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700; margin-bottom:1rem;">${escapeHtml(content.heading || "Contact Us")}</h2>
            ${content.subhead ? `<p style="color:var(--theme-muted); margin-bottom:2rem;">${escapeHtml(content.subhead)}</p>` : ""}
            ${email ? `<p style="margin-bottom:0.75rem;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` : ""}
            ${phone ? `<p style="margin-bottom:0.75rem;"><strong>Phone:</strong> <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></p>` : ""}
            ${whatsapp ? `<p style="margin-bottom:0.75rem;"><strong>WhatsApp:</strong> <a href="https://wa.me/${escapeHtml(whatsapp.replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener">Chat on WhatsApp</a></p>` : ""}
            ${location ? `<p style="margin-bottom:0.75rem;"><strong>Location:</strong> ${escapeHtml(location)}</p>` : ""}
          </div>
          <div class="card-item" style="padding:2rem;">
            <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:0.75rem;">Send a Message</h3>
            <p style="font-size:0.875rem; color:var(--theme-muted); margin-bottom:1.5rem;">Direct inquiry dispatched to our customer desk.</p>
            <form action="mailto:${escapeHtml(email)}" method="POST" enctype="text/plain" class="static-inquiry-form">
              <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.875rem; font-weight:600; margin-bottom:0.25rem;">Your Name</label>
                <input type="text" name="name" required style="width:100%; padding:0.625rem; border:1px solid var(--theme-border); border-radius:var(--theme-radius-btn);" />
              </div>
              <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.875rem; font-weight:600; margin-bottom:0.25rem;">Your Email</label>
                <input type="email" name="email" required style="width:100%; padding:0.625rem; border:1px solid var(--theme-border); border-radius:var(--theme-radius-btn);" />
              </div>
              <div style="margin-bottom:1rem;">
                <label style="display:block; font-size:0.875rem; font-weight:600; margin-bottom:0.25rem;">Your Message</label>
                <textarea name="message" rows="3" required style="width:100%; padding:0.625rem; border:1px solid var(--theme-border); border-radius:var(--theme-radius-btn);"></textarea>
              </div>
              <button type="submit" class="btn-primary" style="width:100%;">Send Email</button>
            </form>
          </div>
        </div>
      </section>`;
    }

    case "blog.index": {
      return `
      <section class="py-16 max-w-7xl px-4" id="${instanceId}">
        <div style="text-align:center; max-width:48rem; margin:0 auto 3rem auto;">
          <h2 style="font-family:var(--theme-font-display); font-size:2rem; font-weight:700;">${escapeHtml(content.heading || "Latest Insights")}</h2>
        </div>
        <div class="cards-grid">
          ${(content.articles || [])
            .map(
              (art: any) => `
            <div class="card-item">
              <div style="font-size:0.75rem; text-transform:uppercase; color:var(--theme-accent); font-weight:600; margin-bottom:0.5rem;">${escapeHtml(art.category || "Article")}</div>
              <h3 style="font-size:1.25rem; font-weight:700; margin-bottom:0.5rem;">${escapeHtml(art.title)}</h3>
              <p style="color:var(--theme-muted); font-size:0.875rem;">${escapeHtml(art.excerpt || art.summary || "")}</p>
            </div>`
            )
            .join("")}
        </div>
      </section>`;
    }

    case "shell.footer": {
      const brand = content.brandName || siteConfig?.footer.brandSummary || siteConfig?.businessProfile.name || "";
      const summary = content.brandSummary || siteConfig?.footer.brandSummary || "";
      const columns = content.columns || siteConfig?.footer.columns || [];
      const copyright = content.copyrightText || siteConfig?.footer.copyrightText || `© ${new Date().getFullYear()} ${siteConfig?.businessProfile.name || "All rights reserved"}.`;

      return `
      <footer class="footer-section" id="${instanceId}">
        <div class="max-w-7xl px-4">
          <div class="footer-grid">
            <div>
              <div class="brand-title">${escapeHtml(brand)}</div>
              <p style="font-size:0.875rem; color:var(--theme-muted); margin-top:0.75rem;">${escapeHtml(summary)}</p>
            </div>
            ${columns
              .map(
                (col: any) => `
              <div>
                <div style="font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1rem;">${escapeHtml(col.title)}</div>
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                  ${(col.links || []).map((l: any) => `<a href="${escapeHtml(l.href || l.targetRoute)}" style="font-size:0.875rem; color:var(--theme-muted);">${escapeHtml(l.label)}</a>`).join("")}
                </div>
              </div>`
              )
              .join("")}
          </div>
          <div style="padding-top:2rem; font-size:0.75rem; color:var(--theme-muted);">${escapeHtml(copyright)}</div>
        </div>
      </footer>`;
    }

    case "shell.footer.minimal": {
      const brand = content.brandName || siteConfig?.businessProfile.name || "";
      const copyright = content.copyrightText || siteConfig?.footer.copyrightText || `© ${new Date().getFullYear()} ${siteConfig?.businessProfile.name || "All rights reserved"}.`;

      return `
      <footer style="padding:2.5rem 1rem; border-top:1px solid var(--theme-border); background:var(--theme-surface);" id="${instanceId}">
        <div class="max-w-7xl" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; font-size:0.875rem; margin:0 auto;">
          <div style="font-weight:700;">${escapeHtml(brand)}</div>
          <div style="color:var(--theme-muted); font-size:0.75rem;">${escapeHtml(copyright)}</div>
        </div>
      </footer>`;
    }

    default:
      return `<div id="${instanceId}" data-unknown-section="${escapeHtml(sec.sectionId)}"></div>`;
  }
}

function getBaseStyles(cssVariablesString: string): string {
  return `
/* Fortress AI Generated Stylesheet (TDD §21.1) */
:root { ${cssVariablesString} }

*, ::before, ::after { box-sizing: border-box; border-width: 0; border-style: solid; }
html { line-height: 1.5; -webkit-text-size-adjust: 100%; font-family: var(--theme-font-body, system-ui, -apple-system, sans-serif); scroll-behavior: smooth; }
body { margin: 0; background-color: var(--theme-bg, #faf8f3); color: var(--theme-text, #1d2a2a); }
a { color: inherit; text-decoration: inherit; }
img { display: block; max-width: 100%; height: auto; }

.max-w-7xl { max-width: 80rem; margin-left: auto; margin-right: auto; }
.max-w-4xl { max-width: 56rem; margin-left: auto; margin-right: auto; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-16 { padding-top: 4rem; padding-bottom: 4rem; }
.py-20 { padding-top: 5rem; padding-bottom: 5rem; }
.text-center { text-align: center; }

/* Navigation */
.header-bar { position: sticky; top: 0; z-index: 50; width: 100%; background: var(--theme-surface, #ffffff); border-bottom: 1px solid var(--theme-border, #e2e8f0); }
.header-inner { display: flex; align-items: center; justify-content: space-between; height: 4.5rem; padding: 0 1.5rem; }
.brand-title { font-family: var(--theme-font-display, serif); font-size: 1.25rem; font-weight: 700; color: var(--theme-primary, #0f172a); }
.nav-links { display: flex; align-items: center; gap: 1.5rem; }
.nav-link { font-size: 0.875rem; font-weight: 500; color: var(--theme-text, #1e293b); transition: color 0.15s ease; }
.nav-link:hover { color: var(--theme-primary, #0f172a); }

/* Buttons */
.btn-primary { display: inline-flex; align-items: center; justify-content: center; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 600; background: var(--theme-primary, #0f172a); color: #ffffff !important; border-radius: var(--theme-radius-btn, 0.375rem); cursor: pointer; transition: opacity 0.15s ease; border: none; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { display: inline-flex; align-items: center; justify-content: center; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 600; background: var(--theme-surface, #ffffff); color: var(--theme-text, #1d2a2a); border: 1px solid var(--theme-border, #e2ddd3); border-radius: var(--theme-radius-btn, 0.375rem); cursor: pointer; }
.btn-secondary:hover { background: var(--theme-bg, #faf8f3); }

/* Heroes */
.hero-grid { display: grid; grid-template-columns: 1fr; gap: 2.5rem; align-items: center; }
.badge { display: inline-block; padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; border-radius: 9999px; background: var(--theme-surface, #ffffff); color: var(--theme-accent, #d6a24a); border: 1px solid var(--theme-border, #e2ddd3); margin-bottom: 1rem; }
.hero-h1 { font-family: var(--theme-font-display, serif); font-size: 2.5rem; font-weight: 700; line-height: 1.15; color: var(--theme-text, #1d2a2a); margin: 0 0 1.25rem 0; }
.hero-p { font-size: 1.125rem; line-height: 1.7; color: var(--theme-muted, #586766); margin: 0 0 2rem 0; }
.hero-media { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: var(--theme-radius-card, 1rem); border: 1px solid var(--theme-border, #e2ddd3); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08); }

/* Cards & Layouts */
.cards-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; margin-top: 2.5rem; }
.card-item { padding: 1.75rem; border-radius: var(--theme-radius-card, 1rem); background: var(--theme-surface, #ffffff); border: 1px solid var(--theme-border, #e2ddd3); box-shadow: 0 1px 3px 0 rgba(0,0,0,0.04); }

/* Footer */
.footer-section { padding-top: 4rem; padding-bottom: 3rem; background: var(--theme-surface, #ffffff); border-top: 1px solid var(--theme-border, #e2ddd3); }
.footer-grid { display: grid; grid-template-columns: 1fr; gap: 2.5rem; padding-bottom: 3rem; border-bottom: 1px solid var(--theme-border, #e2ddd3); }

/* Mobile Navigation Drawer */
.mobile-toggle { display: none; background: transparent; border: none; cursor: pointer; padding: 0.5rem; flex-direction: column; gap: 4px; }
.hamburger-line { width: 22px; height: 2px; background: var(--theme-text, #1e293b); transition: 0.2s ease; }
.mobile-drawer { display: none; background: var(--theme-surface, #ffffff); border-bottom: 1px solid var(--theme-border, #e2ddd3); padding: 1.5rem; }
.mobile-drawer-content { display: flex; flex-direction: column; gap: 1rem; }
.mobile-nav-link { font-size: 1rem; font-weight: 600; color: var(--theme-text, #1e293b); padding: 0.5rem 0; border-bottom: 1px solid var(--theme-border, #e2ddd3); }

@media (max-width: 768px) {
  .nav-links { display: none; }
  .mobile-toggle { display: flex; }
  .mobile-drawer:not([hidden]) { display: block; }
}

@media (min-width: 768px) {
  .cards-grid { grid-template-columns: repeat(2, 1fr); }
  .footer-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .hero-grid { grid-template-columns: 7fr 5fr; }
  .hero-h1 { font-size: 3.5rem; }
  .cards-grid { grid-template-columns: repeat(3, 1fr); }
  .footer-grid { grid-template-columns: repeat(4, 1fr); }
}

/* WCAG 2.1 AA Vestibular & Reduced Motion Support (TDD §18.3) */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
}

function getClientScript(): string {
  return `/**
 * Fortress AI Client Runtime for Static Sites (TDD §21.1)
 */
(function() {
  // Mobile navigation drawer toggle
  var toggleBtn = document.querySelector('[data-toggle="mobile-nav"]');
  var mobileDrawer = document.getElementById('mobile-nav');
  if (toggleBtn && mobileDrawer) {
    toggleBtn.addEventListener('click', function() {
      var isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', !isExpanded);
      if (isExpanded) {
        mobileDrawer.setAttribute('hidden', '');
      } else {
        mobileDrawer.removeAttribute('hidden');
      }
    });
  }

  // Accessible details/accordion smooth toggle
  var detailsElements = document.querySelectorAll('details.faq-item');
  detailsElements.forEach(function(detail) {
    detail.addEventListener('toggle', function() {
      if (detail.open) {
        detailsElements.forEach(function(other) {
          if (other !== detail && other.open) {
            other.removeAttribute('open');
          }
        });
      }
    });
  });
})();
`;
}

export function escapeHtml(str?: string | number | null): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
