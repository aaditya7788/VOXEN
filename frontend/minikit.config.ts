const ROOT_URL =
  (process.env.NEXT_PUBLIC_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000");

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = {
  // These will be provided by the Base Build tool after you deploy
  accountAssociation: {
    header: process.env.NEXT_PUBLIC_FC_HEADER || "",
    payload: process.env.NEXT_PUBLIC_FC_PAYLOAD || "",
    signature: process.env.NEXT_PUBLIC_FC_SIGNATURE || "",
  },
  baseBuilder: {
    ownerAddress: process.env.NEXT_PUBLIC_OWNER_ADDRESS || "",
  },
  miniapp: {
    version: "1",
    name: "Voxen",
    subtitle: "The future of social voting",
    description: "Participate in decentralized spaces and vote on proposals directly within Farcaster.",
    screenshotUrls: [`${ROOT_URL}/screenshot.png`],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "utility",
    tags: ["governance", "web3", "social"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "Vote on the future",
    ogTitle: "Voxen - Social Voting",
    ogDescription: "Decentralized voting powered by Base",
    ogImageUrl: `${ROOT_URL}/hero.png`,
  },
} as const;
