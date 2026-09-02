import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/admin.guard';
import { PaymentService } from './payment.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentService) {}

  @Get('payment-settings')
  getSettings() {
    return this.payments.getAdminSettings();
  }

  @Put('payment-settings')
  updateSettings(@Body() body: unknown) {
    return this.payments.updateAdminSettings(body);
  }

  @Get('payments')
  listPayments() {
    return this.payments.listAdminPayments().then((items) => ({ items }));
  }

  @Get('payments/:paymentId')
  getPayment(@Param('paymentId') paymentId: string) {
    return this.payments.getAdminPayment(paymentId);
  }

  @Get('payment-products')
  listProducts() {
    return this.payments.listAdminProducts().then((items) => ({ items }));
  }

  @Put('payment-products/:productId')
  updateProduct(@Param('productId') productId: string, @Body() body: unknown) {
    return this.payments.updateAdminProduct(productId, body);
  }
}
