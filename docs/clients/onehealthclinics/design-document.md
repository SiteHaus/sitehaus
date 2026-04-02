# Design Document — OneHealthClinics.com Rebuild

**Client:** One Health / Dixie Primary Care
**Location:** St. George, Utah
**Status:** Tentative — For Estimation
**Date:** 2026-03-03

---

## 1. Project Overview

Full custom rebuild of onehealthclinics.com. Currently a WordPress + Divi + WooCommerce site that is slow, hard to maintain, and generic. The goal is a fast, custom-built marketing site with integrated supplement e-commerce — preserving the existing visual identity ("don't touch my cheese") while delivering a significantly better experience, performance, and maintainability.

**What stays the same:**
- Brand colors (blue + white, `#2EA3F2`)
- "Dedicated Compassionate Care" tagline
- Content/copy (no copy rewrite in scope)
- Design aesthetic (modernize/clean, not redesign)

**What changes:**
- Technology — off WordPress/Divi entirely
- Performance — fast, static-first Next.js
- E-commerce — TBD (see Section 6)
- Code quality — maintainable, no page builder hell

---

## 2. Site Map

| # | Page | Route | Notes |
|---|------|--------|-------|
| 1 | Home | `/` | Hero, services overview, CTAs |
| 2 | Services | `/services` | General primary care services |
| 3 | Specialty Services | `/services/specialty` | Specialty care detail |
| 4 | Pediatrics | `/services/pediatrics` | Dedicated pediatrics page |
| 5 | About | `/about` | Team, providers, mission |
| 6 | Contact | `/contact` | Form, location, hours, map |
| 7 | Vitamins | `/vitamins` | Marketing/landing for the supplement line |
| 8 | Shop | `/shop` | Product listing (12 products) |
| 9 | Product Page | `/shop/[slug]` | Individual product detail |
| 10 | Cart | `/cart` | Shopping cart |
| 11 | Checkout | `/checkout` | Payment + order submission |
| 12 | Account | `/account` | Order history, account management |
| 13 | Order Confirmation | `/order/[id]` | Post-purchase confirmation |

**Total pages: 13** (+ dynamic product routes)

---

## 3. Page Specifications

### 3.1 Home (`/`)
- Hero section — headline, subheadline, primary CTA ("Book Appointment", "Call Us")
- Services overview — 4–6 service cards linking to service pages
- "Why One Health" section — trust signals, compassionate care messaging
- Pediatrics callout — dedicated CTA block
- Supplement/vitamins teaser — drives traffic to shop
- Location + hours strip — address, phone, hours at a glance
- Social proof / patient testimonials (if client can provide)

### 3.2 Services (`/services`)
- Overview of all primary care services
- Cards or accordion for service categories
- CTA per service — "Book Appointment" or "Learn More"
- Services to cover:
  - Primary & Preventive Care
  - Family Medicine
  - Urgent Care
  - Same-Day Appointments
  - Well-Child Checks & Immunizations
  - Teen Health
  - Sports Physicals

### 3.3 Specialty Services (`/services/specialty`)
- Detail page for specialty offerings
- **TBD:** Need client to provide a list of their specialty services
- Similar layout to general services

### 3.4 Pediatrics (`/services/pediatrics`)
- Dedicated page for infant, child, and teen care
- Age ranges served
- Services: well-child checks, immunizations, teen health, sports physicals
- Provider info if applicable
- "Book Appointment" CTA

### 3.5 About (`/about`)
- Clinic story / founding mission
- Provider bios + headshots (photos to be provided by client)
- Staff/team section
- "Dedicated Compassionate Care" brand story
- **TBD:** Need provider names, credentials, and bios from client

### 3.6 Contact (`/contact`)
- Contact form (name, email, phone, message, subject)
- Phone number + click-to-call
- Physical address + embedded Google Map
- Office hours (by day)
- "Book Appointment" link to scheduling system

### 3.7 Vitamins (`/vitamins`)
- Landing/marketing page for the supplement product line
- Brand story / why they sell supplements
- Featured products with links to shop
- CTA to full shop

### 3.8 Shop (`/shop`)
- Product grid — all 12 products
- Category filter if needed
- Product card: image, name, price, "Add to Cart"

### 3.9 Product Page (`/shop/[slug]`)
- Product name, description, price
- Product images
- Add to Cart
- Related products

### 3.10 Cart (`/cart`)
- Line items, quantity controls, remove
- Subtotal
- "Proceed to Checkout"

### 3.11 Checkout (`/checkout`)
- Shipping address
- Payment (Stripe)
- Order summary
- Place order

### 3.12 Account (`/account`)
- Login / register
- Order history
- Account details (name, email, password)

---

## 4. Global Components

These appear across all pages:

| Component | Notes |
|-----------|-------|
| **Header/Nav** | Logo, nav links, "Book Appointment" CTA button, mobile hamburger |
| **Footer** | Address, phone, hours, nav links, social icons (Facebook, Twitter/X, Instagram) |
| **Appointment CTA** | Persistent "Book Appointment" button — links to scheduling system (embed or external) |
| **Cookie Banner** | Basic consent banner |
| **SEO** | Meta titles, descriptions, OG tags per page |

---

## 5. Third-Party Integrations

