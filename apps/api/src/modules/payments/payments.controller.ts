import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentProductType } from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { PremiumService } from './premium.service';
import { PaymentService } from './payment.service';
import { PremiumSubscriptionService } from './premium-subscription.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentService,
    private readonly premium: PremiumService,
    private readonly premiumSubscription: PremiumSubscriptionService,
  ) {}

  @Get('payment-products')
  listProducts(@Query('type') type?: PaymentProductType) {
    return this.payments.listActiveProducts(type);
  }

  @Get('payment-config/public')
  publicConfig() {
    return this.payments.getPublicConfig();
  }

  @UseGuards(MockAuthGuard)
  @Post('payments/orders')
  createOrder(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.payments.createOrder(userId, body);
  }

  @UseGuards(MockAuthGuard)
  @Post('payments/:paymentId/cancel')
  cancelReady(
    @CurrentUserId() userId: string,
    @Param('paymentId', new ParseUUIDPipe({ version: '4' })) paymentId: string,
  ) {
    return this.payments.cancelReadyOrder(userId, paymentId);
  }

  @UseGuards(MockAuthGuard)
  @Post('payments/toss/confirm')
  confirmToss(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.payments.confirmTossPayment(userId, body);
  }

  /** Static path must stay above :paymentId to avoid UUID parse / Prisma 500. */
  @UseGuards(MockAuthGuard)
  @Get('payments/me')
  listMine(@CurrentUserId() userId: string) {
    return this.payments.listMyPayments(userId).then((items) => ({ items }));
  }

  @Get('payments/toss/checkout-page')
  async checkoutPage(
    @Query('token') token: string,
    @Query('callback') callback: string | undefined,
    @Res() res: Response,
  ) {
    const callbackMode =
      callback === 'web' ? 'web' : callback === 'webview' ? 'webview' : 'app';
    const html = await this.payments.getCheckoutPageHtml(token, callbackMode);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('payments/toss/webview-return')
  webviewReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response,
  ) {
    const html = this.payments.getWebViewReturnHtml(query);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('payments/toss/web-callback')
  async webCallback(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response,
  ) {
    const { statusCode, html } = await this.payments.processWebCallback(query);
    res.status(statusCode);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @UseGuards(MockAuthGuard)
  @Get('payments/:paymentId')
  getOne(
    @CurrentUserId() userId: string,
    @Param('paymentId', new ParseUUIDPipe({ version: '4' })) paymentId: string,
  ) {
    return this.payments.getPaymentDetail(userId, paymentId);
  }

  @Get('payments/toss/billing-auth-page')
  async billingAuthPage(
    @Query('customerKey') customerKey: string,
    @Query('plan') plan: string,
    @Res() res: Response,
  ) {
    const html = await this.payments.getBillingAuthPageHtml(customerKey, plan);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @UseGuards(MockAuthGuard)
  @Get('me/premium')
  premiumStatus(@CurrentUserId() userId: string) {
    return this.premium.getStatus(userId);
  }

  @Get('premium/plans')
  premiumPlans() {
    return this.premiumSubscription.getPlanSettings();
  }

  @UseGuards(MockAuthGuard)
  @Post('premium/subscribe/init')
  initPremiumSubscribe(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.premiumSubscription.initSubscription(userId, body);
  }

  @UseGuards(MockAuthGuard)
  @Post('premium/subscribe/confirm')
  confirmPremiumSubscribe(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.premiumSubscription.confirmBilling(userId, body);
  }

  @UseGuards(MockAuthGuard)
  @Post('premium/cancel')
  cancelPremium(@CurrentUserId() userId: string) {
    return this.premiumSubscription.cancelAtPeriodEnd(userId);
  }
}
