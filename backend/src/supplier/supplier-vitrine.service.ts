import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { SupplierReview } from './entities/supplier-review.entity';
import { Product } from './entities/product.entity';
import { ProductOrder } from './entities/product-order.entity';
import { SupplierSubscriptionService } from './supplier-subscription.service';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateVitrineDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  business_name?: string;

  @IsString()
  @IsOptional()
  business_description?: string;

  @IsString()
  @IsOptional()
  vitrine_photo_url?: string;

  @IsString()
  @IsOptional()
  vitrine_cover_url?: string;

  @IsString()
  @IsOptional()
  vitrine_theme_color?: string;

  @IsString()
  @IsOptional()
  vitrine_theme_mode?: string;

  @IsString()
  @IsOptional()
  website_url?: string;

  @IsString()
  @IsOptional()
  facebook_url?: string;

  @IsString()
  @IsOptional()
  whatsapp_number?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  governorate?: string;

  @IsString()
  @IsOptional()
  delegation?: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;
}

@Injectable()
export class SupplierVitrineService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SupplierReview)
    private readonly reviewRepo: Repository<SupplierReview>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductOrder)
    private readonly orderRepo: Repository<ProductOrder>,
    private readonly subService: SupplierSubscriptionService,
    private readonly dataSource: DataSource,
  ) {}

  async getPublicVitrine(supplierId: string, isPreview = false) {
    const supplier = await this.userRepo.findOne({
      where: { id: supplierId, role: 'SUPPLIER' as any },
      select: [
        'id', 'name', 'business_name', 'business_description', 'vitrine_photo_url',
        'vitrine_cover_url', 'vitrine_theme_color', 'vitrine_theme_mode',
        'governorate', 'delegation', 'phone', 'email', 'website_url',
        'facebook_url', 'whatsapp_number', 'average_rating', 'total_reviews',
        'is_vitrine_published'
      ]
    });
 
    if (!supplier) {
      throw new NotFoundException('Vitrine introuvable');
    }
 
    if (!supplier.is_vitrine_published && !isPreview) {
      throw new NotFoundException('Vitrine non publiée');
    }

    const products = await this.productRepo.find({
      where: { supplier_id: supplierId, is_active: true },
      order: { created_at: 'DESC' }
    });

    const reviews = await this.reviewRepo.find({
      where: { supplier_id: supplierId },
      relations: ['reviewer'],
      order: { created_at: 'DESC' },
      take: 10,
    });

    // Map reviewer names for privacy
    const mappedReviews = reviews.map(r => ({
      ...r,
      reviewer_name: r.reviewer?.name ? `${r.reviewer.name.split(' ')[0]} ${r.reviewer.name.split(' ')[1]?.[0] || ''}.` : 'Anonyme',
      reviewer: undefined
    }));

    const active_products_count = await this.productRepo.count({
      where: { supplier_id: supplierId, is_active: true }
    });

    const total_orders_served = await this.orderRepo.count({
      where: { supplier_id: supplierId, status: 'DELIVERED' as any }
    });

    return {
      supplier,
      products,
      reviews: mappedReviews,
      stats: { total_orders_served, active_products_count }
    };
  }

  async getAllPublicVitrines(filters: { governorate?: string, category?: string, search?: string }) {
    const qb = this.userRepo.createQueryBuilder('user')
      .where('user.role = :role', { role: 'SUPPLIER' })
      .andWhere('user.is_vitrine_published = true')
      .select([
        'user.id', 'user.business_name', 'user.name', 'user.vitrine_photo_url',
        'user.governorate', 'user.average_rating', 'user.total_reviews', 'user.vitrine_theme_color'
      ]);

    if (filters.governorate) {
      qb.andWhere('user.governorate = :gov', { gov: filters.governorate });
    }

    if (filters.search) {
      qb.andWhere('(user.business_name ILIKE :search OR user.name ILIKE :search OR user.business_description ILIKE :search)', { search: `%${filters.search}%` });
    }

    const suppliers = await qb.orderBy('user.average_rating', 'DESC')
      .addOrderBy('user.total_reviews', 'DESC')
      .getMany();

    // Map active products count
    return Promise.all(suppliers.map(async (s) => {
      const active_products_count = await this.productRepo.count({ where: { supplier_id: s.id, is_active: true } });
      return { ...s, active_products_count };
    }));
  }

  async submitReview(reviewerId: string, supplierId: string, rating: number, comment?: string) {
    const existing = await this.reviewRepo.findOne({
      where: { supplier_id: supplierId, reviewer_id: reviewerId }
    });
    if (existing) {
      throw new BadRequestException('Vous avez déjà évalué ce fournisseur');
    }

    const deliveredOrder = await this.orderRepo.findOne({
      where: { supplier_id: supplierId, buyer_id: reviewerId, status: 'DELIVERED' as any }
    });

    const review = this.reviewRepo.create({
      supplier_id: supplierId,
      reviewer_id: reviewerId,
      rating,
      comment,
      is_verified_purchase: !!deliveredOrder
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(review);
      // Recalculate averages in SQL
      const stats = await manager.createQueryBuilder()
        .select('AVG(rating)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .from(SupplierReview, 'r')
        .where('r.supplier_id = :supplierId', { supplierId })
        .getRawOne();
      
      const newAvg = stats?.avg ? parseFloat(stats.avg).toFixed(2) : 0;
      const newCount = stats?.count ? parseInt(stats.count, 10) : 0;

      await manager.update(User, { id: supplierId }, {
        average_rating: newAvg as any,
        total_reviews: newCount
      });
    });

    return review;
  }

  async updateVitrineProfile(supplierId: string, dto: UpdateVitrineDto) {
    const activePlan = await this.subService.getSupplierActivePlan(supplierId);
    if (!activePlan || !activePlan.plan) {
      throw new ForbiddenException('Fonctionnalité réservée aux abonnés — activez votre vitrine');
    }
    const user = await this.userRepo.findOne({ where: { id: supplierId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    Object.assign(user, dto);
    await this.userRepo.save(user);
    return user;
  }

  async publishVitrine(supplierId: string) {
    const activePlan = await this.subService.getSupplierActivePlan(supplierId);
    if (!activePlan || !activePlan.plan) {
      throw new ForbiddenException('Fonctionnalité réservée aux abonnés — activez votre vitrine');
    }
    await this.userRepo.update({ id: supplierId }, { is_vitrine_published: true });
    return { success: true };
  }

  async unpublishVitrine(supplierId: string) {
    await this.userRepo.update({ id: supplierId }, { is_vitrine_published: false });
    return { success: true };
  }
}
