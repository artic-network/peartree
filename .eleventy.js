const markdownIt = require('markdown-it');
const markdownItAnchorPkg = require('markdown-it-anchor');
const markdownItAnchor = markdownItAnchorPkg.default ?? markdownItAnchorPkg;

module.exports = function(eleventyConfig) {
  // Copy static assets unchanged into _site/.
  eleventyConfig.addPassthroughCopy({ 'peartree/css': 'css' });
  eleventyConfig.addPassthroughCopy({ 'peartree/manual/images': 'manual/images' });
  eleventyConfig.addPassthroughCopy({ 'peartree/img': 'img' });
  eleventyConfig.addPassthroughCopy({ 'logo': 'logo' });

  // Slugify to match fragment IDs already used in the manual ToC links.
  // e.g. "Chapter 1: The Interface at a Glance" → "chapter-1-the-interface-at-a-glance"
  const slugify = s =>
    s.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

  const md = markdownIt({ html: true, linkify: false })
    .use(markdownItAnchor, { slugify });
  eleventyConfig.setLibrary('md', md);

  return {
    dir: {
      input: 'peartree/manual',
      output: '_site',
      includes: '_includes',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
};
