import manifest from "./designs.manifest.json";

/**
 * Design work shown on the home page, /design and /design/[slug].
 *
 * Copy here describes only what is visible in the screens themselves. Where the work was for a
 * client, add the client and your exact role before publishing; nothing below claims either.
 *
 * Images live in public/designs/<slug>/ and are produced by `npm run import-designs`, which also
 * writes lib/designs.manifest.json (exact pixel sizes, so pages never shift while loading).
 *
 *   featured: true  -> shown first, large (keep this to three)
 *   published: false -> not listed, not in the sitemap, and its page returns 404
 */

type Dim = { width: number; height: number };
type Manifest = Record<string, { cover: Dim; og: Dim; images: Record<string, Dim> }>;
const sizes = manifest as Manifest;

export type DesignImage = { src: string; width: number; height: number; alt: string; caption: string };
export type Design = {
  slug: string;
  title: string;
  kind: string;
  /** Taken from the © line inside the design; edit if the work dates from another year. */
  year?: string;
  summary: string;
  overview: string[];
  highlights: string[];
  tags: string[];
  cover: { src: string; width: number; height: number };
  og: { src: string; width: number; height: number };
  images: DesignImage[];
  featured: boolean;
  published: boolean;
};

type Def = Omit<Design, "cover" | "og" | "images"> & { images: { id: string; alt: string; caption: string }[] };

const FALLBACK: Dim = { width: 1200, height: 900 };

function build(def: Def): Design {
  const dir = `/designs/${def.slug}`;
  const m = sizes[def.slug];
  return {
    ...def,
    cover: { src: `${dir}/cover.webp`, ...(m?.cover ?? FALLBACK) },
    og: { src: `${dir}/og.jpg`, ...(m?.og ?? { width: 1200, height: 630 }) },
    images: def.images.map((img) => ({
      src: `${dir}/${img.id}.webp`,
      alt: img.alt,
      caption: img.caption,
      ...(m?.images[img.id] ?? FALLBACK),
    })),
  };
}

