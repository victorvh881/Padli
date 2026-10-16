import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Padli",
    short_name: "Padli",
    description: "Vind padelspelers van jouw niveau in Leuven en omgeving.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#15803d",
    lang: "nl-BE",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
