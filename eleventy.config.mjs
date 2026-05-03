export default function (eleventyConfig) {
  // ── Passthrough copies ──────────────────────────────────────────────────
  // Assets referenced by the page.html layout (paths are project-root relative)
  eleventyConfig.addPassthroughCopy({ "pearcore/vendor/bootstrap.min-artic.css": "css/bootstrap.min-artic.css" });
  eleventyConfig.addPassthroughCopy({ "peartree/css/peartree.css": "css/peartree.css" });
  // ui-preview.css is referenced as /manual/ui-preview.css
  eleventyConfig.addPassthroughCopy({ "peartree/manual/ui-preview.css": "manual/ui-preview.css" });
  // Logo (referenced as /logo/ in the manual and layout)
  eleventyConfig.addPassthroughCopy({ "logo": "logo" });
  // Images for favicon / logo
  eleventyConfig.addPassthroughCopy({ "peartree/img": "img" });
  // Manual images
  eleventyConfig.addPassthroughCopy({ "peartree/manual/images": "manual/images" });

  return {
    dir: {
      // All paths are relative to the project root (where this config lives)
      input: "peartree/manual",
      output: "_site",
      // _includes is the default; located at peartree/manual/_includes
      includes: "_includes",
      layouts: "_includes",
    },
    // Use Liquid for both Markdown front-matter and HTML layouts
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    templateFormats: ["md", "html"],
  };
}

