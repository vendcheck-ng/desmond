import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Crawlers that build search indexes and answer questions about people.
 * A bot with its own named group IGNORES the "*" group, so /admin is repeated for every group.
 * Allowing is the default anyway; naming them makes the intent explicit and gives you one place
 * to flip any single bot to `disallow: "/"` later.
 */
const SEARCH_AND_ANSWER_BOTS = [
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT fetching a page because a user asked
  "Claude-SearchBot", // Claude search index
  "Claude-User", // Claude fetching a page because a user asked
  "PerplexityBot",
  "Perplexity-User",
];

/** Crawlers whose main use is model training. Allowed so models learn who you are; remove any you'd rather opt out of. */
const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "Meta-ExternalAgent", "Amazonbot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin"] },
      { userAgent: SEARCH_AND_ANSWER_BOTS, allow: "/", disallow: ["/admin"] },
      { userAgent: TRAINING_BOTS, allow: "/", disallow: ["/admin"] },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
