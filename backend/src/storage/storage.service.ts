import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StorageFacility } from './entities/storage-facility.entity';
import { StorageRoom, StoragePricingMode, StoragePricingUnit } from './entities/storage-room.entity';
import { StorageReservation, StorageReservationStatus, StoragePaymentStatus } from './entities/storage-reservation.entity';
import { CreateStorageFacilityDto } from './dto/create-storage-facility.dto';
import { CreateStorageRoomDto } from './dto/create-storage-room.dto';
import { CreateStorageReservationDto } from './dto/create-storage-reservation.dto';
import { QueryStorageFacilityDto } from './dto/query-storage-facility.dto';
import { QueryStorageReservationDto } from './dto/query-storage-reservation.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { NotificationService } from '../notifications/notification.service';
import { WalletService } from '../finance/wallet.service';
import { PaginatedResult } from '../common/dto/paginated.dto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly STEG_KWH_TARIFF_TND = 0.350; // Standard STEG agricultural/cold storage kWh tariff in TND

  constructor(
    @InjectRepository(StorageFacility) private readonly facilityRepo: Repository<StorageFacility>,
    @InjectRepository(StorageRoom) private readonly roomRepo: Repository<StorageRoom>,
    @InjectRepository(StorageReservation) private readonly reservationRepo: Repository<StorageReservation>,
    private readonly notificationService: NotificationService,
    private readonly walletService: WalletService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Facilities CRUD ────────────────────────────────────────────────────────

  async createFacility(dto: CreateStorageFacilityDto, ownerId: string): Promise<StorageFacility> {
    const facility = this.facilityRepo.create({
      ...dto,
      owner_id: ownerId,
      photos: dto.photos || [],
      is_active: true,
    });
    return this.facilityRepo.save(facility);
  }

  async updateFacility(id: string, dto: Partial<CreateStorageFacilityDto>, ownerId: string): Promise<StorageFacility> {
    const facility = await this.facilityRepo.findOne({ where: { id } });
    if (!facility) throw new NotFoundException('Site non trouvé.');
    if (facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    Object.assign(facility, dto);
    return this.facilityRepo.save(facility);
  }

  async getMyFacilities(ownerId: string): Promise<StorageFacility[]> {
    return this.facilityRepo.find({
      where: { owner_id: ownerId },
      order: { created_at: 'DESC' },
    });
  }

  async searchFacilities(query: QueryStorageFacilityDto): Promise<PaginatedResult<any>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.facilityRepo.createQueryBuilder('f')
      .leftJoinAndSelect('f.owner', 'owner')
      .where('f.is_active = :isActive', { isActive: true });

    if (query.governorate) {
      qb.andWhere('f.governorate ILIKE :gov', { gov: `%${query.governorate}%` });
    }

    const [facilities, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const results = await Promise.all(
      facilities.map(async (fac) => {
        const rooms = await this.roomRepo.find({
          where: { facility_id: fac.id, is_active: true },
          order: { grid_order: 'ASC', created_at: 'ASC' },
        });

        const roomsWithCap = await Promise.all(
          rooms.map(async (room) => {
            const availCap = await this.getAvailableCapacity(room.id, query.start_date, query.end_date);
            return { ...room, available_capacity: availCap };
          })
        );

        const filteredRooms = query.min_capacity
          ? roomsWithCap.filter(r => r.available_capacity >= query.min_capacity!)
          : roomsWithCap;

        return { ...fac, rooms: filteredRooms };
      })
    );

    const data = results.filter(f => f.rooms.length > 0 || !query.min_capacity);

    return {
      items: data,
      total,
      page,
      limit,
      hasNext: page * limit < total,
    };
  }

  // ── Storage Rooms CRUD & Layout Design ────────────────────────────────────

  async createRoom(dto: CreateStorageRoomDto, ownerId: string): Promise<StorageRoom> {
    const facility = await this.facilityRepo.findOne({ where: { id: dto.facility_id } });
    if (!facility) throw new NotFoundException('Site introuvable.');
    if (facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    const totalCapacity = dto.total_capacity || dto.capacity_m3 || 100;
    const pricingUnit = dto.pricing_unit || StoragePricingUnit.M3;
    const unitPrice = dto.unit_price || dto.price_per_m3_day || dto.flat_price || 1.5;

    const room = this.roomRepo.create({
      facility_id: dto.facility_id,
      name: dto.name,
      room_type: dto.room_type,
      capacity_m3: dto.capacity_m3 || totalCapacity,
      capacity_tonnes: dto.capacity_tonnes || null,
      total_capacity: totalCapacity,
      pricing_unit: pricingUnit,
      pricing_mode: dto.pricing_mode || StoragePricingMode.PAR_M3_JOUR,
      price_per_m3_day: dto.price_per_m3_day || unitPrice,
      flat_price: dto.flat_price || null,
      unit_price: unitPrice,
      electricity_billing_mode: dto.electricity_billing_mode || undefined,
      electricity_rate: dto.electricity_rate || 0,
      compressor_power_kw: dto.compressor_power_kw || 15,
      color_hex: dto.color_hex || '#0ea5e9',
      equipment_badges: dto.equipment_badges || [],
      grid_order: dto.grid_order || 0,
      is_active: true,
    });

    const savedRoom = await this.roomRepo.save(room);

    // Initial occupancy onboarding declaration
    if (dto.initial_occupant_label && dto.initial_occupied_capacity) {
      const clientName = dto.initial_occupant_label;
      const clientPhone = dto.client_phone || '+21698000000';
      const totalPrice = Number(unitPrice) * Number(dto.initial_occupied_capacity) * 30;

      await this.reservationRepo.save(
        this.reservationRepo.create({
          room_id: savedRoom.id,
          renter_id: null,
          initial_occupant_label: clientName,
          client_name: clientName,
          client_phone: clientPhone,
          occupied_capacity: dto.initial_occupied_capacity,
          occupied_unit: pricingUnit,
          start_date: new Date(),
          status: StorageReservationStatus.EN_COURS,
          payment_status: StoragePaymentStatus.A_JOUR,
          total_price: totalPrice,
          amount_due_tnd: totalPrice,
          amount_paid_tnd: 0,
        })
      );
    }

    return savedRoom;
  }

  async updateRoomDesign(roomId: string, dto: { color_hex?: string; equipment_badges?: string[]; grid_order?: number; compressor_power_kw?: number }, ownerId: string): Promise<StorageRoom> {
    const room = await this.roomRepo.findOne({ where: { id: roomId }, relations: ['facility'] });
    if (!room) throw new NotFoundException('Salle introuvable.');
    if (room.facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    if (dto.color_hex !== undefined) room.color_hex = dto.color_hex;
    if (dto.equipment_badges !== undefined) room.equipment_badges = dto.equipment_badges;
    if (dto.grid_order !== undefined) room.grid_order = dto.grid_order;
    if (dto.compressor_power_kw !== undefined) room.compressor_power_kw = dto.compressor_power_kw;

    return this.roomRepo.save(room);
  }

  async getRoomsByFacility(facilityId: string): Promise<any[]> {
    const rooms = await this.roomRepo.find({
      where: { facility_id: facilityId },
      order: { grid_order: 'ASC', created_at: 'ASC' },
    });

    return Promise.all(
      rooms.map(async (room) => {
        const availableCap = await this.getAvailableCapacity(room.id);
        const totalCap = Number(room.total_capacity || room.capacity_m3 || 100);
        const occupiedCap = Math.max(0, totalCap - availableCap);

        // Fill Rate = SUM(occupied) / total_capacity
        let occupancyRate = 0;
        if (room.pricing_unit === StoragePricingUnit.FORFAIT) {
          occupancyRate = occupiedCap > 0 ? 100 : 0;
        } else {
          occupancyRate = totalCap > 0 ? Math.min(100, Math.round((occupiedCap / totalCap) * 100)) : 0;
        }

        const reservations = await this.reservationRepo.find({
          where: { room_id: room.id },
          relations: ['renter'],
          order: { created_at: 'DESC' },
        });

        const activeReservations = reservations.filter(
          r => r.status === StorageReservationStatus.CONFIRMEE || r.status === StorageReservationStatus.EN_COURS
        );

        const activeRentersCount = new Set(
          activeReservations.map(r => r.renter_id || r.client_phone || r.initial_occupant_label)
        ).size;

        // STEG electricity calculation (18h/day running time estimated for compressor)
        const powerKw = Number(room.compressor_power_kw || 15);
        const roomType = room.room_type || '';
        const isNegativeRoom = roomType.toLowerCase().includes('négative') || roomType.includes('-18');
        const loadFactor = isNegativeRoom ? 0.9 : 0.7; // Negative rooms run compressor longer
        const monthlyKwh = Math.round(powerKw * 18 * 30 * loadFactor);
        const monthlyElectricityCostTnd = Math.round(monthlyKwh * this.STEG_KWH_TARIFF_TND);

        // Gross income per room
        const roomGrossIncome = activeReservations.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0);
        const roomNetProfit = roomGrossIncome - monthlyElectricityCostTnd;

        // Calculate client pro-rata electricity share
        const reservationsWithProRataElec = activeReservations.map((res) => {
          const clientRatio = occupiedCap > 0 ? Number(res.occupied_capacity) / occupiedCap : 0;
          const clientElecShareTnd = Math.round(monthlyElectricityCostTnd * clientRatio);
          return {
            ...res,
            client_pro_rata_elec_tnd: clientElecShareTnd,
          };
        });

        return {
          ...room,
          available_capacity: availableCap,
          occupied_capacity: occupiedCap,
          occupancy_rate: occupancyRate,
          active_renters_count: activeRentersCount,
          monthly_kwh: monthlyKwh,
          monthly_elec_cost_tnd: monthlyElectricityCostTnd,
          gross_income_tnd: roomGrossIncome,
          net_profit_tnd: roomNetProfit,
          reservations: reservationsWithProRataElec,
        };
      })
    );
  }

  async toggleRoomAvailability(roomId: string, ownerId: string): Promise<StorageRoom> {
    const room = await this.roomRepo.findOne({ where: { id: roomId }, relations: ['facility'] });
    if (!room) throw new NotFoundException('Salle introuvable.');
    if (room.facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    room.is_active = !room.is_active;
    return this.roomRepo.save(room);
  }

  // ── Flexible Unit Capacity Calculation (SUM / total_capacity) ──────────────

  async getAvailableCapacity(roomId: string, startDateStr?: string, endDateStr?: string): Promise<number> {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) return 0;

    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr ? new Date(endDateStr) : null;

    const query = `
      SELECT COALESCE(SUM(r.occupied_capacity), 0) AS total_occupied
      FROM storage_reservations r
      WHERE r.room_id = $1
        AND r.status IN ('CONFIRMEE', 'EN_COURS')
        AND (
          r.end_date IS NULL 
          OR ($2::timestamp <= r.end_date AND ($3::timestamp IS NULL OR $3::timestamp >= r.start_date))
        )
    `;

    const result = await this.dataSource.query(query, [roomId, startDate, endDate]);
    const totalOccupied = parseFloat(result[0]?.total_occupied || 0);

    const roomTotalCap = Number(room.total_capacity || room.capacity_m3 || 100);
    return Math.max(0, roomTotalCap - totalOccupied);
  }

  // ── Unified Client Debt Ledger (Grouped by Normalized Phone) ─────────────

  async getClientLedger(ownerId: string): Promise<any[]> {
    const query = `
      SELECT 
        COALESCE(r.client_phone, u.phone, 'SANS_TEL') AS normalized_phone,
        MAX(COALESCE(r.client_name, u.name, r.initial_occupant_label, 'Client Inconnu')) AS client_name,
        COUNT(r.id) AS total_reservations,
        SUM(r.occupied_capacity) AS total_occupied_units,
        SUM(r.total_price) AS total_billed_tnd,
        SUM(r.amount_paid_tnd) AS total_paid_tnd,
        SUM(r.amount_due_tnd) AS total_unpaid_tnd,
        MAX(r.unpaid_months_count) AS max_unpaid_months,
        ARRAY_AGG(DISTINCT r.payment_status) AS payment_statuses,
        JSON_AGG(JSON_BUILD_OBJECT(
          'reservation_id', r.id,
          'room_name', rm.name,
          'total_price', r.total_price,
          'amount_paid_tnd', r.amount_paid_tnd,
          'amount_due_tnd', r.amount_due_tnd,
          'status', r.status,
          'payment_status', r.payment_status,
          'unpaid_months_count', r.unpaid_months_count,
          'next_payment_due_date', r.next_payment_due_date
        )) AS reservations_list
      FROM storage_reservations r
      INNER JOIN storage_rooms rm ON rm.id = r.room_id
      INNER JOIN storage_facilities f ON f.id = rm.facility_id
      LEFT JOIN users u ON u.id = r.renter_id
      WHERE f.owner_id = $1
        AND r.status IN ('CONFIRMEE', 'EN_COURS')
      GROUP BY COALESCE(r.client_phone, u.phone, 'SANS_TEL')
      ORDER BY total_unpaid_tnd DESC, max_unpaid_months DESC
    `;

    const rawRows = await this.dataSource.query(query, [ownerId]);
    const now = new Date().getTime();

    return rawRows.map(row => {
      const reservations = (row.reservations_list || []).map((res: any) => {
        const dueDate = res.next_payment_due_date ? new Date(res.next_payment_due_date).getTime() : now;
        const daysOverdue = res.amount_due_tnd > 0 && dueDate < now ? Math.floor((now - dueDate) / (1000 * 3600 * 24)) : 0;
        return { ...res, days_overdue: daysOverdue };
      });

      const maxDaysOverdue = Math.max(0, ...reservations.map((r: any) => r.days_overdue));

      return {
        phone: row.normalized_phone,
        client_name: row.client_name,
        total_reservations: Number(row.total_reservations),
        total_occupied_units: parseFloat(row.total_occupied_units || 0),
        total_billed_tnd: parseFloat(row.total_billed_tnd || 0),
        total_paid_tnd: parseFloat(row.total_paid_tnd || 0),
        total_unpaid_tnd: parseFloat(row.total_unpaid_tnd || 0),
        max_unpaid_months: Number(row.max_unpaid_months || 0),
        max_days_overdue: maxDaysOverdue,
        has_overdue: maxDaysOverdue > 0 || Number(row.max_unpaid_months || 0) >= 1 || (row.payment_statuses || []).includes('EN_RETARD'),
        reservations: reservations.sort((a: any, b: any) => b.days_overdue - a.days_overdue),
      };
    }).sort((a, b) => b.max_days_overdue - a.max_days_overdue || b.total_unpaid_tnd - a.total_unpaid_tnd);
  }

  async updateRoom(roomId: string, dto: Partial<CreateStorageRoomDto>, ownerId: string): Promise<StorageRoom> {
    const room = await this.roomRepo.findOne({ where: { id: roomId }, relations: ['facility'] });
    if (!room) throw new NotFoundException('Salle introuvable.');
    if (room.facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    if (dto.name) room.name = dto.name;
    if (dto.room_type) room.room_type = dto.room_type;
    if (dto.total_capacity) {
      room.total_capacity = dto.total_capacity;
      room.capacity_m3 = dto.total_capacity;
    }
    if (dto.pricing_unit) room.pricing_unit = dto.pricing_unit;
    if (dto.unit_price) {
      room.unit_price = dto.unit_price;
      room.price_per_m3_day = dto.unit_price;
    }
    if (dto.compressor_power_kw) room.compressor_power_kw = dto.compressor_power_kw;
    if (dto.color_hex) room.color_hex = dto.color_hex;
    if (dto.equipment_badges) room.equipment_badges = dto.equipment_badges;

    return this.roomRepo.save(room);
  }

  async softDeleteRoom(roomId: string, ownerId: string): Promise<{ success: boolean; message: string }> {
    const room = await this.roomRepo.findOne({ where: { id: roomId }, relations: ['facility'] });
    if (!room) throw new NotFoundException('Salle introuvable.');
    if (room.facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    room.is_active = false;
    await this.roomRepo.save(room);
    return { success: true, message: 'Salle désactivée avec succès (historique conservé).' };
  }

  async updateReservation(reservationId: string, dto: { occupied_capacity?: number; start_date?: string; end_date?: string; client_name?: string; client_phone?: string }, ownerId: string): Promise<StorageReservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['room', 'room.facility'],
    });

    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    if (reservation.room.facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    if (dto.occupied_capacity !== undefined) reservation.occupied_capacity = dto.occupied_capacity;
    if (dto.start_date) reservation.start_date = new Date(dto.start_date);
    if (dto.end_date) reservation.end_date = new Date(dto.end_date);
    if (dto.client_name) reservation.client_name = dto.client_name;
    if (dto.client_phone) reservation.client_phone = dto.client_phone;

    // Recalculate total price if capacity/dates changed
    const unitPrice = Number(reservation.room.unit_price || 1.5);
    const days = reservation.end_date
      ? Math.max(1, Math.ceil((new Date(reservation.end_date).getTime() - new Date(reservation.start_date).getTime()) / (1000 * 3600 * 24)))
      : 30;

    reservation.total_price = unitPrice * Number(reservation.occupied_capacity) * days;
    reservation.amount_due_tnd = Math.max(0, reservation.total_price - Number(reservation.amount_paid_tnd || 0));

    return this.reservationRepo.save(reservation);
  }

  async recordPayment(reservationId: string, dto: RecordPaymentDto, ownerId: string): Promise<StorageReservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['room', 'room.facility'],
    });

    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    if (reservation.room.facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    const newAmountPaid = Number(reservation.amount_paid_tnd || 0) + dto.amount;
    const newAmountDue = Math.max(0, Number(reservation.total_price || 0) - newAmountPaid);

    reservation.amount_paid_tnd = newAmountPaid;
    reservation.amount_due_tnd = newAmountDue;

    if (newAmountDue <= 0) {
      reservation.payment_status = StoragePaymentStatus.A_JOUR;
      reservation.unpaid_months_count = 0;
      // Advance next due date by 30 days upon full settlement
      if (reservation.next_payment_due_date) {
        const nextDate = new Date(reservation.next_payment_due_date);
        nextDate.setDate(nextDate.getDate() + 30);
        reservation.next_payment_due_date = nextDate;
      }
    } else if (newAmountPaid > 0) {
      reservation.payment_status = StoragePaymentStatus.PAYE_PARTIEL;
    }

    return this.reservationRepo.save(reservation);
  }

  // ── Reservations Lifecycle ────────────────────────────────────────────────

  async createReservation(dto: CreateStorageReservationDto, renterId: string): Promise<StorageReservation> {
    const room = await this.roomRepo.findOne({ where: { id: dto.room_id }, relations: ['facility'] });
    if (!room || !room.is_active) throw new NotFoundException('Salle non disponible.');

    const availableCap = await this.getAvailableCapacity(room.id, dto.start_date, dto.end_date);
    if (availableCap < dto.occupied_capacity) {
      throw new BadRequestException(`Capacité insuffisante. Disponible: ${availableCap} ${room.pricing_unit}, Demandée: ${dto.occupied_capacity} ${room.pricing_unit}.`);
    }

    const reservation = this.reservationRepo.create({
      room_id: dto.room_id,
      renter_id: renterId,
      occupied_capacity: dto.occupied_capacity,
      occupied_unit: dto.occupied_unit || room.pricing_unit,
      client_name: dto.client_name || dto.initial_occupant_label || 'Agriculteur ZirIA',
      client_phone: dto.client_phone || null,
      start_date: new Date(dto.start_date),
      end_date: dto.end_date ? new Date(dto.end_date) : null,
      status: StorageReservationStatus.EN_ATTENTE,
      payment_status: StoragePaymentStatus.A_JOUR,
      total_price: 0,
      amount_due_tnd: 0,
      amount_paid_tnd: 0,
    });

    const saved = await this.reservationRepo.save(reservation);

    await this.notificationService.sendToUsers(
      [room.facility.owner_id],
      'Nouvelle demande de Chambre Froide ❄️',
      `Demande pour ${dto.occupied_capacity} ${room.pricing_unit} dans la salle ${room.name}`,
      { type: 'STORAGE_RESERVATION_REQUEST', reservation_id: saved.id }
    );

    return saved;
  }

  async acceptReservation(reservationId: string, ownerId: string): Promise<StorageReservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['room', 'room.facility'],
    });

    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    if (reservation.room.facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    const room = reservation.room;
    let totalPrice = 0;
    const unitPrice = Number(room.unit_price || room.price_per_m3_day || 1.5);

    if (room.pricing_mode === StoragePricingMode.PAR_M3_JOUR) {
      const days = reservation.end_date
        ? Math.max(1, Math.ceil((new Date(reservation.end_date).getTime() - new Date(reservation.start_date).getTime()) / (1000 * 3600 * 24)))
        : 30;
      totalPrice = unitPrice * Number(reservation.occupied_capacity) * days;
    } else {
      totalPrice = Number(room.flat_price || unitPrice);
    }

    const nextPaymentDue = new Date();
    nextPaymentDue.setDate(nextPaymentDue.getDate() + 30);

    reservation.status = StorageReservationStatus.CONFIRMEE;
    reservation.total_price = totalPrice;
    reservation.amount_due_tnd = totalPrice;
    reservation.next_payment_due_date = nextPaymentDue;

    const updated = await this.reservationRepo.save(reservation);

    if (reservation.renter_id) {
      await this.notificationService.sendToUsers(
        [reservation.renter_id],
        'Réservation Chambre Froide Confirmée ✅',
        `Votre réservation (${reservation.occupied_capacity} ${room.pricing_unit}) dans la salle ${room.name} a été acceptée. Total: ${totalPrice} TND`,
        { type: 'STORAGE_RESERVATION_ACCEPTED', reservation_id: updated.id }
      );
    }

    return updated;
  }

  async rejectReservation(reservationId: string, ownerId: string): Promise<StorageReservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id: reservationId },
      relations: ['room', 'room.facility'],
    });

    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    if (reservation.room.facility.owner_id !== ownerId) throw new ForbiddenException('Non autorisé.');

    reservation.status = StorageReservationStatus.ANNULEE;
    const updated = await this.reservationRepo.save(reservation);

    if (reservation.renter_id) {
      await this.notificationService.sendToUsers(
        [reservation.renter_id],
        'Réservation Chambre Froide Refusée ❌',
        `Votre demande dans la salle ${reservation.room.name} a été refusée.`,
        { type: 'STORAGE_RESERVATION_REJECTED', reservation_id: updated.id }
      );
    }

    return updated;
  }

  async getOwnerReservations(ownerId: string, query: QueryStorageReservationDto): Promise<PaginatedResult<StorageReservation>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.reservationRepo.createQueryBuilder('r')
      .innerJoinAndSelect('r.room', 'room')
      .innerJoinAndSelect('room.facility', 'facility')
      .leftJoinAndSelect('r.renter', 'renter')
      .where('facility.owner_id = :ownerId', { ownerId });

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }

    const [data, total] = await qb.orderBy('r.created_at', 'DESC').skip(skip).take(limit).getManyAndCount();

    return { items: data, total, page, limit, hasNext: page * limit < total };
  }

  async getLesseeReservations(renterId: string, query: QueryStorageReservationDto): Promise<PaginatedResult<StorageReservation>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.reservationRepo.createQueryBuilder('r')
      .innerJoinAndSelect('r.room', 'room')
      .innerJoinAndSelect('room.facility', 'facility')
      .where('r.renter_id = :renterId', { renterId });

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }

    const [data, total] = await qb.orderBy('r.created_at', 'DESC').skip(skip).take(limit).getManyAndCount();

    return { items: data, total, page, limit, hasNext: page * limit < total };
  }

  // ── Smart Advice & Overall Revenue Summary ─────────────────────────────────

  async getRevenueSummary(ownerId: string): Promise<any> {
    const facilities = await this.getMyFacilities(ownerId);
    let totalGrossRevenue = 0;
    let totalElectricityCost = 0;
    let totalActiveReservations = 0;

    for (const fac of facilities) {
      const rooms = await this.getRoomsByFacility(fac.id);
      for (const room of rooms) {
        totalGrossRevenue += Number(room.gross_income_tnd || 0);
        totalElectricityCost += Number(room.monthly_elec_cost_tnd || 0);
        totalActiveReservations += room.active_renters_count || 0;
      }
    }

    const totalNetProfit = totalGrossRevenue - totalElectricityCost;

    // Fetch clients with debt > 0
    const ledger = await this.getClientLedger(ownerId);
    const overdueClients = ledger.filter(c => c.has_overdue || c.total_unpaid_tnd > 0);

    // Smart Advisory Generator
    const adviceAlerts: { type: 'DANGER' | 'WARNING' | 'TIP'; message: string }[] = [];

    if (overdueClients.length > 0) {
      const highestDebt = overdueClients[0];
      adviceAlerts.push({
        type: 'DANGER',
        message: `Alerte Impayé: Client ${highestDebt.client_name} (${highestDebt.phone}) a ${highestDebt.max_unpaid_months} mois de retard (${highestDebt.total_unpaid_tnd} TND non réglés).`,
      });
    }

    if (totalElectricityCost > totalGrossRevenue * 0.4 && totalGrossRevenue > 0) {
      adviceAlerts.push({
        type: 'WARNING',
        message: `Coût Énergie Élevé: La facture d'électricité STEG (${totalElectricityCost} TND) absorbe plus de 40% du chiffre d'affaires. Pensez à ajuster la consigne des compresseurs aux heures de pointe.`,
      });
    }

    adviceAlerts.push({
      type: 'TIP',
      message: `Conseil Récolte Kasserine: Période de pré-refroidissement recommandée avant l'arrivée des pommes et dattes pour optimiser la charge énergétique.`,
    });

    return {
      monthly_revenue: totalGrossRevenue,
      monthly_electricity_cost: totalElectricityCost,
      net_profit_tnd: totalNetProfit,
      active_reservations_count: totalActiveReservations,
      overdue_clients_count: overdueClients.length,
      upcoming_payments: overdueClients.map(c => ({
        client_name: c.client_name,
        phone: c.phone,
        amount: c.total_unpaid_tnd,
        unpaid_months: c.max_unpaid_months,
      })),
      smart_advice: adviceAlerts,
    };
  }
}
