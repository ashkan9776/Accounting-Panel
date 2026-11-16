import { Controller, Post, Body } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { TenantOnboardingInput } from '@accounting/core';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/saas/onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Public()
  @Post()
  async onboardTenant(@Body() input: TenantOnboardingInput) {
    const result = await this.onboardingService.onboardTenant(input);
    return { success: true, data: result };
  }
}
