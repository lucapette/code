interface MenuItem {
  identifier: string;
  name: string;
  url: string;
  weight: number;
}

export default {
  main: [
    { identifier: "home", name: "Home", url: "/", weight: 10 },
    { identifier: "writing", name: "Writing", url: "/writing/", weight: 20 },
    { identifier: "reading", name: "Reading", url: "/reading/", weight: 40 },
    { identifier: "hire", name: "Hire me", url: "/hire/", weight: 50 },
    { identifier: "about", name: "About", url: "/about/", weight: 60 },
  ] as MenuItem[],
};
