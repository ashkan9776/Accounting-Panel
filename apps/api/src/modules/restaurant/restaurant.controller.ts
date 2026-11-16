import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { TablesService } from './tables.service';
import { RecipesService } from './recipes.service';
import { RestaurantOrdersService } from './restaurant-orders.service';
import { KdsService } from './kds.service';
import { DeliveriesService } from './deliveries.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/restaurant')
export class RestaurantController {
  constructor(
    private readonly tablesService: TablesService,
    private readonly recipesService: RecipesService,
    private readonly ordersService: RestaurantOrdersService,
    private readonly kdsService: KdsService,
    private readonly deliveriesService: DeliveriesService
  ) {}

  // ۱. سالن و میزها
  @Get('sections')
  async listSections(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const sections = await this.tablesService.listSections(ctx.tenantId, ctx.companyId, ctx.branchId!);
    return { success: true, data: sections };
  }

  @Get('tables')
  async listTables(@Req() req: Request, @Query('sectionId') sectionId?: string) {
    const ctx = req.tenantContext!;
    const tables = await this.tablesService.listTables(ctx.tenantId, ctx.companyId, ctx.branchId!, sectionId);
    return { success: true, data: tables };
  }

  @Post('tables/:id/status')
  async updateTableStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('status') status: any
  ) {
    const ctx = req.tenantContext!;
    const result = await this.tablesService.updateTableStatus(ctx.tenantId, ctx.companyId, id, status);
    return { success: true, data: result };
  }

  @Post('tables/merge')
  async mergeTables(@Req() req: Request, @Body() body: { primaryTableId: string; secondaryTableId: string }) {
    const ctx = req.tenantContext!;
    const result = await this.tablesService.mergeTables(
      ctx.tenantId,
      ctx.companyId,
      body.primaryTableId,
      body.secondaryTableId
    );
    return { success: true, data: result };
  }

  @Post('tables/transfer')
  async transferTable(@Req() req: Request, @Body() body: { fromTableId: string; toTableId: string }) {
    const ctx = req.tenantContext!;
    const result = await this.tablesService.transferTable(
      ctx.tenantId,
      ctx.companyId,
      body.fromTableId,
      body.toTableId
    );
    return { success: true, data: result };
  }

  // ۲. منو، دستور پخت و Food Cost
  @Get('recipes')
  async listRecipes(@Req() req: Request) {
    const ctx = req.tenantContext!;
    const recipes = await this.recipesService.listRecipes(ctx.tenantId, ctx.companyId);
    return { success: true, data: recipes };
  }

  @Get('recipes/:productId')
  async getRecipe(@Req() req: Request, @Param('productId') productId: string) {
    const ctx = req.tenantContext!;
    const recipe = await this.recipesService.getRecipe(ctx.tenantId, ctx.companyId, productId);
    return { success: true, data: recipe };
  }

  @Get('recipes/:productId/analysis')
  async analyzeRecipeFoodCost(
    @Req() req: Request,
    @Param('productId') productId: string,
    @Query('isPopular') isPopular?: string
  ) {
    const ctx = req.tenantContext!;
    const analysis = await this.recipesService.analyzeMenuEngineering(
      ctx.tenantId,
      ctx.companyId,
      productId,
      isPopular !== 'false'
    );
    return { success: true, data: analysis };
  }

  // ۳. سفارشات، فاکتور و Split Bill
  @Post('orders')
  async createOrder(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const order = await this.ordersService.createOrder(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      user.id,
      body
    );
    return { success: true, data: order };
  }

  @Get('orders/:id')
  async getOrder(@Req() req: Request, @Param('id') id: string) {
    const ctx = req.tenantContext!;
    const order = await this.ordersService.getOrder(ctx.tenantId, ctx.companyId, id);
    return { success: true, data: order };
  }

  @Post('orders/:id/split')
  async splitBill(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { method: any; parts?: number }
  ) {
    const ctx = req.tenantContext!;
    const split = await this.ordersService.splitBill(
      ctx.tenantId,
      ctx.companyId,
      id,
      body.method,
      body.parts || 2
    );
    return { success: true, data: split };
  }

  @Post('orders/:id/settle')
  async settleOrder(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const ctx = req.tenantContext!;
    const user = (req as any).user;
    const result = await this.ordersService.settleOrder(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      ctx.fiscalYearId!,
      user.id,
      id,
      body
    );
    return { success: true, data: result };
  }

  // ۴. نمایشگر آشپزخانه KDS
  @Get('kds/tickets')
  async listKdsTickets(
    @Req() req: Request,
    @Query('station') station?: any,
    @Query('status') status?: any
  ) {
    const ctx = req.tenantContext!;
    const tickets = await this.kdsService.listTickets(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      station,
      status
    );
    return { success: true, data: tickets };
  }

  @Post('kds/tickets/:id/status')
  async updateKdsTicketStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('status') status: any
  ) {
    const ctx = req.tenantContext!;
    const ticket = await this.kdsService.updateTicketStatus(
      ctx.tenantId,
      ctx.companyId,
      id,
      status
    );
    return { success: true, data: ticket };
  }

  // ۵. پیک و دلیوری
  @Post('deliveries')
  async createDelivery(@Req() req: Request, @Body() body: any) {
    const ctx = req.tenantContext!;
    const delivery = await this.deliveriesService.createDelivery(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      body.orderId,
      body
    );
    return { success: true, data: delivery };
  }

  @Post('deliveries/:id/assign')
  async assignCourier(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('courierPartyId') courierPartyId: string
  ) {
    const ctx = req.tenantContext!;
    const result = await this.deliveriesService.assignCourier(
      ctx.tenantId,
      ctx.companyId,
      id,
      courierPartyId
    );
    return { success: true, data: result };
  }

  @Post('deliveries/:id/complete')
  async completeDelivery(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const ctx = req.tenantContext!;
    const result = await this.deliveriesService.completeDelivery(
      ctx.tenantId,
      ctx.companyId,
      id,
      body
    );
    return { success: true, data: result };
  }

  @Post('deliveries/settle-courier')
  async settleCourier(
    @Req() req: Request,
    @Body('courierPartyId') courierPartyId: string
  ) {
    const ctx = req.tenantContext!;
    const result = await this.deliveriesService.settleCourier(
      ctx.tenantId,
      ctx.companyId,
      ctx.branchId!,
      courierPartyId
    );
    return { success: true, data: result };
  }
}