const DEFS: Def[] = [
  {
    slug: "techsis",
    title: "Techsis",
    kind: "Community app and landing page",
    summary:
      "A community app for women in tech: onboarding, member discovery, groups and group chat in light and dark themes, plus the landing page that introduces it.",
    overview: [
      "Techsis is a social app for women working in tech. A new member lands on a cluster of faces and one decision: start connecting, or switch to connecting with a tech bro instead. The home screen then offers a featured group to join and a list of members, each with a short tagline and a Message button.",
      "The group chat covers photo messages, replies, a system message when someone is removed, and shortcuts to video and voice calls. Onboarding and chat were also drawn in a dark theme that keeps the same purple, spacing and components.",
      "The landing page puts the app in a phone mockup surrounded by member avatars and role labels (UX writers, Product Designers, Developers), with a sign-up button in the navigation.",
    ],
    highlights: [
      "Light and dark themes for onboarding and group chat",
      "Member discovery with taglines and one-tap messaging",
      "Group chat with photo messages, replies and call shortcuts",
      "Landing page built around a phone mockup and role labels",
    ],
    tags: ["Mobile app", "Landing page", "Dark mode", "Community"],
    featured: true,
    published: true,
    images: [
      {
        id: "01",
        alt: "Techsis landing page with the headline 'The only app you need as a tech sis' above a phone mockup of the home screen, surrounded by member avatars",
        caption: "Landing page",
      },
      {
        id: "02",
        alt: "Techsis onboarding screen: a cluster of member photos above the text 'Connect with your Favorite tech sis' and a Start Connecting button",
        caption: "Onboarding",
      },
      {
        id: "03",
        alt: "Techsis home screen with a featured group card and a list of members, next to a group chat conversation",
        caption: "Home and group chat",
      },
      {
        id: "04",
        alt: "Dark theme versions of the Techsis onboarding and group chat screens",
        caption: "Dark theme",
      },
    ],
  },
  {
    slug: "zenova",
    title: "Zenova",
    kind: "Therapist-booking platform",
    year: "2023",
    summary:
      "A platform for finding and booking a therapist near you: a landing page that explains the process in three steps, and a dashboard for browsing therapists on a map.",
    overview: [
      "Zenova helps people find a therapist and book time without friction. The landing page opens with a plain promise and a single action, then explains the process in three steps: search for a therapist, schedule time directly in their calendar, and start therapy in person or virtually.",
      "Further down, a mood selector ('How are you feeling today?') lets visitors start from how they feel. The signed-in dashboard lists therapists as cards showing availability, gender and location with call and text actions, next to a map of nearby practices.",
      "A palette of olive green, warm peach and lilac keeps the tone calm, and lilac marks the specialisms.",
    ],
    highlights: [
      "Three-step explainer: search, schedule, start",
      "Mood-based entry point on the landing page",
      "Therapist cards with availability, location and call or text actions",
      "Map view with nearby practices",
    ],
    tags: ["Web app", "Landing page", "Dashboard", "Healthcare"],
    featured: true,
    published: true,
    images: [
      {
        id: "01",
        alt: "Zenova landing page: a hero reading 'Click. Heal. It's That Simple.' with specialism chips, and the start of the three-step 'How Zenova Works' section",
        caption: "Landing page, top",
      },
      {
        id: "02",
        alt: "Zenova landing page lower half: a 'How are you feeling today?' selector with Stressed, Anxiety, Depressed and Mood Swing cards, then a call-to-action panel and footer",
        caption: "Landing page, mood selector and footer",
      },
      {
        id: "03",
        alt: "Zenova therapist dashboard: four therapist cards with availability, gender, location, call and text, beside a map of Lagos and a nearby therapist list",
        caption: "Therapist dashboard",
      },
    ],
  },
  {
    slug: "cityboy",
    title: "CityBoy Auto Repair",
    kind: "Website for an auto repair shop",
    year: "2024",
    summary:
      "A three-page website for an auto repair shop in Lagos: a dark, high-contrast home page that leads to booking, an about page built on proof points, and a contact page.",
    overview: [
      "The site is built around one action: getting a car owner to book. The home page opens on a full-bleed hero with two buttons side by side, 'Make Enquiries' and 'Book An Appointment', echoed by a persistent 'Book now!' button in the navigation.",
      "Below the hero, a services carousel shows the workshop at work, and a 'Why choose us' block turns four promises into scannable cards: pricing, speed, certified technicians and quality parts. The about page adds a short story, headline figures and a full-width photograph. The contact page repeats address, phone, email, opening hours and a newsletter sign-up.",
      "A near-black base with a single copper-orange accent keeps the hierarchy simple. Orange is reserved for actions, labels and numbers.",
    ],
    highlights: [
      "Two calls to action in the hero plus a persistent 'Book now!' in the navigation",
      "Services carousel built on workshop photography",
      "Four-card 'Why choose us' summary",
      "Contact page with hours, address and newsletter sign-up",
    ],
    tags: ["Website", "Local business", "Conversion", "Dark UI"],
    featured: true,
    published: true,
    images: [
      {
        id: "01",
        alt: "CityBoy Auto Repair home page: a copper-orange car on a black hero with 'Your Trusted Auto Repair Service Provider', then a services carousel and 'Why Choose Us' section",
        caption: "Home page",
      },
      {
        id: "02",
        alt: "CityBoy Auto Repair about page: an introduction and mechanic portrait, four 'Why choose us' cards and a row of headline figures",
        caption: "About page",
      },
      {
        id: "03",
        alt: "CityBoy Auto Repair contact page with location, phone, email and website beside a photo of a mechanic, and a footer with opening hours and newsletter sign-up",
        caption: "Contact page",
      },
    ],
  },
  {
    slug: "wallet",
    title: "Crypto wallet",
    kind: "Mobile app UI",
    summary:
      "A mobile wallet that puts receive, swap, stake and send directly under the balance, with tokens, NFTs and activity one tab away.",
    overview: [
      "Two states of the same screen: a funded wallet listing tokens with their balances and price changes in green and red, and an empty wallet that offers 'Buy Crypto' and 'Receive funds' as the obvious next steps.",
    ],
    highlights: [
      "Four primary actions directly under the balance",
      "Funded and empty states designed side by side",
      "Gain and loss colours on every token row",
    ],
    tags: ["Mobile app", "Fintech", "Wallet"],
    featured: false,
    published: true,
    images: [
      {
        id: "01",
        alt: "Two phone mockups of a crypto wallet: one showing a funded balance and a token list, the other an empty wallet with Buy Crypto and Receive funds prompts",
        caption: "Funded and empty wallet",
      },
    ],
  },
  {
    // Switched off on purpose: the dashboard mockup is labelled "JobHuntly", the call-to-action
    // heading has a doubled text layer, and the client logos are real brands. Fix those, then
    // set published: true.
    slug: "jobspot",
    title: "Jobspot",
    kind: "Job board landing page",
    year: "2021",
    summary: "A landing page for a job board: a search-led hero, category cards, featured listings and an employer call to action.",
    overview: [
      "The page leads with a numeric promise and a single sign-up button, then lets candidates browse by category. Featured listings sit below, and a blue panel with a dashboard preview speaks to employers.",
    ],
    highlights: ["Hero with one clear action", "Eight category cards with live job counts", "Featured listings as scannable cards", "Employer call to action with dashboard preview"],
    tags: ["Landing page", "Job board"],
    featured: false,
    published: false,
    images: [
      { id: "01", alt: "Jobspot landing page with the headline 'Discover more than 5000+ Jobs', client logos, job categories and an employer call to action", caption: "Landing page, top" },
      { id: "02", alt: "Jobspot landing page lower half with the employer call to action, featured job cards and footer", caption: "Landing page, featured jobs and footer" },
    ],
  },
];

export const ALL_DESIGNS: Design[] = DEFS.map(build);
export const getDesigns = () => ALL_DESIGNS.filter((d) => d.published);
export const getFeaturedDesigns = () => getDesigns().filter((d) => d.featured).slice(0, 3);
export const getOtherDesigns = () => {
  const featured = new Set(getFeaturedDesigns().map((d) => d.slug));
  return getDesigns().filter((d) => !featured.has(d.slug));
};
export const getDesign = (slug: string) => getDesigns().find((d) => d.slug === slug);
export function getNextDesign(slug: string) {
  const list = getDesigns();
  const i = list.findIndex((d) => d.slug === slug);
  return i === -1 || list.length < 2 ? null : list[(i + 1) % list.length]!;
}
