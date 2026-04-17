import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import OpenAI from 'openai';
import { AiAnalysis, AiAnalysisDocument } from './schemas/ai-analysis.schema';
import { BrandProfile } from './schemas/brand-profile.schema';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    @InjectModel(AiAnalysis.name) private aiAnalysisModel: Model<AiAnalysisDocument>,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Market Research Analysis
   * Analyzes market size, trends, segments, and growth opportunities
   */
  async runMarketResearch(url: string, brandName: string, userId?: string): Promise<any> {
    const prompt = `You are an expert market research analyst. Analyze the brand "${brandName}" at URL: ${url}.
Return ONLY raw valid JSON with these exact keys:
{
  "overview": "2-3 sentence market overview",
  "marketSize": "estimated market size with currency",
  "growthRate": "annual growth rate %",
  "keyTrends": ["trend1", "trend2", "trend3"],
  "regionalAnalysis": { "topRegions": ["region1", "region2"], "growthMarkets": ["market1", "market2"] },
  "segments": [{ "name": "segment name", "share": "% share", "description": "brief desc" }],
  "opportunities": ["opportunity1", "opportunity2", "opportunity3"],
  "risks": ["risk1", "risk2"]
}`;

    return this.analyzeWithAI(prompt, 'market-research', url, brandName, userId);
  }

  /**
   * Competitor Analysis
   * Identifies competitors, strengths, weaknesses, and market threats
   */
  async runCompetitorAnalysis(url: string, brandName: string, userId?: string): Promise<any> {
    const prompt = `You are a competitive intelligence expert. Analyze competitors of "${brandName}" (URL: ${url}).
Return ONLY raw valid JSON with these exact keys:
{
  "summary": "brief competitive landscape summary",
  "directCompetitors": [{ "name": "competitor", "strength": "main strength", "weakness": "main weakness", "marketShare": "estimated %" }],
  "competitiveAdvantages": ["advantage1", "advantage2"],
  "differentiators": ["differentiator1", "differentiator2"],
  "threatLevel": "Low | Medium | High",
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

    return this.analyzeWithAI(prompt, 'competitor-analysis', url, brandName, userId);
  }

  /**
   * Audience Insights Analysis
   * Profiles target audience demographics, interests, and messaging strategy
   */
  async runAudienceInsights(url: string, brandName: string, userId?: string): Promise<any> {
    const prompt = `You are a digital marketing audience strategist. Analyze the target audience for "${brandName}" at ${url}.
Return ONLY raw valid JSON with these exact keys:
{
  "primaryPersona": { "name": "persona name", "age": "age range", "interests": ["int1", "int2"], "painPoints": ["pain1", "pain2"] },
  "demographics": { "ageRange": "main age range", "gender": "breakdown", "income": "income level", "education": "education level" },
  "fbTargeting": { "interests": ["fb interest1", "fb interest2", "fb interest3"], "behaviors": ["behavior1", "behavior2"] },
  "googleKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "platforms": [{ "name": "platform", "priority": "High/Med/Low", "reason": "brief reason" }],
  "messagingTone": "tone description"
}`;

    return this.analyzeWithAI(prompt, 'audience-insights', url, brandName, userId);
  }

  /**
   * Campaign Strategy Analysis
   * Develops comprehensive campaign objectives, budgets, timelines, and KPIs
   */
  async runCampaignStrategy(url: string, brandName: string, userId?: string): Promise<any> {
    const prompt = `You are a digital advertising campaign strategist. Create a campaign strategy for "${brandName}" at ${url}.
Return ONLY raw valid JSON with these exact keys:
{
  "objective": "primary campaign objective",
  "budgetRecommendation": { "daily": "$amount", "monthly": "$amount", "split": { "google": "%", "meta": "%" } },
  "timeline": [{ "phase": "phase name", "duration": "X weeks", "focus": "phase focus" }],
  "kpis": [{ "metric": "metric name", "target": "target value" }],
  "platformStrategy": { "google": "strategy description", "meta": "strategy description" },
  "bidStrategy": "recommended bidding approach"
}`;

    return this.analyzeWithAI(prompt, 'campaign-strategy', url, brandName, userId);
  }

  /**
   * Copy Generation Analysis
   * Generates high-converting ad headlines, body copy, and CTAs
   */
  async runCopyGeneration(url: string, brandName: string, userId?: string): Promise<any> {
    const prompt = `You are an elite advertising copywriter. Generate high-converting ad copy for "${brandName}" at ${url}.
Return ONLY raw valid JSON with these exact keys:
{
  "headlines": [{ "text": "headline text", "type": "Awareness|Consideration|Conversion", "platform": "Google|Meta|Both" }],
  "bodyCopy": [{ "text": "body copy text", "platform": "Google|Meta", "tone": "tone description" }],
  "ctas": ["CTA1", "CTA2", "CTA3"],
  "valuePropositions": ["prop1", "prop2", "prop3"],
  "hooks": ["hook1", "hook2", "hook3"],
  "toneSummary": "overall brand voice description"
}`;

    return this.analyzeWithAI(prompt, 'copy-generation', url, brandName, userId);
  }

  /**
   * Creative Testing Strategy
   * Recommends A/B testing approach, creative formats, and success metrics
   */
  async runCreativeTesting(url: string, brandName: string, userId?: string): Promise<any> {
    const prompt = `You are a performance marketing creative strategist. Suggest A/B testing strategy for "${brandName}" at ${url}.
Return ONLY raw valid JSON with these exact keys:
{
  "testingFramework": "recommended testing approach",
  "abTests": [{ "variable": "what to test", "variantA": "option A", "variantB": "option B", "hypothesis": "expected outcome" }],
  "creativeFormats": [{ "format": "format name", "platform": "platform", "priority": "High/Med/Low", "reason": "why" }],
  "performanceMetrics": [{ "metric": "metric name", "benchmark": "industry benchmark", "target": "your target" }],
  "iterationCycle": "recommended testing cycle duration",
  "budget": "recommended testing budget allocation"
}`;

    return this.analyzeWithAI(prompt, 'creative-testing', url, brandName, userId);
  }

  /**
   * Internal: Core AI analysis handler with JSON parsing and MongoDB persistence
   */
  private async analyzeWithAI(
    prompt: string,
    analysisType: string,
    brandUrl: string,
    brandName: string,
    userId?: string,
  ): Promise<any> {
    try {
      const systemPrompt = `You are an expert AI marketing analyst at AdsGo.ai. Always return ONLY raw valid JSON, no markdown, no explanation.`;

      const response = await this.generateContent(prompt, systemPrompt);

      // Clean and parse JSON response
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const result = {
        success: true,
        data: parsed,
        type: analysisType,
        timestamp: new Date().toISOString(),
      };

      // Save to MongoDB if userId is provided
      if (userId) {
        try {
          await this.aiAnalysisModel.create({
            userId,
            type: analysisType,
            brandName,
            brandUrl,
            result: parsed,
          });
          this.logger.log(`Analysis saved for user ${userId}: ${analysisType}`);
        } catch (saveError) {
          this.logger.warn(`Failed to save analysis to MongoDB`, saveError);
          // Don't throw - analysis still succeeded, just couldn't persist
        }
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Failed to complete ${analysisType} analysis`, error);
      throw new BadRequestException(`Failed to complete ${analysisType} analysis: ${error.message}`);
    }
  }

  /**
   * Fetch analysis history for a specific user
   */
  async getAnalysisHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const analyses = await this.aiAnalysisModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();

      return analyses;
    } catch (error: any) {
      this.logger.error(`Failed to fetch analysis history for user ${userId}`, error);
      throw new BadRequestException('Failed to fetch analysis history: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Delete an analysis record
   */
  async deleteAnalysis(analysisId: string, userId: string): Promise<void> {
    try {
      const result = await this.aiAnalysisModel.findByIdAndDelete(analysisId);

      // Verify the analysis belonged to the user
      if (!result || result.userId.toString() !== userId) {
        throw new BadRequestException('Analysis not found or unauthorized');
      }

      this.logger.log(`Analysis ${analysisId} deleted for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete analysis ${analysisId}`, error);
      throw new BadRequestException('Failed to delete analysis: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Generate content using OpenAI API
   */
  async generateContent(userPrompt: string, systemPrompt: string, schema?: any): Promise<any> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt || '',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: schema ? { type: "json_schema", json_schema: schema } : undefined,
      });

      if (schema) {
        return JSON.parse(completion.choices[0].message.content || '{}');
      }
      return completion.choices[0].message.content || '';
    } catch (error: any) {
      this.logger.error('OpenAI API Error', error);
      throw new BadRequestException('Failed to generate content: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Generate images using OpenAI DALL-E (placeholder implementation)
   */
  async generateImage(prompt: string): Promise<string> {
    try {
      const image = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
      });

      if (image?.data?.[0]?.url) {
        return image.data[0].url;
      }
      return 'https://via.placeholder.com/1024x1024?text=AI+Generated+Image';
    } catch (error: any) {
      this.logger.warn('Image generation failed, returning placeholder', error);
      // Return a placeholder URL if image generation fails
      return 'https://via.placeholder.com/1024x1024?text=AI+Generated+Image';
    }
  }

  /**
   * Generate Brand Profile with guaranteed JSON structure
   */
  async generateBrandProfile(url: string, brandName: string, scrapedContext?: string): Promise<any> {
  const brandProfileSchema = {
    name: "brand_profile",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        tagline: { type: "string" },
        description: { type: "string" },
        lifecycle: { type: "string", enum: ["Startup", "Growth", "Scale", "Enterprise"] },
        companySize: { type: "string", enum: ["Solo", "Startup", "SMB", "Mid-Market", "Enterprise"] },
        targetMarket: { type: "string" },
        location: { type: "string" },
        businessModel: { type: "string", enum: ["SaaS", "Marketplace", "Agency", "E-Commerce", "B2B", "B2C"] },
        tags: { type: "array", items: { type: "string" } },
        brandDna: {
          type: "object",
          additionalProperties: false,
          properties: {
            brandTone: { type: "string" },
            marketKeywords: { type: "array", items: { type: "string" } }
          },
          required: ["brandTone", "marketKeywords"]
        },
        coreAdvantages: {
          type: "object",
          additionalProperties: false,
          properties: {
            valueProposition: { type: "string" },
            differentiators: { type: "array", items: { type: "string" } }
          },
          required: ["valueProposition", "differentiators"]
        },
        features: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              icon: { type: "string" }
            },
            required: ["title", "description", "icon"]
          }
        },
        targetAudience: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              segment: { type: "string" },
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" } }
            },
            required: ["segment", "description", "tags"]
          }
        },
        competitors: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              description: { type: "string" }
            },
            required: ["name", "type", "description"]
          }
        },
        reachAndEcosystem: {
          type: "object",
          additionalProperties: false,
          properties: {
            marketingChannels: { type: "array", items: { type: "string" } },
            customerHangouts: { type: "array", items: { type: "string" } }
          },
          required: ["marketingChannels", "customerHangouts"]
        },
        impactAnalysis: {
          type: "object",
          additionalProperties: false,
          properties: {
            revenue: { type: "array", items: { type: "string" } },
            cost: { type: "array", items: { type: "string" } },
            policy: { type: "array", items: { type: "string" } },
            technology: { type: "array", items: { type: "string" } }
          },
          required: ["revenue", "cost", "policy", "technology"]
        }
      },
      required: [
        "tagline",
        "description",
        "lifecycle",
        "companySize",
        "targetMarket",
        "location",
        "businessModel",
        "tags",
        "brandDna",
        "coreAdvantages",
        "features",
        "targetAudience",
        "competitors",
        "reachAndEcosystem",
        "impactAnalysis"
      ]
    }
  };

  const prompt = `You are an expert brand strategist. Analyse the brand "${brandName}" at ${url}.

Website context:
${scrapedContext || `Brand: ${brandName}\nURL: ${url}`}

Return a comprehensive brand profile matching the required JSON schema exactly.

Important rules:
- Always include every field from the schema
- Never omit keys
- Use "" for unknown strings
- Use [] for unknown arrays
- Every feature must include title, description, and icon
- Every target audience item must include segment, description, and tags
- Do not invent facts beyond the provided context`;

  const systemPrompt = `You are a world-class brand strategist. Respond ONLY with valid JSON matching the provided schema exactly.`;

  return this.generateContent(prompt, systemPrompt, brandProfileSchema);
}

  /**
   * Get comprehensive marketing strategy based on URL
   * Used for deep research and campaign planning
   */
  async getMarketingStrategy(url: string): Promise<any> {
    const prompt = `You are a strategic marketing consultant. Based on the website at ${url}, provide a comprehensive marketing strategy.
Return ONLY raw valid JSON with these exact keys:
{
  "overview": "strategic overview",
  "targetAudience": "description of target audience",
  "marketOpportunities": ["opportunity1", "opportunity2", "opportunity3"],
  "recommendedChannels": ["channel1", "channel2"],
  "budgetAllocation": { "channel1": "percentage", "channel2": "percentage" },
  "keyMetrics": ["metric1", "metric2", "metric3"],
  "timeline": "recommended campaign timeline"
}`;

    try {
      const systemPrompt = `You are an expert strategic marketing consultant. Always return ONLY raw valid JSON, no markdown, no explanation.`;
      const response = await this.generateContent(prompt, systemPrompt);
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        success: true,
        data: parsed,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error('Failed to get marketing strategy', error);
      throw new BadRequestException('Failed to generate marketing strategy: ' + (error.message || 'Unknown error'));
    }
  }
}
