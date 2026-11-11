export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} — AMBS Visibility Hub` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — AMBS Visibility Hub` },
    { property: "og:description", content: description },
  ],
});
