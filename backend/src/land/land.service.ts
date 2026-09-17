import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandListing, LandListingStatus } from './entities/land-listing.entity';

@Injectable()
export class LandService {
  constructor(
    @InjectRepository(LandListing)
    private readonly landRepo: Repository<LandListing>,
  ) {}

  async create(ownerId: string, dto: Partial<LandListing>): Promise<LandListing> {
    const listing = this.landRepo.create({ ...dto, owner_id: ownerId });
    return this.landRepo.save(listing);
  }

  async findAll(governorate?: string, listingType?: string): Promise<LandListing[]> {
    const qb = this.landRepo.createQueryBuilder('ll')
      .leftJoinAndSelect('ll.owner', 'u')
      .where('ll.status = :status', { status: LandListingStatus.ACTIVE });
    if (governorate) qb.andWhere('ll.governorate = :governorate', { governorate });
    if (listingType) qb.andWhere('ll.listing_type = :listingType', { listingType });
    return qb.orderBy('ll.created_at', 'DESC').getMany();
  }

  async findMyListings(ownerId: string): Promise<LandListing[]> {
    return this.landRepo.find({
      where: { owner_id: ownerId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<LandListing> {
    const listing = await this.landRepo.findOne({ where: { id }, relations: ['owner'] });
    if (!listing) throw new NotFoundException(`Annonce foncière ${id} introuvable`);
    return listing;
  }

  async update(id: string, ownerId: string, dto: Partial<LandListing>): Promise<LandListing> {
    const listing = await this.findOne(id);
    if (listing.owner_id !== ownerId) throw new ForbiddenException('Accès refusé');
    Object.assign(listing, dto);
    return this.landRepo.save(listing);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const listing = await this.findOne(id);
    if (listing.owner_id !== ownerId) throw new ForbiddenException('Accès refusé');
    await this.landRepo.remove(listing);
  }

  async markUnderOffer(id: string): Promise<LandListing> {
    const listing = await this.findOne(id);
    listing.status = LandListingStatus.UNDER_OFFER;
    return this.landRepo.save(listing);
  }

  /** Spatial search: Find lands near a specific point */
  async findNearbyLands(lat: number, lng: number, radiusKm = 50): Promise<LandListing[]> {
    return this.landRepo.createQueryBuilder('ll')
      .leftJoinAndSelect('ll.owner', 'u')
      .where('ll.status = :status', { status: LandListingStatus.ACTIVE })
      .andWhere('ST_DWithin(ll.center_location, ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography, :radius)', {
        lng,
        lat,
        radius: radiusKm * 1000,
      })
      .orderBy('ll.surface_ha', 'DESC')
      .getMany();
  }

  async getOwnerStats(ownerId: string) {
    const listings = await this.findMyListings(ownerId);
    const ds = this.landRepo.manager.connection;
    const auctionStats = await ds.query(`
      SELECT 
        COUNT(la.id)::int AS active_auctions,
        COALESCE(MAX(lb_max.best_offer), 0) AS best_offer_tnd,
        COALESCE(SUM(bid_counts.total_bids), 0)::int AS total_bids_received
      FROM land_auctions la
      LEFT JOIN (
        SELECT auction_id, MAX(amount_tnd) AS best_offer FROM land_bids GROUP BY auction_id
      ) lb_max ON lb_max.auction_id = la.id
      LEFT JOIN (
        SELECT auction_id, COUNT(*) AS total_bids FROM land_bids GROUP BY auction_id
      ) bid_counts ON bid_counts.auction_id = la.id
      WHERE la.owner_id = $1 AND la.status = 'ACTIVE'
    `, [ownerId]).catch(() => [{ active_auctions: 0, best_offer_tnd: 0, total_bids_received: 0 }]);

    const s = auctionStats[0] || {};
    return {
      active_listings: listings.filter(l => l.status === LandListingStatus.ACTIVE).length,
      total_listings: listings.length,
      active_auctions: Number(s.active_auctions ?? 0),
      best_offer_tnd: Number(s.best_offer_tnd ?? 0),
      total_bids_received: Number(s.total_bids_received ?? 0),
    };
  }

  async getValuation(listingId: string) {
    const listing = await this.findOne(listingId);
    // Valuation formula based on Tunisian agricultural land market
    // Base: 5000 TND/ha for dryland, 12000 for irrigated, 25000 for olive groves
    const BASE_PRICES: Record<string, number> = {
      'céréales': 5000, 'maraîchage': 12000, 'arboricole': 18000,
      'olive': 25000, 'default': 8000,
    };
    const base = BASE_PRICES[(listing.soil_type ?? '').toLowerCase()] ?? BASE_PRICES.default;
    const waterMultiplier = listing.water_access ? 1.4 : 1.0;
    const estimated_value_tnd = Math.round(listing.surface_ha * base * waterMultiplier);
    const price_per_ha = Math.round(base * waterMultiplier);
    return {
      listing_id: listingId,
      estimated_value_tnd,
      price_per_ha,
      surface_ha: listing.surface_ha,
      soil_type: listing.soil_type,
      water_access: listing.water_access,
      methodology: 'Barème foncier ZirIA v2.1 (marché tunisien 2025)',
    };
  }
}

