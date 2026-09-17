import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SupplierService } from './supplier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ProductCategory } from './entities/product.entity';
import { OrderStatus } from './entities/product-order.entity';
import { SupplierInvoiceService, CreateManualInvoiceDto } from './supplier-invoice.service';
import { SupplierPurchaseService, CreatePurchaseOrderDto } from './supplier-purchase.service';
import { SupplierStockService } from './supplier-stock.service';
import { SupplierErpAnalyticsService } from './supplier-erp-analytics.service';
import { SupplierPdfService } from './supplier-pdf.service';
import { SupplierCrmService } from './supplier-crm.service';
import { Response } from 'express';
import { Res } from '@nestjs/common';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('supplier')
export class SupplierController {
  constructor(
    private readonly supplierService: SupplierService,
    private readonly supplierInvoiceService: SupplierInvoiceService,
    private readonly supplierPurchaseService: SupplierPurchaseService,
    private readonly supplierStockService: SupplierStockService,
    private readonly supplierErpAnalyticsService: SupplierErpAnalyticsService,
    private readonly supplierPdfService: SupplierPdfService,
    private readonly crmService: SupplierCrmService,
  ) {}

  // --------------------------------------------------------------------------
  // PRODUCTS
  // --------------------------------------------------------------------------

  @Get('products/search')
  @ApiOperation({ summary: 'Recherche PostGIS de produits par proximité' })
  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  @ApiQuery({ name: 'radius_km', type: Number })
  @ApiQuery({ name: 'category', enum: ProductCategory, required: false })
  searchProducts(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius_km') radius_km: string,
    @Query('category') category?: ProductCategory,
  ) {
    return this.supplierService.searchProducts(+lat, +lng, +radius_km, category);
  }

  @Get('products/my')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Lister mes produits (Fournisseur)' })
  getMyProducts(@Request() req) {
    return this.supplierService.getMyProducts(req.user.sub);
  }

  @Post('products')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Créer un produit' })
  createProduct(@Request() req, @Body() dto: any) {
    return this.supplierService.createProduct(req.user.sub, dto);
  }

  @Patch('products/:id')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un produit' })
  updateProduct(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.supplierService.updateProduct(req.user.sub, id, dto);
  }

  @Patch('products/:id/toggle')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Activer / Désactiver un produit' })
  toggleActive(@Request() req, @Param('id') id: string) {
    return this.supplierService.toggleActive(req.user.sub, id);
  }

  @Delete('products/:id')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un produit (Fournisseur)' })
  deleteProduct(@Request() req, @Param('id') id: string) {
    return this.supplierService.deleteProduct(req.user.sub, id);
  }

