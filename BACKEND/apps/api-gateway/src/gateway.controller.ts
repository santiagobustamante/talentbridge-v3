import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpClient } from './http-client.service';

@Controller()
export class GatewayController {
  constructor(private readonly httpClient: HttpClient) {}

  @All('*path')
  proxyAll(@Req() req: Request, @Res() res: Response) {
    const fullPath = req.path;

    if (fullPath.startsWith('/api/auth')) {
      return this.httpClient.proxy(req, res, process.env['AUTH_SERVICE_URL'] || 'http://localhost:3001');
    }

    if (fullPath.startsWith('/api/profile')) {
      return this.httpClient.proxy(req, res, process.env['CANDIDATE_SERVICE_URL'] || 'http://localhost:3002');
    }

    if (fullPath.startsWith('/api/skills') || fullPath.startsWith('/api/experiences') ||
        fullPath.startsWith('/api/education') || fullPath.startsWith('/api/projects') ||
        fullPath.startsWith('/api/cv') || fullPath.startsWith('/api/portfolio')) {
      return this.httpClient.proxy(req, res, process.env['PORTFOLIO_SERVICE_URL'] || 'http://localhost:3003');
    }

    if (fullPath.startsWith('/api/company/jobs/') && (fullPath.includes('/applications') || fullPath.includes('/apply'))) {
      return this.httpClient.proxy(req, res, process.env['APPLICATIONS_SERVICE_URL'] || 'http://localhost:3007');
    }

    if (fullPath.startsWith('/api/company/applications')) {
      return this.httpClient.proxy(req, res, process.env['APPLICATIONS_SERVICE_URL'] || 'http://localhost:3007');
    }

    if (fullPath.startsWith('/api/notifications')) {
      return this.httpClient.proxy(req, res, process.env['APPLICATIONS_SERVICE_URL'] || 'http://localhost:3007');
    }

    if (fullPath.startsWith('/api/company/jobs')) {
      return this.httpClient.proxy(req, res, process.env['JOBS_SERVICE_URL'] || 'http://localhost:3006');
    }

    if (fullPath.startsWith('/api/company')) {
      return this.httpClient.proxy(req, res, process.env['COMPANY_SERVICE_URL'] || 'http://localhost:3004');
    }

    if (fullPath.startsWith('/api/jobs/') && (fullPath.includes('/apply') || fullPath.includes('/my-applications'))) {
      return this.httpClient.proxy(req, res, process.env['APPLICATIONS_SERVICE_URL'] || 'http://localhost:3007');
    }

    if (fullPath.startsWith('/api/jobs')) {
      return this.httpClient.proxy(req, res, process.env['JOBS_SERVICE_URL'] || 'http://localhost:3006');
    }

    if (fullPath.startsWith('/api/chat')) {
      return this.httpClient.proxy(req, res, process.env['CHAT_SERVICE_URL'] || 'http://localhost:3008');
    }

    if (fullPath.startsWith('/api/assistant')) {
      return this.httpClient.proxy(req, res, process.env['ASSISTANT_SERVICE_URL'] || 'http://localhost:3009');
    }

    if (fullPath.startsWith('/api/dashboard')) {
      return this.httpClient.proxy(req, res, process.env['DASHBOARD_SERVICE_URL'] || 'http://localhost:3010');
    }

    return res.status(404).json({ statusCode: 404, message: 'Ruta no encontrada' });
  }
}
