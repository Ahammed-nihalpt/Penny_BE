import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '@app/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import type { AuthUser } from '@app/auth/strategies/jwt.strategy';
import { InvoicesService } from '@app/invoices/invoices.service';
import { CreateInvoiceDto } from '@app/invoices/dto/create-invoice.dto';
import { UpdateInvoiceDto } from '@app/invoices/dto/update-invoice.dto';
import { QueryInvoicesDto } from '@app/invoices/dto/query-invoices.dto';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: QueryInvoicesDto) {
    return this.invoices.findAll(user.id, query);
  }

  @Get('export')
  async export(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryInvoicesDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const invoices = await this.invoices.findAll(user.id, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
    return this.invoices.toCsv(invoices);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.findOne(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoices.update(user.id, id, dto);
  }

  @Post(':id/pay')
  markPaid(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.markPaid(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoices.remove(user.id, id);
  }
}