  @Get('stats')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'KPIs tableau de bord fournisseur' })
  getStats(@Request() req) {
    return this.supplierService.getSupplierStats(req.user.sub);
  }

  // --------------------------------------------------------------------------
  // ORDERS
  // --------------------------------------------------------------------------

  @Post('orders')
  @ApiOperation({ summary: 'Passer une commande (Tous les utilisateurs authentifiés)' })
  createOrder(@Request() req, @Body() dto: { product_id: string; quantity: number; delivery_address?: string; notes?: string }) {
    return this.supplierService.createOrder(req.user.sub, dto);
  }

  @Post('orders/bulk')
  @ApiOperation({ summary: 'Passer une commande groupée' })
  createBulkOrder(@Request() req, @Body() dto: { items: Array<{product_id: string; quantity: number}>; delivery_address?: string; notes?: string }) {
    return this.supplierService.createBulkOrder(req.user.sub, dto);
  }

  @Get('orders/my')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Lister les commandes reçues (Fournisseur)' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  getMyOrders(@Request() req, @Query('status') status?: OrderStatus) {
    return this.supplierService.getMyOrders(req.user.sub, status);
  }

  @Get('orders/my-purchases')
  @ApiOperation({ summary: 'Mes achats en tant qu\'agriculteur (historique commandes)' })
  getMyPurchases(@Request() req) {
    return this.supplierService.getMyPurchases(req.user.sub);
  }

  @Patch('orders/:id/status')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour le statut d\'une commande (Fournisseur)' })
  updateOrderStatus(@Request() req, @Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.supplierService.updateOrderStatus(req.user.sub, id, status);
  }

  // --------------------------------------------------------------------------
  // PROMOTIONS
  // --------------------------------------------------------------------------

  @Get('promotions')
  @ApiOperation({ summary: 'Lister les promotions actives' })
  @ApiQuery({ name: 'governorate', required: false })
  getActivePromotions(@Query('governorate') governorate?: string) {
    return this.supplierService.getActivePromotions(governorate);
  }

  @Post('promotions')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Créer une promotion (Fournisseur)' })
  createPromotion(@Request() req, @Body() dto: any) {
    return this.supplierService.createPromotion(req.user.sub, dto);
  }

  @Delete('promotions/:id')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer/Annuler une promotion (Fournisseur)' })
  deletePromotion(@Request() req, @Param('id') id: string) {
    return this.supplierService.deletePromotion(req.user.sub, id);
  }


  // --------------------------------------------------------------------------
  // INVOICES (ERP)
  // --------------------------------------------------------------------------
  
  @Get('invoices/stats')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  getInvoiceStats(@Request() req) {
    return this.supplierInvoiceService.getInvoiceStats(req.user.sub);
  }

  @Get('invoices')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  getMyInvoices(
    @Request() req,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.supplierInvoiceService.getMyInvoices(req.user.sub, { status, type, search, dateFrom, dateTo });
  }

  @Get('invoices/my-purchases')
  @Roles(Role.FARMER, Role.ADMIN)
  getMyPurchasesInvoices(@Request() req) {
    return this.supplierInvoiceService.getMyPurchasesInvoices(req.user.sub);
  }

  @Get('invoices/:id')
  @Roles(Role.SUPPLIER, Role.FARMER, Role.ADMIN)
  getInvoiceById(@Request() req, @Param('id') id: string) {
    return this.supplierInvoiceService.getInvoiceByIdForAnyParticipant(req.user.sub, id);
  }

  @Get('invoices/:id/pdf')
  @Roles(Role.SUPPLIER, Role.FARMER, Role.ADMIN)
  async generateInvoicePdf(@Request() req, @Param('id') id: string, @Res() res: any) {
    const buffer = await this.supplierPdfService.generateInvoicePdf(req.user.sub, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('invoices/from-order/:orderId')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  createFromOrder(@Request() req, @Param('orderId') orderId: string) {
    return this.supplierInvoiceService.createFromOrder(req.user.sub, orderId);
  }

  @Post('invoices/manual')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  createManual(@Request() req, @Body() body: CreateManualInvoiceDto) {
    return this.supplierInvoiceService.createManual(req.user.sub, body);
  }

  @Patch('invoices/:id')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  updateInvoice(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.supplierInvoiceService.updateInvoice(req.user.sub, id, body);
  }

  @Delete('invoices/:id')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  deleteInvoice(@Request() req, @Param('id') id: string) {
    return this.supplierInvoiceService.deleteInvoice(req.user.sub, id);
  }

  // --------------------------------------------------------------------------
  // PURCHASE ORDERS (ERP)
  // --------------------------------------------------------------------------

  @Get('purchases/stats')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  getPurchaseStats(@Request() req) {
    return this.supplierPurchaseService.getPurchaseStats(req.user.sub);
  }

  @Get('purchases')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  getMyPurchaseOrders(@Request() req, @Query('status') status?: string) {
    return this.supplierPurchaseService.getMyPurchaseOrders(req.user.sub, status);
  }

  @Post('purchases')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  createPurchaseOrder(@Request() req, @Body() body: CreatePurchaseOrderDto) {
    return this.supplierPurchaseService.createPurchaseOrder(req.user.sub, body);
  }

  @Patch('purchases/:id/receive')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  receivePurchaseOrder(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.supplierPurchaseService.receivePurchaseOrder(req.user.sub, id, body);
  }

  @Patch('purchases/:id/cancel')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  cancelPurchaseOrder(@Request() req, @Param('id') id: string) {
    return this.supplierPurchaseService.cancelPurchaseOrder(req.user.sub, id);
  }

  // --------------------------------------------------------------------------
  // STOCK (ERP)
  // --------------------------------------------------------------------------

  @Get('stock/movements')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  getStockMovements(
    @Request() req,
    @Query('product_id') product_id?: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.supplierStockService.getStockMovements(req.user.sub, { product_id, type, dateFrom, dateTo });
  }

  @Get('stock/report')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  getStockReport(@Request() req) {
    return this.supplierStockService.getStockReport(req.user.sub);
  }

  @Post('stock/adjust')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  manualAdjustment(@Request() req, @Body() body: { product_id: string; new_quantity: number; notes: string }) {
    return this.supplierStockService.manualAdjustment(req.user.sub, body);
  }

  // --------------------------------------------------------------------------
  // ERP DASHBOARD
  // --------------------------------------------------------------------------

  @Get('erp/dashboard')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  getErpDashboard(@Request() req) {
    return this.supplierErpAnalyticsService.getErpDashboard(req.user.sub);
  }

  // --------------------------------------------------------------------------
  // CRM CLIENTS
  // --------------------------------------------------------------------------

  @Get('crm/clients')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Lister les clients CRM' })
  getMyCrmClients(
    @Request() req,
    @Query('search') search?: string,
    @Query('segment') segment?: string,
    @Query('tags') tags?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('isArchived') isArchived?: string,
  ) {
    const tagsArray = tags ? tags.split(',') : undefined;
    const archived = isArchived === 'true';
    return this.crmService.getMyCrmClients(req.user.sub, {
      search,
      segment,
      tags: tagsArray,
      sortBy,
      sortOrder,
      isArchived: archived,
    });
  }

  @Get('crm/stats')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Obtenir les statistiques du CRM' })
  getCrmStats(@Request() req) {
    return this.crmService.getCrmStats(req.user.sub);
  }

  @Get('crm/reminders/upcoming')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Obtenir les rappels CRM à venir dans les 7 prochains jours' })
  getUpcomingReminders(@Request() req) {
    return this.crmService.getUpcomingReminders(req.user.sub);
  }

  @Get('crm/clients/:id')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Obtenir les détails d\'un client CRM spécifique' })
  getCrmClientById(@Request() req, @Param('id') id: string) {
    return this.crmService.getCrmClientById(req.user.sub, id);
  }

  @Get('crm/clients/:id/orders')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Obtenir l\'historique des commandes d\'un client CRM' })
  getClientOrders(@Request() req, @Param('id') id: string) {
    return this.crmService.getClientOrders(req.user.sub, id);
  }

  @Get('crm/clients/:id/notes')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Obtenir le journal des interactions d\'un client CRM' })
  getClientNotes(@Request() req, @Param('id') id: string) {
    return this.crmService.getClientNotes(req.user.sub, id);
  }

  @Patch('crm/clients/:id')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Mettre à jour les informations d\'un client CRM' })
  updateCrmClient(
    @Request() req,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.crmService.updateCrmClient(req.user.sub, id, body);
  }

  @Patch('crm/clients/:id/archive')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Archiver un client CRM' })
  archiveCrmClient(@Request() req, @Param('id') id: string) {
    return this.crmService.archiveCrmClient(req.user.sub, id);
  }

  @Post('crm/clients/:id/notes')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Ajouter une note d\'interaction au journal du client CRM' })
  addNote(
    @Request() req,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.crmService.addNote(req.user.sub, id, body);
  }

  @Patch('crm/notes/:noteId')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Modifier une note d\'interaction spécifique' })
  updateNote(
    @Request() req,
    @Param('noteId') noteId: string,
    @Body() body: any,
  ) {
    return this.crmService.updateNote(req.user.sub, noteId, body);
  }

  @Delete('crm/notes/:noteId')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer une note d\'interaction' })
  deleteNote(@Request() req, @Param('noteId') noteId: string) {
    return this.crmService.deleteNote(req.user.sub, noteId);
  }

  @Get('crm/clients/:id/reminders')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Obtenir la liste des rappels planifiés pour un client CRM' })
  getClientReminders(@Request() req, @Param('id') id: string) {
    return this.crmService.getClientReminders(req.user.sub, id);
  }

  @Post('crm/clients/:id/reminders')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Planifier un nouveau rappel pour un client CRM' })
  addReminder(
    @Request() req,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.crmService.addReminder(req.user.sub, id, body);
  }

  @Patch('crm/reminders/:reminderId/complete')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Marquer un rappel CRM comme terminé' })
  completeReminder(@Request() req, @Param('reminderId') reminderId: string) {
    return this.crmService.completeReminder(req.user.sub, reminderId);
  }

  @Delete('crm/reminders/:reminderId')
  @Roles(Role.SUPPLIER, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un rappel CRM' })
  deleteReminder(@Request() req, @Param('reminderId') reminderId: string) {
    return this.crmService.deleteReminder(req.user.sub, reminderId);
  }
}
