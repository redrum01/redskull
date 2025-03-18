import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import robotsParser, { Robot } from 'robots-parser';
import * as treeify from 'treeify';
import * as smap from 'sitemap';
import { Readable } from 'stream';

export interface ISitemap {
    loc: string;
    lastmod?: string;
    changefreq?: string;
    priority?: number;
};

// Fetches the sitemap.xml from the provided site URL.
async function fetchSitemaps(sitemapUrl: string): Promise<string> {
    console.log(`Fetching sitemap from ${sitemapUrl}`);
    const sitemap = await GET(sitemapUrl);
    return sitemap.replace(/<\?xml.*?\?>/, '');
}

// Fetches the robots.txt from the provided site URL.
async function fetchRobotsTxt(siteUrl: string): Promise<string> {
    return GET(`${siteUrl}/robots.txt`);
}

async function GET(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    return response.text();
}

async function getRobotsTxt(url: string): Promise<Robot> {
    const robotsTxt = await fetchRobotsTxt(url);
    return robotsParser(url, robotsTxt);
}

function filterSitemaps(sitemaps: smap.SitemapItem[], robot: Robot): smap.SitemapItem[] {
    console.log(`Starting with ${sitemaps.length} sitemaps`);
    const allowedSitemaps = sitemaps.filter(sitemap => robot.isAllowed(sitemap.url));
    console.log(`Removed unallowed sites ${allowedSitemaps.length} sitemaps (${sitemaps.length - allowedSitemaps.length} removed)`);

    const hasLastMod = allowedSitemaps.every(sitemap => sitemap.lastmod);
    let relevantSitemaps: smap.SitemapItem[] = allowedSitemaps;

    if (hasLastMod) {
        relevantSitemaps = allowedSitemaps.filter(sitemap => {
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            return new Date(sitemap.lastmod as string) > twoYearsAgo;
        })

        console.log(`Reduced to ${relevantSitemaps.length} sitemaps based on 2 year relevancy.`);
    }

    return relevantSitemaps;
}


async function parseSitemap(sitemapTxt: string) {
    const sitemapStream = Readable.from([sitemapTxt]);
    return await smap.parseSitemap(sitemapStream);
}


async function getSitemap(sitemapUrl: string, sitemaps: smap.SitemapItem[] = []): Promise<smap.SitemapItem[]> {
    const sitemapTxt = await fetchSitemaps(sitemapUrl);
    const sitemap = await parseSitemap(sitemapTxt);
    const isNestedSitemap = sitemap.every(sitemap => sitemap.url.includes('sitemap'));

    if (isNestedSitemap) {
        for (const nestedSitemap of sitemap) {
            await getSitemap(nestedSitemap.url, sitemaps);
        }
    }

    sitemaps.push(...sitemap);
    return sitemaps;
}


async function getSitemaps(robot: Robot): Promise<smap.SitemapItem[]> {
    const sitemapUrls = robot.getSitemaps();
    const sitemaps: smap.SitemapItem[] = [];

    for (const sitemapUrl of sitemapUrls) {
        const smps = await getSitemap(sitemapUrl);
        for (const sitemap of smps) {
            sitemaps.push(sitemap);
        }
    }



    return filterSitemaps(sitemaps, robot);
}

// Builds a tree structure from the sitemap URLs.
function buildSiteTree(sitemaps: smap.SitemapItem[]) {
    const urls = sitemaps.map(sitemap => sitemap.url);

    const pathParts: string[][] = []
    for (const urlStr of urls) {
        const url = new URL(urlStr);
        const parts = url.pathname.split('/').filter(Boolean);
        pathParts.push(parts);
    }

    const lengths = pathParts.map(parts => parts.length);
    const maxDepth = lengths.reduce((a, b) => Math.max(a, b));


    const tree: { [key: string]: any } = {};

    for (let i = 0; i < maxDepth; i++) {
        const level = i + 1;
        const levelParts = pathParts.filter(parts => parts.length >= level).map(parts => parts[i]);

        const uniqueParts = Array.from(new Set(levelParts));

        for (const part of uniqueParts) {
            tree[part] = {};
        }

        for (const parts of pathParts) {
            if (parts.length > i) {
                const part = parts[i];
                if (tree[part]) {
                    let currentLevel = tree[part];
                    for (let j = i + 1; j < parts.length; j++) {
                        const nextPart = parts[j];
                        if (!currentLevel[nextPart]) {
                            currentLevel[nextPart] = {};
                        }
                        currentLevel = currentLevel[nextPart];
                    }
                }
            }
        }
    }

    return tree;
}

async function main() {
    const siteUrl = 'https://www.walgreens.com/'; // Replace with your site URL
    const robot = await getRobotsTxt(siteUrl);
    const sitemaps = await getSitemaps(robot);

    //console.log(sitemaps);

    const urls = sitemaps.map(sitemap => sitemap.url);
    const urlSet = new Set(urls);
    const uniqueUrls = Array.from(urlSet);
    console.log(`Found ${uniqueUrls.length} unique URLs`);

    const siteTree = buildSiteTree(sitemaps);
    console.log(
        treeify.asTree(siteTree, true)
    );
}

main()