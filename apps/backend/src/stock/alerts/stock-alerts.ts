import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate, getSkip } from '../../common/dto/pagination.dto';
import { CanRead, CanUpdate } from '../../common/decorators/permissions.decorator';

// Émis par ProductsService.adjustQuantity() à chaque mouvement de stock
// faisant passer un produit sous son seuil d'alerte.
export interface StockAlertEvent {
  productId: string;
  productName: string;
  currentQty: any;
  alertQty: any;
  isOutOfStock: boolean;
}

// ── Service ───────────────────────────────────────────────────
@Injectable()
export class StockAlertsService {
  private readonly logger = new Logger(StockAlertsService.name);

  constructor(private prisma: PrismaService) {}

  @OnEvent('stock.alert')
  async handleStockAlert(event: StockAlertEvent) {
    // L'écouteur ne doit jamais faire échouer le mouvement de stock qui
    // a émis l'événement : on journalise et on continue.
    try {
      // Une seule alerte non lue par produit : on met à jour l'existante
      // plutôt que d'en empiler une par mouvement de stock.
      const pending = await this.prisma.stockAlert.findFirst({
        where: { productId: event.productId, readAt: null },
      });

      if (pending) {
        await this.prisma.stockAlert.update({
          where: { id: pending.id },
          data: {
            currentQty: event.currentQty,
            alertQty: event.alertQty,
            isOutOfStock: event.isOutOfStock,
            createdAt: new Date(),
          },
        });
        return;
      }

      await this.prisma.stockAlert.create({
        data: {
          productId: event.productId,
          currentQty: event.currentQty,
          alertQty: event.alertQty,
          isOutOfStock: event.isOutOfStock,
        },
      });
    } catch (err) {
      this.logger.error(
        `Échec d'enregistrement de l'alerte pour ${event.productName} (${event.productId})`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async findAll(dto: { page?: number; limit?: number } & { unreadOnly?: boolean }) {
    const where: any = {};
    if (dto.unreadOnly) where.readAt = null;

    const [data, total] = await Promise.all([
      this.prisma.stockAlert.findMany({
        where,
        include: { product: { include: { category: true } } },
        skip: getSkip(dto),
        take: dto.limit,
        orderBy: [{ isOutOfStock: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.stockAlert.count({ where }),
    ]);

    return paginate(data, total, dto);
  }

  async countUnread() {
    const count = await this.prisma.stockAlert.count({ where: { readAt: null } });
    return { count };
  }

  async markAsRead(id: string) {
    const alert = await this.prisma.stockAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Alerte introuvable');

    return this.prisma.stockAlert.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead() {
    const { count } = await this.prisma.stockAlert.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });
    return { count };
  }
}

// ── Controller ────────────────────────────────────────────────
@ApiTags('Stock — Alertes')
@ApiBearerAuth('access-token')
@Controller('stock/alerts')
export class StockAlertsController {
  constructor(private service: StockAlertsService) {}

  @Get()
  @CanRead('products')
  @ApiOperation({ summary: 'Notifications de rupture / seuil bas' })
  findAll(@Query() dto: PaginationDto, @Query('unreadOnly') unreadOnly?: string) {
    return this.service.findAll({ ...dto, unreadOnly: unreadOnly === 'true' });
  }

  @Get('unread-count')
  @CanRead('products')
  @ApiOperation({ summary: 'Nombre d\'alertes non lues' })
  countUnread() {
    return this.service.countUnread();
  }

  @Patch('read-all')
  @CanUpdate('products')
  @ApiOperation({ summary: 'Marquer toutes les alertes comme lues' })
  markAllAsRead() {
    return this.service.markAllAsRead();
  }

  @Patch(':id/read')
  @CanUpdate('products')
  @ApiOperation({ summary: 'Marquer une alerte comme lue' })
  markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id);
  }
}
