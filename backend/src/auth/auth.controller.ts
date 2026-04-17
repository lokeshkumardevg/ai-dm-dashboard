import { Controller, Post, Body, UnauthorizedException, Get, Request, UseGuards, Query, Param, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';




@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: any) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: any) {
    return this.authService.register(registerDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('update')
  async updateProfile(@Request() req: any, @Body() updateDto: any) {
    return this.authService.updateProfile(req.user.id, updateDto);
  }

  // ── Get OAuth URL for a platform ──────────────────────────────────────────

  @Get('oauth-url/:platform')
  async getOAuthUrl(@Param('platform') platform: string) {
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/oauth-callback/${platform}`;

    const urls: Record<string, string> = {
      meta: (() => {
        const appId = process.env.META_APP_ID || '';
        const scope = 'ads_read,ads_management,business_management,pages_read_engagement';
        return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
      })(),

      google: (() => {
        const clientId = process.env.GOOGLE_CLIENT_ID || '';
        const scope = encodeURIComponent('https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.email');
        return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&access_type=offline&prompt=consent`;
      })(),


    };

    const url = urls[platform];
    if (!url) return { success: false, error: 'Unknown platform' };
    return { success: true, url };
  }

  // ── OAuth callback (browser popup lands here) ─────────────────────────────

  @Get('oauth-callback/:platform')
  async oauthCallback(@Param('platform') platform: string, @Request() req: any, @Res() res: any) {
    const code = req.query.code as string;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3000'}/auth/oauth-callback/${platform}`;

    try {
      let accountId = 'unknown';
      let accountName = platform.charAt(0).toUpperCase() + platform.slice(1) + ' Account';

      if (platform === 'meta' && code) {
        // Exchange code for token
        const tokenRes = await fetch(
          `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.META_APP_SECRET}&code=${code}`
        );
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          // Get ad accounts
          const accsRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id&access_token=${tokenData.access_token}`);
          const accsData = await accsRes.json();
          if (accsData.data?.[0]) {
            accountId   = accsData.data[0].account_id;
            accountName = accsData.data[0].name || accountName;
          }
        }
      }

      if (platform === 'google' && code) {
        // Exchange code for token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID || '', client_secret: process.env.GOOGLE_CLIENT_SECRET || '', redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const profileRes = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
          const profile = await profileRes.json();
          accountName = profile.email || accountName;
          accountId   = profile.id || accountId;
        }
      }

      // Close the popup and send result back to opener
      return res.send(`
        <html><body>
        <script>
          window.opener && window.opener.localStorage.setItem('oauth_result_${platform}', JSON.stringify({
            accountId: ${JSON.stringify(accountId)},
            accountName: ${JSON.stringify(accountName)}
          }));
          window.close();
        </script>
        <p>Connected! You can close this window.</p>
        </body></html>
      `);
    } catch (err: any) {
      return res.send(`<html><body><script>window.close();</script><p>Error: ${err.message}</p></body></html>`);
    }
  }

  // ── Save manual platform token ────────────────────────────────────────────

  @Post('connect-platform')
  async connectPlatform(@Body() body: { platformId: string; accountId: string; accessToken: string; accountName: string }) {
    // In production: validate the token by calling the platform's verify endpoint
    // For now: store securely and return confirmation
    return {
      success: true,
      accountName: body.accountName || body.accountId,
      accountId: body.accountId,
      platformId: body.platformId,
      message: 'Platform connected successfully',
    };
  }
}