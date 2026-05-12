import markdownItAnchor from "markdown-it-anchor";

export default function (eleventyConfig) {
  // ── markdown-it-anchor: add id= to every heading ───────────────────────
  // Slug matches the TOC link format: lowercase, colon/punctuation stripped, spaces → dashes
  const slugify = s => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

  // ── Paired shortcode: {% tip %}...{% endtip %} ──────────────────────────
  // Renders a styled tip callout box. Content is processed as inline Markdown
  // so bold, code, and links all work without writing HTML by hand.
  let _mdLib;
  eleventyConfig.amendLibrary("md", lib => {
    _mdLib = lib;
    lib.use(markdownItAnchor, { slugify, level: [2, 3, 4] });
  });
  eleventyConfig.addPairedShortcode("tip", function (content) {
    const rendered = _mdLib ? _mdLib.renderInline(content.trim()) : content;
    return `<aside class="pt-tip-box"><span class="pt-tip-label"><i class="bi bi-lightbulb-fill"></i> Tip</span>\u00a0${rendered}</aside>`;
  });

  // ── Paired shortcode: {% note %}...{% endnote %} ────────────────────────
  eleventyConfig.addPairedShortcode("note", function (content) {
    const rendered = _mdLib ? _mdLib.renderInline(content.trim()) : content;
    return `<aside class="pt-note-box"><span class="pt-note-label"><i class="bi bi-info-circle-fill"></i> Note</span>\u00a0${rendered}</aside>`;
  });

  // ── Passthrough copies ──────────────────────────────────────────────────
  // Assets referenced by the page.html layout (paths are project-root relative)
  eleventyConfig.addPassthroughCopy({ "pearcore/vendor/bootstrap.min-artic.css": "css/bootstrap.min-artic.css" });
  eleventyConfig.addPassthroughCopy({ "pearcore/css/pearcore.css": "css/pearcore.css" });
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

