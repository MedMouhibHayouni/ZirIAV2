import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Inventory } from '../inventory/entities/inventory.entity';
import { TransportRequest } from '../drivers/entities/transport-request.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { MarketplaceListing, ListingStatus, ListingCategory } from './entities/marketplace-listing.entity';
import { MarketplaceInquiry } from './entities/marketplace-inquiry.entity';
import { MediaManagementService } from './media-management.service';
import {
  MarketplaceConnection,
  ConnectionStatus,
} from './entities/marketplace-connection.entity';
import {
  CreatePublicListingDto,
  UpdateListingStatusDto,
  ExpressInterestDto,
  SubmitInquiryDto,
} from './dto/marketplace.dto';
import { NotificationService } from '../notifications/notification.service';
import { MessagesService } from '../messages/messages.service';
import { PaginatedResult } from '../common/dto/paginated.dto';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { TransactionCoordinatorService } from '../transactions/transactions-coordinator.service';
import { CommissionTransactionType } from '../finance/entities/platform-commission.entity';
import { RecordCategory } from '../finance/entities/financial-record.entity';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,

    @InjectRepository(MarketplaceConnection)
    private readonly connectionRepo: Repository<MarketplaceConnection>,

    @InjectRepository(MarketplaceInquiry)
    private readonly inquiryRepo: Repository<MarketplaceInquiry>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly notificationService: NotificationService,
    private readonly messagesService: MessagesService,
    private readonly subscriptionService: SubscriptionService,
    private readonly transactionCoordinator: TransactionCoordinatorService,
    private readonly mediaManager: MediaManagementService,
  ) {}

  // ─── PUBLIC (No Auth) ──────────────────────────────────────────────────────

  async findAllPublic(filters: {
    category?: ListingCategory;
    search?: string;
    location?: string;
    page?: number;
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    priceOnRequest?: boolean;
    sortBy?: string;
  }): Promise<PaginatedResult<any>> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 24, 60);

    const qb = this.listingRepo
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .where('listing.status = :status', { status: ListingStatus.ACTIVE });

    if (filters.category) {
      qb.andWhere('listing.category = :cat', { cat: filters.category });
    }
    if (filters.search) {
      qb.andWhere(
        '(LOWER(listing.title) LIKE :s OR LOWER(listing.crop_type) LIKE :s OR LOWER(listing.description) LIKE :s)',
        { s: `%${filters.search.toLowerCase()}%` },
      );
    }
    if (filters.location) {
      qb.andWhere('LOWER(listing.location_label) LIKE :loc', {
        loc: `%${filters.location.toLowerCase()}%`,
      });
    }

    if (filters.minPrice !== undefined && filters.minPrice !== null) {
      qb.andWhere('listing.price_tnd >= :minPrice AND listing.price_on_request = false', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      qb.andWhere('listing.price_tnd <= :maxPrice AND listing.price_on_request = false', { maxPrice: filters.maxPrice });
    }
    if (filters.priceOnRequest !== undefined && filters.priceOnRequest !== null) {
      if (filters.priceOnRequest) {
        qb.andWhere('listing.price_on_request = true');
      } else {
        qb.andWhere('listing.price_on_request = false');
      }
    }

    if (filters.sortBy === 'price_asc') {
      qb.orderBy('listing.price_tnd', 'ASC');
    } else if (filters.sortBy === 'price_desc') {
      qb.orderBy('listing.price_tnd', 'DESC');
    } else if (filters.sortBy === 'date_asc') {
      qb.orderBy('listing.created_at', 'ASC');
    } else {
      qb.orderBy('listing.listing_quality_score', 'DESC')
        .addOrderBy('listing.created_at', 'DESC');
    }

    qb.skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Map: expose seller name only (not sensitive data beyond what's on the listing)
    const mapped = items.map((l) => this.mapPublicListing(l));

    return { items: mapped, total, page, limit, hasNext: page * limit < total };
  }

  async findOnePublic(id: string): Promise<any> {
    const listing = await this.listingRepo.findOne({
      where: { id },
      relations: ['seller'],
    });
    if (!listing) throw new NotFoundException(`Annonce ${id} introuvable`);
    return this.mapPublicListing(listing, true);
  }

  /** Seller dashboard: all own listings (any status), same public shape + status */
  async findMyListings(sellerId: string): Promise<any[]> {
    const items = await this.listingRepo.find({
      where: { seller_id: sellerId },
      relations: ['seller'],
      order: { created_at: 'DESC' },
    });
    return items.map((listing) => ({
      ...this.mapPublicListing(listing, true),
      status: listing.status,
      parcel_id: listing.parcel_id,
    }));
  }

  /** TypeORM simple-array can return a comma-joined string; normalize for the public API */
  private normalizePhotoUrls(photoUrls: string[] | string | null | undefined): string[] {
    if (!photoUrls) return [];
    const raw = typeof photoUrls === 'string'
      ? photoUrls.split(',').map((u) => u.trim())
      : photoUrls;
    return raw.filter((u) => u.length > 0 && /^https?:\/\//i.test(u));
  }

  /** Expose the contact_phone and contact_email from the listing (denormalized), falling back to seller profile */
  private mapPublicListing(listing: MarketplaceListing, includeContact = false): any {
    const displayPrice =
      listing.price_on_request
        ? null
        : (listing.price_tnd != null ? listing.price_tnd : listing.price_per_kg);

    const base: any = {
      id: listing.id,
      title: listing.title?.trim() || listing.crop_type?.trim() || 'Annonce agricole',
      category: listing.category,
      crop_type: listing.crop_type,
      description: listing.description,
      photo_urls: (listing.media_items || []).filter((m) => m.type === 'photo').map((m) => m.url),
      media_items: listing.media_items || [],
      primary_media_url: listing.primary_media_url,
      listing_quality_score: listing.listing_quality_score || 0,
      quantity_value: listing.quantity_value,
      quantity_unit: listing.quantity_unit,
      price_tnd: displayPrice,
      price_on_request: listing.price_on_request,
      location_label: listing.location_label,
      created_at: listing.created_at,
      seller_id: listing.seller_id,
      seller_name: listing.seller?.name || 'Vendeur ZirIA',
      // Category-specific
      livestock_type: listing.livestock_type,
      equipment_condition: listing.equipment_condition,
      land_size_ha: listing.land_size_ha,
      land_water_access: listing.land_water_access,
      land_soil_type: listing.land_soil_type,
      land_open_for_bidding: listing.land_open_for_bidding,
      // Traceability (Sprint 5)
      floral_origin: listing.floral_origin,
      sanitary_cert: listing.sanitary_cert,
      breeding_method: listing.breeding_method,
      traceability_ref_id: listing.traceability_ref_id,
    };

    // Contact info is always public (key feature of the public marketplace)
    base.contact_phone = listing.contact_phone || listing.seller?.phone || null;
    base.contact_email = listing.contact_email || listing.seller?.email || null;

    return base;
  }

  async submitInquiry(dto: SubmitInquiryDto): Promise<{ success: boolean }> {
    // Validate listing exists
    const listing = await this.listingRepo.findOne({
      where: { id: dto.listing_id },
      relations: ['seller'],
    });
    if (!listing) throw new NotFoundException(`Annonce ${dto.listing_id} introuvable`);

    // Save inquiry to DB
    const inquiry = this.inquiryRepo.create({
      listing_id: dto.listing_id,
      seller_id: listing.seller_id,
      inquirer_name: dto.inquirer_name,
      inquirer_email: dto.inquirer_email,
      inquirer_phone: dto.inquirer_phone || null,
      message: dto.message,
    });
    await this.inquiryRepo.save(inquiry);

    // Notify the seller via platform notification
    await this.notificationService.sendToUsers(
      [listing.seller_id],
      `📩 Nouveau contact pour votre annonce`,
      `${dto.inquirer_name} (${dto.inquirer_email}) a envoyé une demande pour "${listing.title}": ${dto.message.substring(0, 80)}...`,
      {
        type: 'MARKETPLACE_INQUIRY',
        listing_id: dto.listing_id,
        inquirer_name: dto.inquirer_name,
        inquirer_email: dto.inquirer_email,
        inquirer_phone: dto.inquirer_phone,
      },
    );

    return { success: true };
  }

  // ─── AUTHENTICATED CRUD ────────────────────────────────────────────────────

  async create(dto: CreatePublicListingDto, sellerId: string, photoUrls: string[] = []): Promise<MarketplaceListing> {
    const limitCheck = await this.subscriptionService.checkLimit(sellerId, 'listings');
    if (!limitCheck.allowed) {
      throw new ForbiddenException(
        `Plan ${limitCheck.planName}: ${limitCheck.current}/${limitCheck.limit} annonces actives. Passez au plan supérieur.`,
      );
    }

    // If linked_to_stock is enabled, sync quantity from inventory
    let syncedQty: number | null = dto.quantity_value ?? dto.quantity_tonnes ?? null;
    if (dto.linked_to_stock && dto.crop_type) {
      const inv = await this.dataSource.getRepository(Inventory).findOne({
        where: { owner_id: sellerId, crop_type: dto.crop_type },
      });
      if (inv) syncedQty = inv.quantity_tonnes;
    }

    const initialMedia = photoUrls.map((url, idx) => {
      const isVideo = url.includes('placeholder_video') || url.endsWith('.mp4') || url.includes('/video/upload/');
      return {
        type: (isVideo ? 'video' : 'photo') as 'photo' | 'video',
        url,
        position: idx,
      };
    });

    const status = initialMedia.length > 0 ? ListingStatus.ACTIVE : ListingStatus.DRAFT;

    const listing = this.listingRepo.create({
      ...dto,
      seller_id: sellerId,
      status,
      media_items: initialMedia,
      primary_media_url: initialMedia.length > 0 ? initialMedia[0].url : null,
      quantity_value: syncedQty,
      quantity_tonnes: dto.quantity_tonnes ?? syncedQty ?? null,
      price_per_kg: dto.price_per_kg ?? null,
    });

    listing.listing_quality_score = await this.mediaManager.recalculateQualityScore(listing);
    return this.listingRepo.save(listing);
  }

  async findAll(
    cropType?: string,
    cooperativeId?: string,
    page = 1,
    limit = 20,
    governorate?: string,
  ): Promise<PaginatedResult<MarketplaceListing>> {
    const query = this.listingRepo
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.parcel', 'parcel')
      .where('listing.status = :status', { status: ListingStatus.ACTIVE });

    if (cooperativeId) {
      query.andWhere('listing.cooperative_id = :coopId', { coopId: cooperativeId });
    }
    if (cropType) {
      query.andWhere('(LOWER(listing.crop_type) LIKE :crop OR LOWER(listing.title) LIKE :crop)', {
        crop: `%${cropType.toLowerCase()}%`,
      });
    }
    if (governorate) {
      query.andWhere('seller.governorate = :governorate', { governorate });
    }

    query.orderBy('listing.listing_quality_score', 'DESC')
      .addOrderBy('listing.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit, hasNext: page * limit < total };
  }

  async searchListings(filters: {
    cropType?: string;
    governorate?: string;
    minQty?: number;
    maxPrice?: number;
    limit?: number;
  }): Promise<MarketplaceListing[]> {
    const qb = this.listingRepo
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('listing.parcel', 'parcel')
      .where('listing.status = :status', { status: ListingStatus.ACTIVE });

    if (filters.cropType) {
      qb.andWhere('(LOWER(listing.crop_type) LIKE :crop OR LOWER(listing.title) LIKE :crop)', {
        crop: `%${filters.cropType.toLowerCase()}%`,
      });
    }
    if (filters.minQty && filters.minQty > 0) {
      qb.andWhere('COALESCE(listing.quantity_value, listing.quantity_tonnes) >= :minQty', {
        minQty: filters.minQty,
      });
    }
    if (filters.maxPrice && filters.maxPrice > 0) {
      qb.andWhere('COALESCE(listing.price_tnd, listing.price_per_kg) <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    return qb.orderBy('listing.created_at', 'DESC').take(filters.limit ?? 40).getMany();
  }

  async findOne(id: string): Promise<MarketplaceListing> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new NotFoundException(`Annonce ${id} introuvable (Format invalide)`);
    }
    const listing = await this.listingRepo.findOne({
      where: { id },
      relations: ['seller', 'parcel'],
    });
    if (!listing) throw new NotFoundException(`Annonce ${id} introuvable`);
    return listing;
  }

  async updateStatus(id: string, dto: UpdateListingStatusDto, userId: string, isAdmin: boolean): Promise<MarketplaceListing> {
    const listing = await this.findOne(id);
    if (!isAdmin && listing.seller_id !== userId) {
      throw new ForbiddenException('Modification réservée au vendeur');
    }
    if (dto.status === ListingStatus.ACTIVE) {
      const photos = (listing.media_items || []).filter((m) => m.type === 'photo');
      if (photos.length === 0) {
        throw new BadRequestException('Une annonce doit contenir au moins 1 photo pour être activée.');
      }
    }
    listing.status = dto.status;
    return this.listingRepo.save(listing);
  }

  async updateListing(id: string, dto: any, userId: string, isAdmin: boolean): Promise<MarketplaceListing> {
    const listing = await this.findOne(id);
    if (!isAdmin && listing.seller_id !== userId) {
      throw new ForbiddenException('Modification réservée au vendeur');
    }
    // Apply only the provided fields
    const updatableFields = [
      'title', 'description', 'category', 'crop_type',
      'quantity_value', 'quantity_unit', 'price_tnd', 'price_on_request',
      'location_label', 'contact_phone', 'contact_email',
      'livestock_type', 'equipment_condition',
      'land_size_ha', 'land_water_access', 'land_soil_type', 'land_open_for_bidding',
      'floral_origin', 'sanitary_cert', 'breeding_method', 'traceability_ref_id',
    ];
    for (const field of updatableFields) {
      if (dto[field] !== undefined && dto[field] !== null && dto[field] !== '') {
        (listing as any)[field] = dto[field];
      }
    }
    listing.listing_quality_score = await this.mediaManager.recalculateQualityScore(listing);
    return this.listingRepo.save(listing);
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const listing = await this.findOne(id);
    if (!isAdmin && listing.seller_id !== userId) {
      throw new ForbiddenException('Suppression réservée au vendeur');
    }
    await this.listingRepo.remove(listing);
  }

  // ─── B2B Connection Workflow (preserved) ───────────────────────────────────

  async expressInterest(listingId: string, buyerId: string, dto: ExpressInterestDto): Promise<MarketplaceConnection> {
    const listing = await this.findOne(listingId);

    if (listing.status !== ListingStatus.ACTIVE) {
      throw new ConflictException(`Cette annonce n'est plus disponible (statut : ${listing.status})`);
    }

    const existingConnection = await this.connectionRepo.findOne({
      where: { listing_id: listingId, buyer_id: buyerId },
    });
    if (existingConnection) {
      throw new ConflictException(
        `Vous avez déjà exprimé votre intérêt. Statut actuel : ${existingConnection.status}`,
      );
    }

    listing.status = ListingStatus.PENDING_CONFIRMATION;
    await this.listingRepo.save(listing);

    const connectionEntity = this.connectionRepo.create({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: listing.seller_id,
      status: ConnectionStatus.PENDING,
      message: dto?.message ?? null,
    });
    const savedConnection = await this.connectionRepo.save(connectionEntity) as MarketplaceConnection;

    await this.notificationService.sendToUsers(
      [listing.seller_id],
      '📩 Nouvelle demande B2B',
      `Un acheteur est intéressé par "${listing.title}". Répondez depuis votre tableau de bord.`,
      {
        type: 'B2B_REQUEST',
        connection_id: savedConnection.id,
        listing_id: listingId,
        crop_type: listing.crop_type,
      },
    );

    return savedConnection;
  }

  async respondToInterest(connectionId: string, sellerId: string, action: 'CONFIRM' | 'REJECT'): Promise<MarketplaceConnection> {
    const connection = await this.connectionRepo.findOne({
      where: { id: connectionId },
      relations: ['listing', 'listing.parcel', 'buyer', 'listing.seller'],
    });

    if (!connection) throw new NotFoundException(`Connexion ${connectionId} introuvable`);
    if (connection.seller_id !== sellerId) throw new ForbiddenException('Action réservée au vendeur');
    if (connection.status !== ConnectionStatus.PENDING) {
      throw new ConflictException(`Connexion déjà traitée (statut : ${connection.status})`);
    }

    if (action === 'CONFIRM') {
      const sellerLng = Number(connection.listing.parcel?.lng ?? connection.listing.seller.lng);
      const sellerLat = Number(connection.listing.parcel?.lat ?? connection.listing.seller.lat);
      if (!Number.isFinite(sellerLng) || !Number.isFinite(sellerLat)) {
        throw new BadRequestException('Coordonnées vendeur invalides: impossible de créer la livraison');
      }
      const rawBuyerLng = Number(connection.buyer.lng);
      const rawBuyerLat = Number(connection.buyer.lat);
      const buyerLng = Number.isFinite(rawBuyerLng) ? rawBuyerLng : sellerLng;
      const buyerLat = Number.isFinite(rawBuyerLat) ? rawBuyerLat : sellerLat;

      const qty = connection.listing.quantity_tonnes || connection.listing.quantity_value || 1;
      const price = connection.listing.price_per_kg || connection.listing.price_tnd || 0;
      const grossTnd = qty * 1000 * price;

      await this.transactionCoordinator.confirmTransaction({
        type: CommissionTransactionType.MARKETPLACE_SALE,
        category: RecordCategory.SALE,
        grossTnd,
        payerUserId: connection.buyer_id,
        payeeUserId: sellerId,
        relatedEntityId: connection.listing_id,
        relatedEntityType: 'MarketplaceListing',
        rate: 0.04,
        stockUpdateFn: async (qr) => {
          await qr.manager.update(MarketplaceConnection, connectionId, { status: ConnectionStatus.CONFIRMED });
          await qr.manager.update(MarketplaceListing, connection.listing_id, { status: ListingStatus.SOLD });

          if (connection.listing.crop_type) {
            const inventory = await qr.manager.findOne(Inventory, {
              where: { owner_id: sellerId, crop_type: connection.listing.crop_type },
            });
            if (inventory) {
              inventory.quantity_tonnes -= qty;
              if (inventory.quantity_tonnes < 0) inventory.quantity_tonnes = 0;
              await qr.manager.save(Inventory, inventory);
            }
          }
        },
        transportNeeded: {
          originLat: sellerLat || 0,
          originLng: sellerLng || 0,
          destLat: buyerLat || 0,
          destLng: buyerLng || 0,
          cargoKg: qty * 1000,
          description: connection.listing.title || connection.listing.crop_type || 'Produit agricole',
        },
        notificationPayer: {
          title: 'Intérêt Confirmé ✔️',
          message: `Le vendeur a confirmé votre demande pour "${connection.listing.title}".`,
          payload: { type: 'INTEREST_CONFIRMED', connection_id: connectionId },
        },
      });

      return this.connectionRepo.findOne({ where: { id: connectionId } }) as Promise<MarketplaceConnection>;
    } else {
      connection.status = ConnectionStatus.REJECTED;
      await this.connectionRepo.save(connection);
      await this.listingRepo.update(connection.listing_id, { status: ListingStatus.ACTIVE });

      await this.notificationService.sendPushToUser(connection.buyer_id, {
        title: 'Demande Non Retenue',
        message: `Le vendeur n'a pas pu donner suite à votre demande pour le moment.`,
        payload: { type: 'INTEREST_REJECTED', connection_id: connectionId },
      });

      return connection;
    }
  }

  getMyConnections(userId: string, role: string, status?: string): Promise<MarketplaceConnection[]> {
    const field = role === 'B2B_BUYER' ? 'buyer_id' : 'seller_id';
    const whereClause: any = { [field]: userId };
    if (status) whereClause.status = status;
    return this.connectionRepo.find({
      where: whereClause,
      relations: ['listing', 'buyer', 'seller'],
      order: { created_at: 'DESC' },
    });
  }

  async updateConnectionStatus(connectionId: string, status: string, userId: string): Promise<MarketplaceConnection> {
    const connection = await this.connectionRepo.findOne({ where: { id: connectionId } });
    if (!connection) throw new NotFoundException(`Connexion ${connectionId} introuvable`);
    if (connection.buyer_id !== userId && connection.seller_id !== userId) {
      throw new ForbiddenException('Non autorisé à modifier cette connexion');
    }
    connection.status = status as ConnectionStatus;
    return this.connectionRepo.save(connection);
  }

  async getSupplyTension() {
    return this.dataSource.query(`
      WITH active_volume AS (
        SELECT crop_type, SUM(COALESCE(quantity_tonnes, quantity_value, 0)) as current_vol
        FROM marketplace_listings
        WHERE status = 'ACTIVE' AND crop_type IS NOT NULL
        GROUP BY crop_type
      ),
      historical_volume AS (
        SELECT crop_type, SUM(COALESCE(quantity_tonnes, quantity_value, 0)) / 3 as avg_90d_vol
        FROM marketplace_listings
        WHERE created_at >= NOW() - INTERVAL '90 days' AND crop_type IS NOT NULL
        GROUP BY crop_type
      )
      SELECT 
        a.crop_type, 
        COALESCE(a.current_vol, 0) as current_volume, 
        COALESCE(h.avg_90d_vol, 0) as historical_avg,
        CASE 
          WHEN COALESCE(h.avg_90d_vol, 0) = 0 THEN 0
          ELSE (a.current_vol / h.avg_90d_vol) * 100 
        END as tension_score
      FROM active_volume a
      LEFT JOIN historical_volume h ON a.crop_type = h.crop_type
    `);
  }

  async getSellerStats(sellerId: string) {
    const [listingStats] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int AS active_listings_count,
        COALESCE(SUM(COALESCE(quantity_tonnes, quantity_value, 0) * COALESCE(price_per_kg, price_tnd / 1000.0, 0) * 1000), 0) AS estimated_revenue_tnd
      FROM marketplace_listings
      WHERE seller_id = $1
        AND status IN ('ACTIVE', 'PENDING_CONFIRMATION', 'PENDING_VALIDATION')
        AND deleted_at IS NULL
    `, [sellerId]);

    const [connectionStats] = await this.dataSource.query(`
      SELECT COUNT(*)::int AS pending_connections
      FROM marketplace_connections
      WHERE seller_id = $1 AND status = 'PENDING'
    `, [sellerId]);

    return {
      active_listings_count: Number(listingStats?.active_listings_count ?? 0),
      estimated_revenue_tnd: Number(listingStats?.estimated_revenue_tnd ?? 0),
      pending_connections: Number(connectionStats?.pending_connections ?? 0),
    };
  }
}
