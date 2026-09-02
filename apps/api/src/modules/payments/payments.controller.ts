import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentProductType } from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { PremiumService } from './premium.service';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentService,
    private readonly premium: PremiumService,
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
  @Post('payments/toss/confirm')
  confirmToss(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.payments.confirmTossPayment(userId, body);
  }

  @UseGuards(MockAuthGuard)
  @Get('payments/me')
  listMine(@CurrentUserId() userId: string) {
    return this.payments.listMyPayments(userId).then((items) => ({ items }));
  }

  @Get('payments/toss/checkout-page')
  async checkoutPage(@Query('token') token: string, @Res() res: Response) {
    const html = await this.payments.getCheckoutPageHtml(token);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @UseGuards(MockAuthGuard)
  @Get('payments/:paymentId')
  getOne(@CurrentUserId() userId: string, @Param('paymentId') paymentId: string) {
    return this.payments.getPaymentDetail(userId, paymentId);
  }

  @UseGuards(MockAuthGuard)
  @Get('me/premium')
  premiumStatus(@CurrentUserId() userId: string) {
    return this.premium.getStatus(userId);
  }
}
