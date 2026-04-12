# Rural Community Platform — Design Document

**Date:** 2026-04-12
**Status:** Draft v2 (revised after competitive analysis)

## Vision

A SaaS platform for small French communes (<2,000 inhabitants) that replaces fragmented Facebook groups, paper mail, phone calls, and word of mouth with one centralized app for local life — combining community interaction, official communication, and mairie daily tools in a single product.

Unlike existing solutions (PanneauPocket, IntraMuros) that focus on top-down municipal communication, this platform covers the full spectrum: official announcements, peer-to-peer community life, and back-office mairie tools.

## Competitive Positioning

| Existing solutions | What they do | What they don't do |
|---|---|---|
| PanneauPocket (14k+ communes) | Alerts, official info push | No community features, no website, no mairie tools |
| IntraMuros (8k+ communes) | Municipal comms, some interaction | No peer-to-peer, no website, no mairie tools |
| Neocity, Citopia, Lumiplan | App + website for larger cities | Expensive, not designed for <2k communes |
| Smiile (currently offline) | Peer-to-peer entraide | No official comms, no mairie tools |

**Our differentiator:** One platform = commune website + resident app + mairie back-office. One input, multiple outputs. The mairie posts once, it appears in the app, on the website, and triggers push notifications.

## Business Model

| Revenue stream | Price | Who pays |
|---|---|---|
| Commune subscription (app + website) | €50-150/month | Mairie |
| EPCI group subscription | €30-100/month per commune (volume discount) | Intercommunalité |
| Featured service listing | €5-10/month | Professional providers |
| Peer-to-peer features | Free | Nobody — community spirit preserved |

## Tech Stack

- **Frontend:** Next.js (React)
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **Deployment:** Vercel
- **Geo:** PostGIS extension on Supabase Postgres

## Architecture

### Multi-tenancy

- One commune = one space
- Communes belong to an intercommunalité (EPCI) — this is the grouping layer
- Two-level visibility:
  - **Commune view** (default): only posts from your commune
  - **Intercommunalité view** (toggle): posts from all member communes
- Posts are scoped by default to the commune. Residents can mark certain posts (carpooling, services, group buying, events) as "visible to intercommunalité"
- Mairie official posts always stay within their commune

### Roles

- **Resident:** post, comment, RSVP, use community features
- **Mairie admin:** all resident abilities + official announcements, moderation, mairie tools, website management
- **EPCI admin:** read-only dashboard across member communes, shared announcements

### Auth

- Email/phone sign-up, residents validated by mairie (invite code or manual approval)
- Resident selects their commune during onboarding
- Can follow additional communes within their EPCI (opt-in)

### Commune Website

- Auto-generated static site from app content (announcements, events, services, documents)
- One opinionated template, branded with commune logo + colors
- RGAA accessibility compliant out of the box
- Legal mentions auto-generated (required for commune websites)
- No CMS — the app IS the CMS. Post in the app, it appears on the website.
- Custom domain support (macommune.fr)
- SEO-friendly (server-rendered, proper meta tags)

## Features (in build order)

### v1 — Community Board + Official Announcements

The foundation: get mairie and residents on the same platform.

- **Post types:** annonce officielle, événement, entraide, discussion
- Chronological feed, pinned official posts on top
- Comments, photo attachments, RSVP for events
- Push notifications (web push / PWA):
  - Mandatory for: official announcements, safety alerts
  - Opt-in for: events, community posts
- Mairie admin panel: moderation, post as official, manage residents
- Account management: email/phone change, password reset, delete account
- Intercommunalité toggle: switch between commune and EPCI-wide feed

### v2 — Commune Website

The upsell that justifies the subscription for the mairie.

- Auto-generated website synced from app content
- Pages: Accueil (latest news), Événements, Associations, Infos pratiques, Contact
- Bulletin municipal digital: auto-compiled from recent official posts (replaces printed bulletin, saves commune budget)
- Conseil municipal section: upload and publish délibérations, PV, comptes-rendus (legal compliance)
- Mobile-responsive, RGAA compliant, legal mentions included

### v3 — Mairie Back-Office Tools

Daily-task features that make the platform indispensable.

- **Salle des fêtes / room booking:** calendar view, reservation requests from residents or associations, conflict detection, approval workflow
- **Signalement (issue reporting):** residents submit photo + GPS location for problems (pothole, broken streetlight, illegal dump). Mairie sees a ticket board with status tracking (signalé → en cours → résolu). Optionally visible on the website.
- **Association directory:** list of local associations with contact, activities, meeting schedule. Associations can self-manage their listing. Shared calendar to avoid double-booking rooms.
- **Document sharing:** official documents (arrêtés, PLU, etc.) available to residents via app and website

### v4 — Local Services Directory

Revenue diversification through featured listings.

- Professional listings (paid featured placement, SIRET verified) and neighbor listings (free)
- Browse by category, search, filter by coverage area (commune or intercommunalité)
- "Je recommande" count instead of star ratings
- Mairie can flag/remove listings
- Visible on commune website

### v5 — Group Buying / Delivery Coordination

- "I'm going shopping" trips and "group order" campaigns
- Participant list with requests, join deadline, status updates
- No payment processing — settlement is peer-to-peer
- Visible to intercommunalité by default (more participants = more useful)

### v6 — Carpooling / Ride Matching

- Offer and request rides (one-off or recurring)
- Browse + smart notifications for matching routes
- Suggested cost based on distance, settled peer-to-peer
- Ride history for trust building
- Scoped to intercommunalité by default (rides cross commune boundaries)

## What the Platform is NOT

- Not social media (no likes, no algorithm, no DMs, no addiction mechanics)
- Not a payment processor
- Not a native app (PWA first — native only if needed later)
- Not a generic CMS (the website is a mirror of app content, not independently editable)
- No complex matching algorithms — feed + notifications is enough at village scale

## Launch Strategy

1. Build v1, deploy in your own village
2. Get mairie on board as admin
3. Iterate based on real usage
4. Ship v2 (website) — this is the moment the mairie sees concrete value and starts paying
5. Expand to neighboring communes, pitch to the EPCI for group deal
6. Add v3-v6 progressively based on demand
7. Scale across rural France
