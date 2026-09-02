import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
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

  /** Static collection path must stay above :paymentId. */
  @Get('payments')
  listPayments() {
    return this.payments.listAdminPayments().then((items) => ({ items }));
  }

  @Get('payment-products')
  listProducts() {
    return this.payments.listAdminProducts().then((items) => ({ items }));
  }

  @Get('payments/:paymentId')
  getPayment(
    @Param('paymentId', new ParseUUIDPipe({ version: '4' })) paymentId: string,
  ) {
    return this.payments.getAdminPayment(paymentId);
  }

  @Put('payment-products/:productId')
  updateProduct(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() body: unknown,
  ) {
    return this.payments.updateAdminProduct(productId, body);
  }
}