| Integration | Purpose | Status |
|-------------|---------|--------|
| **Appointment Scheduling** | Embedded booking widget or external link | **TBD — need to confirm EMR/scheduling system (Healow, Athena, Zocdoc, etc.)** |
| **Patient Portal** | External link out to third-party portal | External link only, no custom build |
| **Google Maps** | Location embed on Contact page | Standard embed |
| **Google Analytics / Tag Manager** | Site analytics | Standard |
| **Stripe** | Payment processing for shop | Included in e-commerce scope |
| **Email (transactional)** | Order confirmations, contact form submissions | Resend or similar |
| **Social Links** | Facebook, Twitter/X, Instagram | Links only |

---

## 6. E-Commerce Scope

The supplement shop is a meaningful chunk of scope. Three viable paths:

---

### Option A — Custom E-Commerce (Full Build)
**Best for:** Long-term ownership, maximum control, no recurring SaaS fees

Build a full custom storefront and product management backend.

**Includes:**
- Product CRUD admin panel (add/edit/delete products, manage images, set prices, stock)
- Customer accounts (register, login, order history)
- Shopping cart + Stripe checkout
- Order management (admin can view/fulfill orders)
- Email notifications (order confirmation, shipping update)
- Cloudflare R2 for product image storage

**Estimate:** ~80–100 hours of development
**Ongoing:** No SaaS fees — just hosting

---

### Option B — Shopify Storefront API (Recommended Middle Ground)
**Best for:** Minimal client management overhead, proven checkout, fast to ship

- Client manages products in Shopify admin (familiar, well-documented)
- We build a fully custom Next.js storefront using Shopify's Storefront API
- Shopify handles cart, checkout, payments, inventory, order emails
- Looks 100% custom — no "Shopify" branding visible

**Includes:**
- Custom Next.js product/cart/checkout UI talking to Shopify API
- Client gets Shopify admin for product management (they already know how to use it)

**Estimate:** ~30–40 hours of development
**Ongoing:** Shopify Basic plan ~$39/mo (client cost)

---

### Option C — Keep WooCommerce (Hybrid / Not Recommended)
**Best for:** Budget-constrained, keeping existing order history

- New custom Next.js marketing site
- WooCommerce REST API as headless backend
- Client stays on WordPress for product management only

**Problems:**
- Still maintaining WordPress (security updates, plugin hell)
- Headless WooCommerce is messy
- Two systems to maintain long-term

**Estimate:** ~40–50 hours (ironically more work than Option B for a worse result)
**Ongoing:** WordPress hosting + WooCommerce maintenance

---

### E-Commerce Recommendation
**Option B (Shopify)** is almost certainly the right call for 12 products. The client gets a professional admin interface for free, we build a beautiful custom storefront, and nobody has to maintain a custom inventory/order system. If they ever want to go fully custom (Option A), that's a future project when scale warrants it.

---

## 7. Out of Scope

These items are explicitly NOT included in this engagement:

| Item | Reason |
|------|--------|
| Patient portal | Third-party app — external link only |
| HIPAA-compliant data handling | This is a marketing site, no PHI stored |
| Appointment booking system build | Embed/link to existing EMR system |
| Copy/content writing | Client provides all copy |
| Photography / videography | Client provides all photos |
| Logo redesign | Existing brand kept as-is |
| Email marketing system | Out of scope |
| Blog / news section | Not present on current site |
| Custom EMR integration | Not in scope |

---

## 8. Content Dependencies (Client Must Provide)

| Item | Needed For |
|------|-----------|
| Specialty services list + descriptions | Specialty Services page |
| Provider names, credentials, headshots | About page |
| Full office hours | Contact page, Footer, Home |
| Phone number, full address | Contact page, Footer |
| Appointment booking URL / embed code | All "Book Appointment" CTAs |
| Patient portal URL | Footer / Nav |
| Clinic story / mission copy | About page |
| Testimonials (optional) | Home page |
| Product photos (hi-res) | Shop |
| Product descriptions | Shop |

---

## 9. Estimation Buckets

| Area | Scope | Est. Hours |
|------|-------|------------|
| Project setup + infrastructure | Next.js app, hosting, CI/CD | 8–12 |
| Design system + components | Header, footer, nav, typography, buttons, cards | 16–24 |
| Marketing pages (Home, Services, Specialty, Pediatrics, About, Contact, Vitamins) | 7 pages | 30–45 |
| E-Commerce — Option A (Custom) | Full admin + storefront | 80–100 |
| E-Commerce — Option B (Shopify) | Custom storefront only | 30–40 |
| SEO + Analytics setup | Meta tags, GA/GTM, sitemap | 6–8 |
| Testing + QA | Cross-browser, mobile, performance | 10–16 |
| Launch + deployment | DNS, SSL, go-live | 4–6 |

**Total (Option B / Shopify):** ~104–151 hours
**Total (Option A / Custom):** ~154–211 hours

---

## 10. Open Questions

- [ ] Which EMR/scheduling system do they use? (Confirms appointment booking scope)
- [ ] Do they have an existing patient portal URL/link?
- [ ] Are they open to Shopify for product management, or do they want to own the whole stack?
- [ ] Who provides copy — client writes it, or do we need a copywriter?
- [ ] Do they have existing product photography or need new shots?
- [ ] Any existing Google Analytics / Search Console data to preserve?
- [ ] Domain stays at onehealthclinics.com? Any redirect needs from old WordPress URLs?
- [ ] Do they need ongoing maintenance/hosting, or just a handoff?

---

*Document prepared by SiteHaus — tentative, for estimation purposes only.*
