import { Module } from '@nestjs/common';
import { ProductsService } from './products/products.service';
import { ProductsController } from './products/products.controller';
import { StockEntriesService } from './entries/stock-entries.service';
import { StockEntriesController } from './entries/stock-entries.controller';
import { StockOutputsService, StockOutputsController } from './outputs/stock-outputs';
import { StockCategoriesService, StockCategoriesController } from './categories/stock-categories';
import { StockAlertsService, StockAlertsController } from './alerts/stock-alerts';

@Module({
  controllers: [
    ProductsController,
    StockEntriesController,
    StockOutputsController,
    StockCategoriesController,
    StockAlertsController,
  ],
  providers: [
    ProductsService,
    StockEntriesService,
    StockOutputsService,
    StockCategoriesService,
    StockAlertsService,
  ],
  exports: [ProductsService],
})
export class StockModule {}
