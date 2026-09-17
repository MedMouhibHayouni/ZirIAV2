import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Equipment } from './entities/equipment.entity';
import { EquipmentReservation } from './entities/equipment-reservation.entity';
import { CreateEquipmentDto } from './dto/equipment.dto';
import { NotificationService } from '../notifications/notification.service';
import { MissionContractService } from '../contracts/mission-contract.service';
import { ContractType } from '../contracts/entities/contract-type.enum';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly repo: Repository<Equipment>,
    @InjectRepository(EquipmentReservation)
    private readonly reservationRepo: Repository<EquipmentReservation>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly contractService: MissionContractService,
  ) {}

  create(dto: CreateEquipmentDto, ownerId: string): Promise<Equipment> {
    return this.repo.save(this.repo.create({ ...dto, owner_id: ownerId }));
  }

  findAll(): Promise<Equipment[]> {
    return this.repo.find({ where: { available: true }, relations: ['owner'] });
  }

  async getAvailable(governorate?: string, startDate?: string, endDate?: string): Promise<Equipment[]> {
    const qb = this.repo.createQueryBuilder('e')
      .leftJoinAndSelect('e.owner', 'owner')
      .where('e.available = true');

    if (governorate) {
      qb.andWhere('owner.governorate = :gov', { gov: governorate });
    }

    if (startDate && endDate) {
      // Find all equipment IDs that HAVE an overlapping reservation
      const overlapQuery = this.reservationRepo.createQueryBuilder('res')
        .select('res.equipment_id')
        .where('res.status IN (:...statuses)', { statuses: ['APPROVED', 'PENDING'] })
        .andWhere('(res.start_date <= :end AND res.end_date >= :start)', { start: startDate, end: endDate });
      
      qb.andWhere(`e.id NOT IN (${overlapQuery.getQuery()})`, overlapQuery.getParameters());
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Equipment> {
    const eq = await this.repo.findOne({ where: { id }, relations: ['owner'] });
    if (!eq) throw new NotFoundException(`Équipement ${id} introuvable`);
    return eq;
  }

  async update(id: string, dto: Partial<CreateEquipmentDto>, userId: string, isAdmin: boolean): Promise<Equipment> {
    const eq = await this.findOne(id);
    if (!isAdmin && eq.owner_id !== userId) throw new ForbiddenException('Accès refusé');
    Object.assign(eq, dto);
    return this.repo.save(eq);
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const eq = await this.findOne(id);
    if (!isAdmin && eq.owner_id !== userId) throw new ForbiddenException('Accès refusé');
    await this.repo.remove(eq);
  }

  async toggleAvailability(id: string, userId: string): Promise<Equipment> {
    const eq = await this.findOne(id);
    if (eq.owner_id !== userId) throw new ForbiddenException('Accès refusé');
    eq.available = !eq.available;
    return this.repo.save(eq);
  }

  /**
   * Réserve l'équipement avec contrôle anti-chevauchement (No Overlap).
   */
  async bookEquipment(equipmentId: string, lesseeId: string, start: Date, end: Date): Promise<EquipmentReservation> {
    const overlapId = await this.reservationRepo
      .createQueryBuilder('res')
      .where('res.equipment_id = :equipmentId', { equipmentId })
      .andWhere('res.start_date <= :end AND res.end_date >= :start', { start, end })
      .select('res.id')
      .getRawOne();

    if (overlapId) {
      throw new ConflictException("Matériel déjà réservé pour le créneau demandé.");
    }

    const eq = await this.repo.findOne({ where: { id: equipmentId } });
    if (!eq) {
      throw new NotFoundException("Équipement introuvable");
    }

    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const diffDays = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) || 1;
    const totalPrice = diffDays * Number(eq.daily_rate_tnd);

    const reservation = this.reservationRepo.create({
      equipment_id: equipmentId,
      lessee_id: lesseeId,
      start_date: start,
      end_date: end,
      total_price_tnd: totalPrice,
    });

    const saved = await this.reservationRepo.save(reservation);

    await this.notificationService.sendPushToUser(eq.owner_id, {
      title: "Nouvelle Demande de Location",
      message: `🚜 Nouvelle demande de location pour ${eq.type}`,
      payload: { type: 'NEW_RENTAL_REQUEST' }
    });

    return saved;
  }

  findByOwner(ownerId: string): Promise<Equipment[]> {
    return this.repo.find({ where: { owner_id: ownerId } });
  }

  async getPendingReservations(ownerId: string): Promise<EquipmentReservation[]> {
    // Fetch all equipment belonging to this owner first
    const myEquipment = await this.repo.find({ where: { owner_id: ownerId }, select: ['id'] });
    if (!myEquipment.length) return [];
    const equipIds = myEquipment.map(e => e.id);

    return this.reservationRepo
      .createQueryBuilder('res')
      .leftJoinAndSelect('res.equipment', 'equipment')
      .leftJoinAndSelect('res.lessee', 'lessee')
      .where('res.equipment_id IN (:...equipIds)', { equipIds })
      .andWhere('res.status = :status', { status: 'PENDING' })
      .orderBy('res.created_at', 'DESC')
      .getMany();
  }

  async getOwnerReservations(ownerId: string, status?: string): Promise<EquipmentReservation[]> {
    const myEquipment = await this.repo.find({ where: { owner_id: ownerId }, select: ['id'] });
    if (!myEquipment.length) return [];
    const equipIds = myEquipment.map(e => e.id);

    const qb = this.reservationRepo
      .createQueryBuilder('res')
      .leftJoinAndSelect('res.equipment', 'equipment')
      .leftJoinAndSelect('res.lessee', 'lessee')
      .where('res.equipment_id IN (:...equipIds)', { equipIds });
      
    if (status) {
      qb.andWhere('res.status = :status', { status });
    }

    return qb.orderBy('res.created_at', 'DESC').getMany();
  }

  async getLesseeReservations(lesseeId: string, status?: string): Promise<any[]> {
    const qb = this.reservationRepo
      .createQueryBuilder('res')
      .leftJoinAndSelect('res.equipment', 'equipment')
      .where('res.lessee_id = :lesseeId', { lesseeId });

    if (status) {
      qb.andWhere('res.status = :status', { status });
    }

    const reservations = await qb.orderBy('res.created_at', 'DESC').getMany();

    // Map to include fields expected by the frontend
    return reservations.map(res => ({
      ...res,
      equipment_name: res.equipment?.type || 'Matériel',
      proposed_price_tnd: res.total_price_tnd,
    }));
  }

  async getRevenueSummary(ownerId: string, period?: string) {
    let query = `
      SELECT month_ref, SUM(amount_tnd) as total_revenue
      FROM financial_records 
      WHERE user_id = $1 AND category = 'EQUIPMENT_RENTAL'
    `;
    const params: any[] = [ownerId];
    
    if (period === 'month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      query += ` AND recorded_at >= $2`;
      params.push(startOfMonth);
    }
    
    query += ` GROUP BY month_ref ORDER BY month_ref DESC`;
    
    const results = await this.dataSource.query(query, params);
    
    if (period === 'month') {
      const total = results.length > 0 ? Number(results[0].total_revenue) : 0;
      return { total_revenue: total, period: 'month' };
    }
    
    return results;
  }

  async updateReservationStatus(
    reservationId: string,
    status: 'APPROVED' | 'REJECTED',
    requestingUserId: string,
  ): Promise<EquipmentReservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['equipment', 'equipment.owner', 'lessee'],
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable');

    // Ownership check: only the owner of the equipment can approve/reject
    if (reservation.equipment?.owner_id !== requestingUserId) {
      throw new ForbiddenException('Seul le propriétaire peut traiter cette demande');
    }

    // If approving, run anti-overlap check (pessimistic guard)
    if (status === 'APPROVED') {
      const overlap = await this.reservationRepo
        .createQueryBuilder('res')
        .where('res.equipment_id = :equipId', { equipId: reservation.equipment_id })
        .andWhere('res.id != :id', { id: reservationId })
        .andWhere('res.start_date <= :end AND res.end_date >= :start', {
          start: reservation.start_date,
          end: reservation.end_date,
        })
        .getOne();
      if (overlap) throw new ConflictException('Matériel déjà réservé sur ce créneau.');
    }

    (reservation as any).status = status;
    const saved = await this.reservationRepo.save(reservation);

    if (status === 'APPROVED') {
      const commissionRate = 0.06;
      const commission = Number(saved.total_price_tnd) * commissionRate;
      await this.contractService.createContract({
        contract_type: ContractType.EQUIPMENT_RENTAL,
        reference_id: saved.id,
        initiator_id: saved.lessee_id,
        counterparty_id: saved.equipment.owner_id,
        total_amount_tnd: Number(saved.total_price_tnd),
        commission_amount_tnd: commission,
        terms_snapshot: {
          initiator_name: saved.lessee?.name ?? 'Locataire',
          counterparty_name: saved.equipment.owner?.name ?? 'Propriétaire',
          equipment_type: saved.equipment.type,
          daily_rate_tnd: saved.equipment.daily_rate_tnd,
          start_date: saved.start_date,
          end_date: saved.end_date,
        },
      }).catch(e => console.error(`Contract creation failed for equipment reservation ${saved.id}:`, e));

      await this.notificationService.sendPushToUser(reservation.lessee_id, {
        title: "Demande Confirmée",
        message: "✅ Votre demande de location a été confirmée",
        payload: { type: 'RENTAL_APPROVED' }
      });
    } else if (status === 'REJECTED') {
      await this.notificationService.sendPushToUser(reservation.lessee_id, {
        title: "Demande Refusée",
        message: "❌ Votre demande de location a été refusée",
        payload: { type: 'RENTAL_REJECTED' }
      });
    }

    return saved;
  }
}
