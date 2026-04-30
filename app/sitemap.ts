import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: "https://trialgrids.com", lastModified, changeFrequency: "monthly", priority: 1.0 },
    { url: "https://trialgrids.com/tools/randomization", lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://trialgrids.com/tools/timetable", lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://trialgrids.com/tools/meal-log", lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://trialgrids.com/tools/sample-shipment", lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: "https://trialgrids.com/about", lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: "https://trialgrids.com/contact", lastModified, changeFrequency: "yearly", priority: 0.5 },
    { url: "https://trialgrids.com/privacy", lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: "https://trialgrids.com/terms", lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
