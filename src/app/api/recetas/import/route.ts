import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Importador de recetas para el Recetario (GitHub Pages no puede leer otras
// webs por CORS). Descarga la pagina, extrae el JSON-LD schema.org/Recipe y
// devuelve la receta normalizada junto con la foto en base64.

const PAGE_TIMEOUT_MS = 8_000;
const IMAGE_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (compatible; RecetarioBot/1.0; +https://ruizherrero1.github.io/recetario/)";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type ImportedRecipe = {
  title: string;
  categories: string[];
  tags: string[];
  time: string;
  ingredients: string[];
  steps: string;
  notes: string;
  imageData?: string;
};

type JsonLdNode = Record<string, unknown>;

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: CORS_HEADERS });
}

// Evita que el endpoint sirva de proxy hacia redes internas.
function isAllowedUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  const privateHost =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host);

  return privateHost ? null : url;
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return decodeEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function listValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }
  const text = cleanText(value);
  if (!text) return [];
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// "PT1H30M" -> "1 h 30 min"
function durationLabel(value: unknown): string {
  const text = cleanText(value);
  const match = text.match(/^P(?:([\d.]+)D)?T?(?:([\d.]+)H)?(?:([\d.]+)M)?/i);
  if (!match || (!match[1] && !match[2] && !match[3])) return text;

  const minutes =
    Number(match[1] ?? 0) * 24 * 60 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours && rest) return `${hours} h ${rest} min`;
  if (hours) return `${hours} h`;
  return `${rest} min`;
}

function stepsText(value: unknown): string {
  if (typeof value === "string") return cleanText(value);
  if (!Array.isArray(value)) return "";

  const lines: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const text = cleanText(entry);
      if (text) lines.push(text);
      continue;
    }
    const node = entry as JsonLdNode;
    if (node?.["@type"] === "HowToSection" && Array.isArray(node.itemListElement)) {
      const section = cleanText(node.name);
      if (section) lines.push(`${section}:`);
      lines.push(stepsText(node.itemListElement));
      continue;
    }
    const text = cleanText(node?.text ?? node?.name);
    if (text) lines.push(text);
  }
  return lines.filter(Boolean).join("\n");
}

function imageUrl(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.length ? imageUrl(value[0]) : "";
  const node = value as JsonLdNode | null;
  if (node && typeof node.url === "string") return node.url;
  return "";
}

function isRecipeNode(node: unknown): node is JsonLdNode {
  const type = (node as JsonLdNode | null)?.["@type"];
  return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
}

function findRecipeNode(html: string): JsonLdNode | null {
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    const queue: unknown[] = Array.isArray(data) ? [...data] : [data];
    while (queue.length) {
      const node = queue.shift();
      if (!node || typeof node !== "object") continue;
      if (isRecipeNode(node)) return node as JsonLdNode;
      const graph = (node as JsonLdNode)["@graph"];
      if (Array.isArray(graph)) queue.push(...graph);
    }
  }

  return null;
}

async function fetchImageData(rawUrl: string, baseUrl: URL): Promise<string | undefined> {
  try {
    const resolved = isAllowedUrl(new URL(rawUrl, baseUrl).href);
    if (!resolved) return undefined;

    const response = await fetch(resolved.href, {
      headers: { "User-Agent": USER_AGENT, Referer: baseUrl.href },
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return undefined;

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return undefined;

    return `data:${contentType.split(";")[0]};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return undefined;
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const rawUrl = new URL(request.url).searchParams.get("url") ?? "";
  const url = isAllowedUrl(rawUrl);
  if (!url) {
    return jsonError(400, "invalid-url");
  }

  let html: string;
  try {
    const response = await fetch(url.href, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    if (!response.ok) {
      return jsonError(502, `fetch-failed-${response.status}`);
    }
    html = await response.text();
  } catch (error) {
    console.warn("[recetas/import] fetch failed:", error);
    return jsonError(502, "fetch-failed");
  }

  const node = findRecipeNode(html);
  if (!node) {
    return jsonError(404, "no-recipe");
  }

  const recipe: ImportedRecipe = {
    title: cleanText(node.name),
    categories: listValue(node.recipeCategory),
    tags: [...listValue(node.recipeCuisine), ...listValue(node.keywords)].slice(0, 12),
    time: durationLabel(node.totalTime || node.cookTime || node.prepTime),
    ingredients: listValue(node.recipeIngredient),
    steps: stepsText(node.recipeInstructions),
    notes: cleanText(node.description),
  };

  if (!recipe.title && recipe.ingredients.length === 0 && !recipe.steps) {
    return jsonError(404, "no-recipe");
  }

  const image = imageUrl(node.image);
  if (image) {
    recipe.imageData = await fetchImageData(image, url);
  }

  return NextResponse.json(
    { recipe },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=0, s-maxage=86400",
      },
    },
  );
}
