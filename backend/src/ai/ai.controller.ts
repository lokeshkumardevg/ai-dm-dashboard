import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';
import * as cheerio from 'cheerio';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateText(@Body() body: { prompt: string; context?: string }) {
    const context = body.context || '';
    const result = await this.aiService.generateContent(body.prompt, context);
    return {
      success: true,
      data: result,
      orchestrator_route: 'resolved'
    };
  }

  @Post('seo-audit')
  @HttpCode(HttpStatus.OK)
  async runSeoAudit(@Body() body: { url: string }) {
    try {
      const startTime = Date.now();
      const response = await fetch(body.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);

      const htmlText = await response.text();
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(1) + 's';

      // 1. Parse HTML with Cheerio for high-fidelity extraction
      const $ = cheerio.load(htmlText);

      const meta = {
        title: $('title').text() || 'No title found',
        description: $('meta[name="description"]').attr('content') || 'No meta description found',
        canonical: $('link[rel="canonical"]').attr('href') || 'Not set',
        ogTitle: $('meta[property="og:title"]').attr('content') || 'Not set',
        ogImage: $('meta[property="og:image"]').attr('content') || 'Not set',
        h1: $('h1').map((i, el) => $(el).text()).get().slice(0, 3).join(', '),
        h2Count: $('h2').length,
        images: $('img').length,
        imagesWithAlt: $('img[alt]').length,
        links: $('a').length,
        externalLinks: $('a[href^="http"]').length
      };

      // 2. Prepare context-rich prompt for the AI Orchestrator
      const prompt = `Act as an elite Technical SEO Auditor at Semrush. Analyze the extracted data for ${body.url}:
      
      Title: ${meta.title}
      Description: ${meta.description}
      Canonical: ${meta.canonical}
      H1 Tags: ${meta.h1}
      H2 Count: ${meta.h2Count}
      Total Images: ${meta.images} (Alt text present: ${meta.imagesWithAlt})
      Total Links: ${meta.links} (External: ${meta.externalLinks})
      Load Time: ${loadTime}

      Based on these metrics, return a SEMRUSH-STYLE SEO Audit.
      
      Return ONLY raw JSON in this exact structure:
      {
        "score": <number 1-100 indicating Site Health>,
        "stats": {
          "totalErrors": <count>,
          "totalWarnings": <count>,
          "totalNotices": <count>
        },
        "details": {
          "titleLength": <number of characters>,
          "titleStatus": "optimal" | "too_long" | "too_short" | "missing",
          "descLength": <number of characters>,
          "descStatus": "optimal" | "too_long" | "too_short" | "missing",
          "hasSsl": <boolean>,
          "mobileFriendly": <boolean>,
          "altOptimization": <number 1-100>
        },
        "issues": [
           {"type": "error" | "warning" | "notice", "category": "Crawlability" | "HTTPS" | "On-Page" | "Performance", "text": "Specific recommendation"}
        ]
      }`;

      const aiResponse = await this.aiService.generateContent(prompt, 'You are a veteran technical SEO crawler and analyst at Semrush.');

      // Clean and parse
      const cleanedResponse = aiResponse.replace(/```json|```/g, '').trim();
      const parsedAudit = JSON.parse(cleanedResponse);

      return {
        success: true,
        data: {
          score: parsedAudit.score,
          loadTime,
          meta,
          details: parsedAudit.details,
          issues: parsedAudit.issues
        }
      };

    } catch (error: any) {
      console.error("SEO Audit backend error", error);

      return {
        success: false,
        error: error.message || 'Unknown network or AI generation failure',
        data: {
          score: 0,
          loadTime: '0.0s',
          issues: [
            { type: 'error', category: 'Network', text: `Dynamic Audit Error: ${error.message}` },
            { type: 'warning', category: 'Access', text: 'Target site might be blocking AI crawlers. Check robots.txt.' }
          ]
        }
      }
    }
  }

  // ── Brand Profile Analysis ──────────────────────────────────────────────────

  @Post('brand-profile')
  @HttpCode(HttpStatus.OK)
  async runBrandProfile(@Body() body: { url: string; brandName: string }) {
    const { url, brandName } = body;

    // Step 1: scrape the homepage with cheerio
    let scrapedContext = '';
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      $('script, style, noscript, iframe, svg').remove();

      const title = $('title').text().trim();
      const description = $('meta[name="description"]').attr('content') || '';
      const h1s = $('h1').map((_, el) => $(el).text().trim()).get().slice(0, 4).join(' | ');
      const h2s = $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 8).join(' | ');

      const priorityText = $('main, section, article, [role="main"]').text();
      const bodyText = (priorityText || $('body').text())
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);

      scrapedContext = `
      Brand: ${brandName}
      URL: ${url}
      Page Title: ${title}
      Meta Description: ${description}
      H1 Tags: ${h1s}
      H2 Tags: ${h2s}
      Page Body Excerpt: ${bodyText}
            `.trim();
    } catch (scrapeErr) {
      console.error('Scrape failed:', scrapeErr);
      scrapedContext = `Brand: ${brandName}, URL: ${url}`;
    }

    // Step 2: AI analysis using structured service method
    try {
      const profileData = await this.aiService.generateBrandProfile(url, brandName, scrapedContext);

      return {
        success: true,
        data: profileData,
        scrapedContext // for debugging
      };
    } catch (aiErr: any) {
      console.error('AI Brand Profile failed:', aiErr);
      return {
        success: false,
        error: aiErr.message || 'AI analysis failed',
        data: null,
        scrapedContext
      };
    }
  }

  // ── Market Research Analysis ──────────────────────────────────────────────

  @Post('market-research')
  @HttpCode(HttpStatus.OK)
  async runMarketResearch(@Body() body: { url: string; brandName: string }) {
    try {
      const result = await this.aiService.runMarketResearch(body.url, body.brandName);
      return {
        success: true,
        data: result.data,
        type: 'market-research',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Market Research failed:', error);
      return {
        success: false,
        error: error.message || 'Market research analysis failed',
        data: null
      };
    }
  }

  // ── Competitor Analysis ────────────────────────────────────────────────────

  @Post('competitor-analysis')
  @HttpCode(HttpStatus.OK)
  async runCompetitorAnalysis(@Body() body: { url: string; brandName: string }) {
    try {
      const result = await this.aiService.runCompetitorAnalysis(body.url, body.brandName);
      return {
        success: true,
        data: result.data,
        type: 'competitor-analysis',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Competitor Analysis failed:', error);
      return {
        success: false,
        error: error.message || 'Competitor analysis failed',
        data: null
      };
    }
  }

  // ── Audience Insights ──────────────────────────────────────────────────────

  @Post('audience-insights')
  @HttpCode(HttpStatus.OK)
  async runAudienceInsights(@Body() body: { url: string; brandName: string }) {
    try {
      const result = await this.aiService.runAudienceInsights(body.url, body.brandName);
      return {
        success: true,
        data: result.data,
        type: 'audience-insights',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Audience Insights failed:', error);
      return {
        success: false,
        error: error.message || 'Audience insights failed',
        data: null
      };
    }
  }

  // ── Campaign Strategy ─────────────────────────────────────────────────────

  @Post('campaign-strategy')
  @HttpCode(HttpStatus.OK)
  async runCampaignStrategy(@Body() body: { url: string; brandName: string }) {
    try {
      const result = await this.aiService.runCampaignStrategy(body.url, body.brandName);
      return {
        success: true,
        data: result.data,
        type: 'campaign-strategy',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Campaign Strategy failed:', error);
      return {
        success: false,
        error: error.message || 'Campaign strategy failed',
        data: null
      };
    }
  }

  // ── Copy Generation ───────────────────────────────────────────────────────

  @Post('copy-generation')
  @HttpCode(HttpStatus.OK)
  async runCopyGeneration(@Body() body: { url: string; brandName: string }) {
    try {
      const result = await this.aiService.runCopyGeneration(body.url, body.brandName);
      return {
        success: true,
        data: result.data,
        type: 'copy-generation',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Copy Generation failed:', error);
      return {
        success: false,
        error: error.message || 'Copy generation failed',
        data: null
      };
    }
  }

  // ── Creative Testing ──────────────────────────────────────────────────────

  @Post('creative-testing')
  @HttpCode(HttpStatus.OK)
  async runCreativeTesting(@Body() body: { url: string; brandName: string }) {
    try {
      const result = await this.aiService.runCreativeTesting(body.url, body.brandName);
      return {
        success: true,
        data: result.data,
        type: 'creative-testing',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Creative Testing failed:', error);
      return {
        success: false,
        error: error.message || 'Creative testing failed',
        data: null
      };
    }
  }
}
