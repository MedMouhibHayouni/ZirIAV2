import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LandAuction, AuctionStatus } from './entities/land-auction.entity';
import { LandBid } from './entities/land-bid.entity';

@Injectable()
export class LandAuctionService {
  private readonly logger = new Logger(LandAuctionService.name);

  constructor(private readonly dataSource: DataSource) {}

  async findAllAuctions(): Promise<LandAuction[]> {
    return this.dataSource.getRepository(LandAuction).find({
      order: { created_at: 'DESC' },
      relations: ['landListing']
    });
  }

  async createAuction(dto: any): Promise<LandAuction> {
    const repo = this.dataSource.getRepository(LandAuction);
    const auction = repo.create({
      ...dto,
      status: AuctionStatus.ACTIVE
    });
    const saved = await repo.save(auction);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async getBids(auctionId: string): Promise<LandBid[]> {
    return this.dataSource.getRepository(LandBid).find({
      where: { auction_id: auctionId },
      order: { created_at: 'ASC' }
    });
  }

  async placeBid(auctionId: string, userId: string, amount: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    
    // RÈGLE ABSOLUE : Verrou pessimiste
    await queryRunner.startTransaction();

    try {
      // 1. SELECT ... FOR UPDATE
      const auction = await queryRunner.manager.findOne(LandAuction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!auction) throw new BadRequestException('Auction not found');
      if (auction.status !== AuctionStatus.ACTIVE) throw new BadRequestException('Auction is not active');
      if (new Date() > auction.end_at) throw new BadRequestException('Auction has ended');

      // 2. Fetch current best bid
      const currentBestBid = await queryRunner.manager.createQueryBuilder(LandBid, 'bid')
        .where('bid.auction_id = :auctionId', { auctionId })
        .orderBy('bid.amount_tnd', 'DESC')
        .setLock('pessimistic_write')
        .getOne();

      const currentPrice = currentBestBid ? currentBestBid.amount_tnd : auction.reserve_price_secret;

      // 3. Validation de l'incrément
      if (amount < Number(currentPrice) + Number(auction.min_increment)) {
         throw new BadRequestException(`Bid must be at least ${Number(currentPrice) + Number(auction.min_increment)} TND`);
      }

      // 4. Update previous winning bid if any
      if (currentBestBid) {
         currentBestBid.is_winning = false;
         await queryRunner.manager.save(currentBestBid);
      }

      // 5. Insert new bid
      const newBid = queryRunner.manager.create(LandBid, {
        auction_id: auctionId,
        user_id: userId,
        amount_tnd: amount,
        is_winning: true
      });
      await queryRunner.manager.save(newBid);

      // 6. Auto-Extension rule (si l'offre arrive dans les 5 dernières minutes)
      const timeRemainingMs = new Date(auction.end_at).getTime() - new Date().getTime();
      const fiveMinutesMs = 5 * 60 * 1000;
      
      if (timeRemainingMs < fiveMinutesMs) {
        const newEndTime = new Date(new Date(auction.end_at).getTime() + (auction.auto_extend_minutes * 60 * 1000));
        auction.end_at = newEndTime;
        await queryRunner.manager.save(auction);
        this.logger.log(`Auction ${auctionId} auto-extended to ${newEndTime}`);
      }

      await queryRunner.commitTransaction();
      return { success: true, bid: newBid, new_end_time: auction.end_at };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error placing bid: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findMyAuctions(ownerId: string): Promise<LandAuction[]> {
    return this.dataSource.getRepository(LandAuction).find({
      where: { owner_id: ownerId } as any,
      order: { created_at: 'DESC' },
      relations: ['landListing'],
    });
  }

  async acceptBestBid(auctionId: string, ownerId: string) {
    const auction = await this.dataSource.getRepository(LandAuction).findOne({ where: { id: auctionId } });
    if (!auction) throw new BadRequestException('Enchère introuvable');
    const bestBid = await this.dataSource.getRepository(LandBid).findOne({
      where: { auction_id: auctionId, is_winning: true },
    });
    if (!bestBid) throw new BadRequestException('Aucune offre à accepter');
    auction.status = AuctionStatus.ENDED;
    await this.dataSource.getRepository(LandAuction).save(auction);
    return { success: true, accepted_bid_tnd: bestBid.amount_tnd };
  }

  async cancelAuction(auctionId: string, ownerId: string) {
    const auction = await this.dataSource.getRepository(LandAuction).findOne({ where: { id: auctionId } });
    if (!auction) throw new BadRequestException('Enchère introuvable');
    auction.status = AuctionStatus.CANCELLED;
    await this.dataSource.getRepository(LandAuction).save(auction);
    return { success: true };
  }

  async getQuestions(auctionId: string): Promise<any[]> {
    try {
      return await this.dataSource.query(
        `SELECT * FROM land_auction_questions WHERE auction_id = $1 ORDER BY created_at DESC`,
        [auctionId]
      );
    } catch (err) {
      this.logger.error(`getQuestions failed for auction ${auctionId}`, err.stack);
      throw new ServiceUnavailableException('Impossible de charger les questions pour le moment');
    }
  }

  async answerQuestion(questionId: string, ownerId: string, answer: string) {
    try {
      await this.dataSource.query(
        `UPDATE land_auction_questions SET answer = $1, answered_at = NOW() WHERE id = $2`,
        [answer, questionId]
      );
    } catch (err) {
      this.logger.error(`answerQuestion failed for question ${questionId}`, err.stack);
      throw new ServiceUnavailableException('Impossible d enregistrer la réponse pour le moment');
    }
    return { success: true };
  }
}

