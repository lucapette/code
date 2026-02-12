// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Notes",
  tagline: "A public collection of notes by Luca Pette",
  url: "https://notes.lucapette.me",
  baseUrl: "/",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    }
  },
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: "https://github.com/lucapette/web/tree/main/notes",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.scss"),
        },
      }),
    ],
  ],
  plugins: ["docusaurus-plugin-sass"],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "Notes",
        logo: {
          alt: "Luca Pette's avatar",
          src: "img/me.png",
        },
        items: [
          {
            href: "https://lucapette.me",
            label: "lucapette.me",
            position: "right",
          },
        ],
      },
      footer: {
        copyright:
          "Made with 🧡 and <a href='https://docusaurus.io'>docusaurus</a> by <a href='https://lucapette.me'>lucapette</a></a>",
        links: [
          {
            label: "GitHub",
            href: "https://github.com/lucapette/web/tree/main/notes",
          },
          {
            html: "<a class='footer__link-item' rel='me' href='https://hachyderm.io/@lucapette'>Mastodon</a>",
          },
          {
            label: "Twitter",
            href: "https://twitter.com/lucapette",
          },
        ],
      },
    }),
  scripts: [
    {
      src: "/js/script.js",
      async: true,
      defer: true,
      "data-domain": "notes.lucapette.me",
    },
  ],
};

module.exports = config;
