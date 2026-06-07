import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '@app/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import type { AuthUser } from '@app/auth/strategies/jwt.strategy';
import { InvoicesService } from '@app/invoices/invoices.service';
import { GeminiService } from '@app/gemini/gemini.service';
import { CreateInvoiceDto } from '@app/invoices/dto/create-invoice.dto';
import { UpdateInvoiceDto } from '@app/invoices/dto/update-invoice.dto';
import { QueryInvoicesDto } from '@app/invoices/dto/query-invoices.dto';

const UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// The fields we use from the multer file (avoids depending on the global
// Express.Multer namespace augmentation, which editors don't always resolve).
interface UploadedInvoiceFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly gemini: GeminiService,
  ) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto) {
    return this.invoices.create(user.id, dto);
  }

  @Throttle({ default: { limit: 4, ttl: 60000 } })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: UploadedInvoiceFile) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!UPLOAD_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type (use JPG, PNG, WebP, or PDF)');
    }
    const draft = await this.gemini.extractInvoice(file.buffer, file.mimetype);
    return { ...draft, sourceFile: file.originalname };
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
