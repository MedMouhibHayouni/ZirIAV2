import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketplaceListing, ListingStatus } from './entities/marketplace-listing.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MediaManagementService {
  constructor(
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async addMediaToListing(
    listingId: string,
    userId: string,
    newItems: { type: 'photo' | 'video'; url: string }[],
    isAdmin = false,
  ): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ['seller'],
    });
    if (!listing) throw new NotFoundException(`Annonce ${listingId} introuvable`);
    if (!isAdmin && listing.seller_id !== userId) {
      throw new ForbiddenException('Non autorisé à modifier cette annonce');
    }

    const currentMedia = listing.media_items || [];
    const photoCount = currentMedia.filter((m) => m.type === 'photo').length + newItems.filter((n) => n.type === 'photo').length;
    const videoCount = currentMedia.filter((m) => m.type === 'video').length + newItems.filter((n) => n.type === 'video').length;

    if (photoCount > 5) {
      throw new BadRequestException('Nombre maximum de photos dépassé (maximum 5 photos)');
    }
    if (videoCount > 1) {
      throw new BadRequestException('Nombre maximum de vidéos dépassé (maximum 1 vidéo)');
    }
    if (currentMedia.length + newItems.length > 8) {
      throw new BadRequestException('Nombre maximum de médias dépassé (maximum 8 éléments)');
    }

    let nextPos = currentMedia.length;
    const itemsToAdd = newItems.map((item) => ({
      type: item.type,
      url: item.url,
      position: nextPos++,
    }));

    listing.media_items = [...currentMedia, ...itemsToAdd];

    // Set primary if none exists
    if (!listing.primary_media_url && listing.media_items.length > 0) {
      const firstPhoto = listing.media_items.find((m) => m.type === 'photo');
      listing.primary_media_url = firstPhoto ? firstPhoto.url : listing.media_items[0].url;
    }

    listing.listing_quality_score = await this.recalculateQualityScore(listing);
    return this.listingRepo.save(listing);
  }

  async reorderMedia(
    listingId: string,
    userId: string,
    newOrder: { url: string; position: number }[],
    isAdmin = false,
  ): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ['seller'],
    });
    if (!listing) throw new NotFoundException(`Annonce ${listingId} introuvable`);
    if (!isAdmin && listing.seller_id !== userId) {
      throw new ForbiddenException('Non autorisé à modifier cette annonce');
    }

    const currentMedia = listing.media_items || [];
    const reordered: typeof currentMedia = [];

    for (const order of newOrder) {
      const match = currentMedia.find((m) => m.url === order.url);
      if (match) {
        reordered.push({
          type: match.type,
          url: match.url,
          position: order.position,
        });
      }
    }

    // Preserve any that were omitted (append at end)
    let maxPos = Math.max(-1, ...reordered.map((r) => r.position));
    for (const m of currentMedia) {
      if (!reordered.some((r) => r.url === m.url)) {
        reordered.push({
          type: m.type,
          url: m.url,
          position: ++maxPos,
        });
      }
    }

    // Sort by position ascending
    listing.media_items = reordered.sort((a, b) => a.position - b.position);

    // Update primary media to match position 0 if possible
    if (listing.media_items.length > 0) {
      const firstPhoto = listing.media_items.find((m) => m.type === 'photo');
      listing.primary_media_url = firstPhoto ? firstPhoto.url : listing.media_items[0].url;
    } else {
      listing.primary_media_url = null;
    }

    listing.listing_quality_score = await this.recalculateQualityScore(listing);
    return this.listingRepo.save(listing);
  }

  async setPrimary(
    listingId: string,
    userId: string,
    position: number,
    isAdmin = false,
  ): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ['seller'],
    });
    if (!listing) throw new NotFoundException(`Annonce ${listingId} introuvable`);
    if (!isAdmin && listing.seller_id !== userId) {
      throw new ForbiddenException('Non autorisé à modifier cette annonce');
    }

    const targetItem = (listing.media_items || []).find((m) => m.position === position);
    if (!targetItem) throw new BadRequestException(`Média à la position ${position} introuvable`);

    listing.primary_media_url = targetItem.url;
    return this.listingRepo.save(listing);
  }

  async removeMedia(
    listingId: string,
    userId: string,
    position: number,
    isAdmin = false,
  ): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
      relations: ['seller'],
    });
    if (!listing) throw new NotFoundException(`Annonce ${listingId} introuvable`);
    if (!isAdmin && listing.seller_id !== userId) {
      throw new ForbiddenException('Non autorisé à modifier cette annonce');
    }

    const currentMedia = listing.media_items || [];
    const updatedMedia = currentMedia
      .filter((m) => m.position !== position)
      .map((m, idx) => ({ ...m, position: idx })); // normalize positions

    if (listing.status === ListingStatus.ACTIVE && updatedMedia.length === 0) {
      throw new BadRequestException('Une annonce active doit contenir au moins 1 média');
    }

    listing.media_items = updatedMedia;

    // Recalculate primary
    if (listing.media_items.length > 0) {
      const stillHasPrimary = listing.media_items.some((m) => m.url === listing.primary_media_url);
      if (!stillHasPrimary) {
        const firstPhoto = listing.media_items.find((m) => m.type === 'photo');
        listing.primary_media_url = firstPhoto ? firstPhoto.url : listing.media_items[0].url;
      }
    } else {
      listing.primary_media_url = null;
    }

    listing.listing_quality_score = await this.recalculateQualityScore(listing);
    return this.listingRepo.save(listing);
  }

  async recalculateQualityScore(listing: MarketplaceListing): Promise<number> {
    let score = 0;
    const media = listing.media_items || [];
    const photos = media.filter((m) => m.type === 'photo');
    const videos = media.filter((m) => m.type === 'video');

    // 1. Photo present (+20)
    if (photos.length >= 1) score += 20;

    // 2. 3+ photos present (+15)
    if (photos.length >= 3) score += 15;

    // 3. Video present (+10)
    if (videos.length >= 1) score += 10;

    // 4. Description length > 100 chars (+20)
    if (listing.description && listing.description.length > 100) score += 20;

    // 5. Price set (+10)
    if (listing.price_tnd != null || listing.price_per_kg != null || listing.price_on_request) {
      score += 10;
    }

    // 6. GPS / Parcel linked (+10)
    if (listing.parcel_id) score += 10;

    // 7. Harvest/availability date present (+10)
    if (listing.harvest_prediction_date) score += 10;

    // 8. Seller phone on profile (+5)
    const seller = listing.seller || await this.userRepo.findOne({ where: { id: listing.seller_id } });
    const hasPhone = !!(listing.contact_phone || seller?.phone);
    if (hasPhone) score += 5;

    return Math.min(100, score);
  }
}
