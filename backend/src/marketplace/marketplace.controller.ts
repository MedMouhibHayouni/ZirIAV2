import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, UseInterceptors, Request,
  UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { MediaManagementService } from './media-management.service';
import {
  CreatePublicListingDto,
  UpdateListingDto,
  UpdateListingStatusDto,
  ExpressInterestDto,
  RespondToInterestDto,
  SubmitInquiryDto,
} from './dto/marketplace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { Idempotent } from '../common/decorators/idempotent.decorator';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { UploadService } from '../upload/upload.service';
import { ListingCategory } from './entities/marketplace-listing.entity';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly service: MarketplaceService,
    private readonly uploadService: UploadService,
    private readonly mediaService: MediaManagementService,
  ) {}

  // ─── PUBLIC Endpoints (No Auth Required) ───────────────────────────────────

  @Get('public')
  @ApiOperation({ summary: '[PUBLIC] Parcourir les annonces sans authentification' })
  @ApiQuery({ name: 'category', required: false, enum: ListingCategory })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'priceOnRequest', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(20000)
  findAllPublic(
    @Query('category') category?: ListingCategory,
    @Query('search') search?: string,
    @Query('location') location?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('priceOnRequest') priceOnRequest?: string,
    @Query('sortBy') sortBy?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const isPriceOnReq = priceOnRequest !== undefined && priceOnRequest !== null ? (priceOnRequest === 'true') : undefined;
    return this.service.findAllPublic({
      category,
      search,
      location,
      minPrice: minPrice ? +minPrice : undefined,
      maxPrice: maxPrice ? +maxPrice : undefined,
      priceOnRequest: isPriceOnReq,
      sortBy,
      page: page ? +page : 1,
      limit: limit ? +limit : 24,
    });
  }

  @Get('public/:id')
  @ApiOperation({ summary: '[PUBLIC] Détails d\'une annonce avec contact vendeur' })
  findOnePublic(@Param('id') id: string) {
    return this.service.findOnePublic(id);
  }

  @Post('public/inquiry')
  @ApiOperation({ summary: '[PUBLIC] Envoyer une demande de contact au vendeur (sans compte)' })
  submitInquiry(@Body() dto: SubmitInquiryDto) {
    return this.service.submitInquiry(dto);
  }

  // ─── AUTHENTICATED Static Routes ───────────────────────────────────────────

  @Get('my-stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Statistiques du vendeur' })
  getMyStats(@CurrentUser() user: any) {
    return this.service.getSellerStats(user.id);
  }

  @Get('my-listings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FARMER, Role.COOP_PRESIDENT, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Mes annonces publiées (tableau de bord agriculteur)' })
  findMyListings(@CurrentUser() user: any) {
    return this.service.findMyListings(user.id);
  }

  @Get('supply-tension')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.B2B_BUYER, Role.COOP_PRESIDENT, Role.EXPERT, Role.ADMIN)
  @ApiOperation({ summary: 'Analyse de la tension de l\'offre' })
  getSupplyTension() {
    return this.service.getSupplyTension();
  }

  @Get('listings/search')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.B2B_BUYER, Role.COOP_PRESIDENT, Role.FARMER, Role.ADMIN, Role.FARMER_AMBASSADOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(15000)
  @ApiOperation({ summary: 'Recherche avancée d\'annonces (B2B Sourcing)' })
  searchListings(
    @Query('crop_type') cropType?: string,
    @Query('governorate') governorate?: string,
    @Query('min_qty') minQty?: string,
    @Query('max_price') maxPrice?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.searchListings({
      cropType, governorate,
      minQty: minQty ? +minQty : undefined,
      maxPrice: maxPrice ? +maxPrice : undefined,
      limit: limit ? +limit : 40,
    });
  }

  @Get('connections/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mes mises en relation (acheteur ou vendeur)' })
  getMyConnections(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('buyer') buyer?: string,
  ) {
    const effectiveRole = buyer === 'true' ? 'B2B_BUYER' : user.role;
    return this.service.getMyConnections(user.id, effectiveRole, status);
  }

  // ─── CREATE with Photo Upload ───────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COOP_PRESIDENT, Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('photos', 8, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max par fichier
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/webm', 'video/quicktime'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG, WebP ou MP4.'), false);
      }
    },
  }), IdempotencyInterceptor)
  @Idempotent()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Publier une annonce (avec photos en multipart/form-data)' })
  async create(
    @Body() dto: CreatePublicListingDto,
    @CurrentUser() user: any,
    @UploadedFiles() photos?: Express.Multer.File[],
  ) {
    let photoUrls: string[] = [];
    if (photos && photos.length > 0) {
      photoUrls = await Promise.all(
        photos.map((f) => {
          const isVideo = f.mimetype.startsWith('video/');
          return isVideo
            ? this.uploadService.uploadVideo(f, 'ziria/marketplace')
            : this.uploadService.uploadImage(f, 'ziria/marketplace');
        }),
      );
    }
    return this.service.create(dto, user.id, photoUrls);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.B2B_BUYER, Role.COOP_PRESIDENT, Role.FARMER, Role.ADMIN, Role.FARMER_AMBASSADOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30000)
  @ApiOperation({ summary: 'Catalogue des offres ACTIVE (filtrable)' })
  findAll(
    @Query('crop') cropType?: string,
    @Query('cooperative_id') cooperativeId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('governorate') governorate?: string,
    @Request() req?: any,
  ) {
    const effectiveCoopId =
      cooperativeId === 'me' && req.user.role === Role.COOP_PRESIDENT
        ? req.user.cooperative_id
        : cooperativeId;
    return this.service.findAll(cropType, effectiveCoopId, page || 1, limit || 20, governorate);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.B2B_BUYER, Role.COOP_PRESIDENT, Role.FARMER, Role.ADMIN, Role.FARMER_AMBASSADOR)
  @ApiOperation({ summary: 'Détails d\'une annonce (authentifié)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COOP_PRESIDENT, Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Modifier les détails d\'une annonce (titre, prix, quantité, etc.)' })
  updateListing(@Param('id') id: string, @Body() dto: UpdateListingDto, @CurrentUser() user: any) {
    return this.service.updateListing(id, dto, user.id, user.role === Role.ADMIN);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COOP_PRESIDENT, Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Modifier le statut d\'une annonce' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateListingStatusDto, @CurrentUser() user: any) {
    return this.service.updateStatus(id, dto, user.id, user.role === Role.ADMIN);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COOP_PRESIDENT, Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Retirer une annonce' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.id, user.role === Role.ADMIN);
  }

  @Post(':id/interest')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.B2B_BUYER)
  @UseInterceptors(IdempotencyInterceptor)
  @Idempotent()
  @ApiOperation({ summary: '[B2B] Exprimer son intérêt pour un lot' })
  expressInterest(
    @Param('id') listingId: string,
    @Body() dto: ExpressInterestDto,
    @CurrentUser() user: any,
  ) {
    return this.service.expressInterest(listingId, user.id, dto);
  }

  @Patch('connections/:connectionId/respond')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COOP_PRESIDENT, Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: '[Vendeur] Confirmer ou rejeter une demande' })
  respond(
    @Param('connectionId') connectionId: string,
    @Body() dto: RespondToInterestDto,
    @CurrentUser() user: any,
  ) {
    return this.service.respondToInterest(connectionId, user.id, dto.action);
  }

  @Patch('connections/:connectionId/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '[B2B/Vendeur] Changer le statut d\'une connexion' })
  updateConnectionStatus(
    @Param('connectionId') connectionId: string,
    @Body('status') status: string,
    @CurrentUser() user: any,
  ) {
    return this.service.updateConnectionStatus(connectionId, status, user.id);
  }

  @Post(':id/media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COOP_PRESIDENT, Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('files', 8, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max par fichier
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/webm', 'video/quicktime'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Type de fichier non supporté. Utilisez JPEG, PNG, WebP ou MP4.'), false);
      }
    },
  }))
  @ApiOperation({ summary: 'Ajouter des photos/vidéos à une annonce existante (Sprint 6)' })
  async addMedia(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const mediaItems = await Promise.all(
      files.map(async (f) => {
        const isVideo = f.mimetype.startsWith('video/');
        const url = isVideo
          ? await this.uploadService.uploadVideo(f, 'ziria/marketplace')
          : await this.uploadService.uploadImage(f, 'ziria/marketplace');
        return {
          type: (isVideo ? 'video' : 'photo') as 'photo' | 'video',
          url,
        };
      }),
    );

    return this.mediaService.addMediaToListing(id, user.id, mediaItems, user.role === Role.ADMIN);
  }

  @Patch(':id/media/reorder')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COOP_PRESIDENT, Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Réordonner les médias d\'une annonce (Sprint 6)' })
  async reorderMedia(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('newOrder') newOrder: { url: string; position: number }[],
  ) {
    if (!newOrder || !Array.isArray(newOrder)) {
      throw new BadRequestException('newOrder doit être un tableau');
    }
    return this.mediaService.reorderMedia(id, user.id, newOrder, user.role === Role.ADMIN);
  }

  @Patch(':id/media/primary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COOP_PRESIDENT, Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Définir un média principal par sa position (Sprint 6)' })
  async setPrimary(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('position') position: number,
  ) {
    if (position === undefined || position === null) {
      throw new BadRequestException('La position est requise');
    }
    return this.mediaService.setPrimary(id, user.id, +position, user.role === Role.ADMIN);
  }

  @Delete(':id/media/:position')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COOP_PRESIDENT, Role.FARMER, Role.FARMER_AMBASSADOR, Role.ADMIN)
  @ApiOperation({ summary: 'Supprimer un média par sa position (Sprint 6)' })
  async removeMedia(
    @Param('id') id: string,
    @Param('position') position: string,
    @CurrentUser() user: any,
  ) {
    return this.mediaService.removeMedia(id, user.id, +position, user.role === Role.ADMIN);
  }
}
