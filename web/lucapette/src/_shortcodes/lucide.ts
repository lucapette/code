import icons from "lucide-static/icon-nodes.json";

interface IconPath {
  [key: string]: string | number;
}

type IconData = [string, IconPath][];

interface Options {
  size?: number;
  width?: number;
  height?: number;
  [key: string]: unknown;
  xmlns?: string;
  viewBox?: string;
  fill?: string;
  stroke?: string;
  "stroke-width"?: number;
  "stroke-linecap"?: string;
  "stroke-linejoin"?: string;
  class?: string;
}

const DEFAULT_OPTIONS = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  class: "lucide-icon",
};

function attrsToString(attrs: Record<string, string | number>): string {
  return Object.keys(attrs)
    .map((key) => `${key}="${attrs[key]}"`)
    .join(" ");
}

function createSvg(icon: IconData): string[] {
  return icon.map((path) => {
    const name = path[0];
    const values = path[1];
    return `<${name} ${attrsToString(values)} />`;
  });
}

function filterOptions(options: Options): Record<string, unknown> {
  const filteredOptions: Record<string, unknown> = { ...options };

  const eleventyProps = [
    "hash",
    "data",
    "loc",
    "lookupProperty",
    "name",
    "_internalProtoAccess",
  ];

  eleventyProps.forEach((prop) => delete filteredOptions[prop]);

  for (const key of Object.keys(filteredOptions)) {
    const val = filteredOptions[key];
    if (
      typeof val === "function" ||
      (typeof val === "object" && val !== null)
    ) {
      delete filteredOptions[key];
    }
  }

  return filteredOptions;
}

function validateIconName(iconName: string): string {
  if (!iconName) {
    throw new Error(`[lucide] the iconName must be specified`);
  }

  const safeIconName = iconName.toLowerCase();
  if (!icons[safeIconName as keyof typeof icons]) {
    throw new Error(`[lucide] the iconName is not correct`);
  }

  return safeIconName;
}

export function lucideShortcode(
  iconName: string,
  options: Options = {},
): string {
  const safeIconName = validateIconName(iconName);
  const filteredOptions = filterOptions(options);

  const newOptions = {
    width: options.size || options.width || DEFAULT_OPTIONS.width,
    height: options.size || options.height || DEFAULT_OPTIONS.height,
    ...filteredOptions,
  };
  delete (newOptions as Record<string, unknown>).size;
  const svgProps = { ...DEFAULT_OPTIONS, ...newOptions } as Record<
    string,
    string | number
  >;

  const svgContent = createSvg(
    icons[safeIconName as keyof typeof icons] as IconData,
  );
  return `<svg ${attrsToString(svgProps)}>${svgContent.join("")}</svg>`;
}
