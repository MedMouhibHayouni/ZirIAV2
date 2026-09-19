import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DriverProfile } from './entities/driver-profile.entity';
import { TransportRequest, TransportStatus } from './entities/transport-request.entity';
import { NotificationService } from '../notifications/notification.service';
import { NotificationGateway } from '../notifications/notification.gateway';
import { User } from '../users/entities/user.entity';
import { WalletService } from '../finance/wallet.service';
import { MissionContractService } from '../contracts/mission-contract.service';
import { ContractType } from '../contracts/entities/contract-type.enum';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);
  /** Configurable search radius. Defaults to 50km per sprint spec. */
  private readonly nearbyRadiusKm = parseInt(process.env.TRANSPORT_NEARBY_RADIUS_KM ?? '50', 10);

  constructor(
    @InjectRepository(DriverProfile)
    private readonly driverRepo: Repository<DriverProfile>,
    @InjectRepository(TransportRequest)
    private readonly transportRepo: Repository<TransportRequest>,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly contractService: MissionContractService,
  ) {}

  // ─── DRIVER PROFILES ─────────────────────────────────────────────────────────

  async upsertProfile(userId: string, dto: Partial<DriverProfile & { user?: { name?: string; phone?: string } }>): Promise<DriverProfile> {
    if (dto.user) {
      const userUpdates: Partial<User> = {};
      if (dto.user.name !== undefined) userUpdates.name = dto.user.name;
      if (dto.user.phone !== undefined) userUpdates.phone = dto.user.phone;
      if (Object.keys(userUpdates).length > 0) {
        await this.dataSource.getRepository(User).update(userId, userUpdates);
      }
    }

    const { user, ...profileData } = dto;

    let profile = await this.driverRepo.findOne({ where: { user_id: userId } });
    if (profile) {
      Object.assign(profile, profileData, { user_id: userId });
      await this.driverRepo.save(profile);
    } else {
      const created = this.driverRepo.create({ ...profileData, user_id: userId });
      await this.driverRepo.save(created);
    }

    const updated = await this.findMyProfile(userId);
    if (!updated) {
      throw new NotFoundException('Failed to retrieve updated profile');
    }
    return updated;
  }

  async findMyProfile(userId: string): Promise<DriverProfile | null> {
    return this.driverRepo.findOne({
      where: { user_id: userId },
      relations: ['user']
    });
  }

  async findAvailableDrivers(governorate?: string): Promise<DriverProfile[]> {
    const qb = this.driverRepo.createQueryBuilder('dp')
      .leftJoinAndSelect('dp.user', 'u')
      .where('dp.is_available = true');
    if (governorate) qb.andWhere('dp.governorate = :governorate', { governorate });
    return qb.orderBy('dp.rating', 'DESC').getMany();
  }

  /** PostGIS spatial query for nearby drivers */
  async findDriversNearLocation(lat: number, lng: number, radiusKm = 25): Promise<DriverProfile[]> {
    return this.dataSource.query(`
      SELECT dp.*, u.name, u.phone, u.fcm_token
      FROM driver_profiles dp
      LEFT JOIN users u ON u.id = dp.user_id
      WHERE dp.is_available = true
        AND dp.location IS NOT NULL
        AND ST_DWithin(
          dp.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3 * 1000
        )
      ORDER BY rating DESC
    `, [lat, lng, radiusKm]);
  }

  // ─── TRANSPORT REQUESTS ───────────────────────────────────────────────────────

  async createTransportRequest(requesterId: string, dto: Partial<TransportRequest>): Promise<TransportRequest> {
    const request = this.transportRepo.create({ ...dto, requester_id: requesterId });
    const saved = await this.transportRepo.save(request);

    // Notify nearby drivers
    if (saved.origin_lat && saved.origin_lng) {
      this.notifyNearbyDrivers(saved).catch(e => this.logger.warn(`Driver notify failed: ${e.message}`));
    }
    return saved;
  }

  private async notifyNearbyDrivers(request: TransportRequest): Promise<void> {
    if (request.origin_lat == null || request.origin_lng == null) return;
    const drivers = await this.findDriversNearLocation(
      request.origin_lat,
      request.origin_lng,
      this.nearbyRadiusKm,
    );
    this.logger.log(`[Spatial] Notifying ${drivers.length} drivers near transport request ${request.id}`);
    for (const d of drivers) {
      // Sprint 1: Real-time WS event — appears in driver's Missions Disponibles instantly
      this.notificationGateway.sendToUser(d.user_id, 'transport_request_new', {
        request_id: request.id,
        cargo_type: request.cargo_type,
        weight_tonnes: request.weight_tonnes,
        origin_lat: request.origin_lat,
        origin_lng: request.origin_lng,
        origin_address: request.origin_address,
        destination_lat: request.destination_lat,
        destination_lng: request.destination_lng,
        destination_address: request.destination_address,
        proposed_price_tnd: request.proposed_price_tnd,
        pickup_date: request.pickup_date,
        notes: request.notes,
        created_at: request.created_at,
      });

      // FCM push fallback for drivers not currently in the app
      if ((d as any).fcm_token) {
        await this.notificationService.sendPushToUser(d.user_id, {
          title: `Nouvelle demande de transport — ${request.cargo_type}`,
          message: `${request.weight_tonnes}t · Prix proposé: ${request.proposed_price_tnd} TND`,
          payload: { type: 'TRANSPORT_REQUEST', transport_request_id: request.id },
        }).catch(() => {});
      }
    }
  }

  async findTransportRequests(status?: TransportStatus): Promise<TransportRequest[]> {
    const qb = this.transportRepo.createQueryBuilder('tr')
      .leftJoinAndSelect('tr.requester', 'u')
      .leftJoinAndSelect('tr.driver', 'dp');
    if (status) qb.where('tr.status = :status', { status });
    return qb.orderBy('tr.created_at', 'DESC').getMany();
  }

  async findMyTransportRequests(userId: string): Promise<TransportRequest[]> {
    return this.transportRepo.find({
      where: { requester_id: userId },
      relations: ['driver', 'driver.user'],
      order: { created_at: 'DESC' },
    });
  }

  async assignDriverToRequest(requestId: string, farmerUserId: string, driverUserId: string, acceptedPrice: number): Promise<TransportRequest> {
    const request = await this.transportRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.requester_id !== farmerUserId) {
      throw new ForbiddenException("Vous n'êtes pas l'auteur de cette demande");
    }

    const profile = await this.driverRepo.findOne({ where: { user_id: driverUserId } });
    if (!profile) throw new NotFoundException('Profil chauffeur introuvable');

    request.driver_profile_id = profile.id;
    request.accepted_price_tnd = acceptedPrice;
    request.status = TransportStatus.ACCEPTED;

    const saved = await this.transportRepo.save(request);

    // Sprint 4: Create TRANSPORT mission contract before WS notification
    const commissionRate = 0.10; // 10% platform commission
    const commission = acceptedPrice * commissionRate;
    await this.contractService.createContract({
      contract_type: ContractType.TRANSPORT_MISSION,
      reference_id: saved.id,
      initiator_id: farmerUserId,
      counterparty_id: driverUserId,
      total_amount_tnd: acceptedPrice,
      commission_amount_tnd: commission,
      terms_snapshot: {
        initiator_name: 'Agriculteur',
        counterparty_name: 'Chauffeur',
        cargo_type: saved.cargo_type,
        weight_tonnes: saved.weight_tonnes,
        origin_address: saved.origin_address,
        destination_address: saved.destination_address,
        pickup_date: saved.pickup_date,
        notes: saved.notes,
      },
    });

    // Sprint 1: Real-time WS event to driver — transport confirmed with full details
    this.notificationGateway.sendToUser(driverUserId, 'transport_request_accepted', {
      request_id: saved.id,
      cargo_type: saved.cargo_type,
      weight_tonnes: saved.weight_tonnes,
      origin_address: saved.origin_address,
      destination_address: saved.destination_address,
      accepted_price_tnd: saved.accepted_price_tnd,
      pickup_date: saved.pickup_date,
      requester_id: saved.requester_id,
    });

    // FCM push fallback
    await this.notificationService.sendToUsers(
      [driverUserId],
      '🚛 Mission assignée !',
      `Vous avez été assigné à la mission de transport pour ${request.cargo_type} au prix convenu de ${acceptedPrice} TND.`,
      { type: 'MISSION_ASSIGNED', transport_request_id: saved.id }
    ).catch(() => {});

    return saved;
  }

  async findDriverTransportRequests(userId: string): Promise<TransportRequest[]> {
    const profile = await this.driverRepo.findOne({ where: { user_id: userId } });
    if (!profile) return [];
    return this.transportRepo.find({
      where: { driver_profile_id: profile.id },
      relations: ['requester', 'listing'],
      order: { created_at: 'DESC' },
    });
  }

  async acceptTransportRequest(requestId: string, driverUserId: string, acceptedPrice?: number): Promise<TransportRequest> {
    const profile = await this.driverRepo.findOne({ where: { user_id: driverUserId } });
    if (!profile) throw new ForbiddenException('Profil chauffeur requis');

    const request = await this.transportRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.status !== TransportStatus.PENDING) throw new ForbiddenException('Cette demande est déjà traitée');

    request.driver_profile_id = profile.id;
    request.status = TransportStatus.ACCEPTED;
    
    // Calcul de la distance géospatiale PostGIS
    if (request.origin_location && request.destination_location) {
      const [result] = await this.dataSource.query(`
        SELECT ST_Distance(origin_location, destination_location) as distance_meters
        FROM transport_requests
        WHERE id = $1
      `, [requestId]);
      const distanceKm = (result?.distance_meters || 0) / 1000;
      const ratePerKm = 1.5; // TND/km
      request.accepted_price_tnd = parseFloat((distanceKm * ratePerKm).toFixed(2));
      this.logger.log(`[Pricing] Course ${requestId}: ${distanceKm.toFixed(1)} km -> ${request.accepted_price_tnd} TND`);
    } else {
      request.accepted_price_tnd = acceptedPrice || request.proposed_price_tnd || 300;
    }

    return this.transportRepo.save(request);
  }

  async findAvailableRequestsNearLocation(lat: number, lng: number, radiusKm = 50): Promise<TransportRequest[]> {
    return this.dataSource.query(`
      SELECT tr.*, u.name as requester_name, u.phone as requester_phone
      FROM transport_requests tr
      LEFT JOIN users u ON u.id = tr.requester_id
      WHERE tr.status = 'PENDING'
        AND tr.origin_location IS NOT NULL
        AND ST_DWithin(
          tr.origin_location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3 * 1000
        )
      ORDER BY tr.created_at DESC
    `, [lat, lng, radiusKm]);
  }

  async updateTransportStatus(requestId: string, driverUserId: string, status: TransportStatus): Promise<TransportRequest> {
    const profile = await this.driverRepo.findOne({ where: { user_id: driverUserId } });
    const request = await this.transportRepo.findOne({ where: { id: requestId }, relations: ['requester'] });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.driver_profile_id !== profile?.id) throw new ForbiddenException('Accès refusé');
    request.status = status;
    const saved = await this.transportRepo.save(request);

    if (status === TransportStatus.DELIVERED) {
      await this.walletService.releaseToAvailable(driverUserId, requestId, this.dataSource.manager);
    }

    // Sprint 1: Real-time WS event to farmer — status changed
    if (saved.requester_id) {
      const wsEvent = status === TransportStatus.DELIVERED
        ? 'transport_delivered'
        : 'transport_status_changed';
      this.notificationGateway.sendToUser(saved.requester_id, wsEvent, {
        request_id: saved.id,
        status: status,
        cargo_type: saved.cargo_type,
        driver_profile_id: saved.driver_profile_id,
        updated_at: new Date().toISOString(),
      });

      // FCM push fallback
      this.notificationService.sendPushToUser(saved.requester_id, {
        title: `Mise à jour transport — ${saved.cargo_type}`,
        message: `Le statut de votre demande est passé à ${status}`,
        payload: { type: 'TRANSPORT_UPDATE', transport_request_id: saved.id },
      }).catch(e => this.logger.warn(`Failed to notify requester: ${e.message}`));
    }

    return saved;
  }

  // Sprint 9: Driver-facing available PENDING requests (simple non-geo fallback)
  async getAvailablePendingRequests(governorate?: string): Promise<TransportRequest[]> {
    const qb = this.transportRepo.createQueryBuilder('tr')
      .leftJoinAndSelect('tr.requester', 'u')
      .where('tr.status = :status', { status: TransportStatus.PENDING });
    if (governorate) qb.andWhere('tr.origin_address ILIKE :gov', { gov: `%${governorate}%` });
    return qb.orderBy('tr.proposed_price_tnd', 'DESC').limit(50).getMany();
  }

  // Sprint 9: Driver explicitly accepts a specific request
  async acceptTransportRequestById(requestId: string, driverUserId: string): Promise<TransportRequest> {
    const profile = await this.driverRepo.findOne({ where: { user_id: driverUserId } });
    if (!profile) throw new ForbiddenException('Profil chauffeur requis');

    const request = await this.transportRepo.findOne({ where: { id: requestId }, relations: ['requester'] });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.status !== TransportStatus.PENDING) throw new ForbiddenException('Cette demande est déjà traitée');

    request.driver_profile_id = profile.id;
    request.status = TransportStatus.IN_TRANSIT;
    request.accepted_price_tnd = request.proposed_price_tnd || 300;
    const saved = await this.transportRepo.save(request);

    // Notify farmer
    await this.notificationService.sendToUsers(
      [request.requester_id],
      '🚛 Chauffeur assigné — votre transport est confirmé',
      `Un chauffeur a accepté votre demande de transport pour ${request.cargo_type}. La collecte est en cours de planification.`,
      { type: 'TRANSPORT_ACCEPTED', transport_request_id: saved.id, cargo_type: saved.cargo_type }
    );

    return saved;
  }

  // Sprint 9: Driver's active missions
  async getMyMissions(driverUserId: string): Promise<TransportRequest[]> {
    const profile = await this.driverRepo.findOne({ where: { user_id: driverUserId } });
    if (!profile) return [];
    return this.transportRepo.find({
      where: { driver_profile_id: profile.id },
      relations: ['requester'],
      order: { updated_at: 'DESC' },
    });
  }

  // Sprint 9: Driver marks transport as complete
  async completeTransportRequest(requestId: string, driverUserId: string): Promise<TransportRequest> {
    const profile = await this.driverRepo.findOne({ where: { user_id: driverUserId } });
    if (!profile) throw new ForbiddenException('Profil chauffeur requis');

    const request = await this.transportRepo.findOne({ where: { id: requestId }, relations: ['requester'] });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.driver_profile_id !== profile.id) throw new ForbiddenException('Accès refusé');

    request.status = TransportStatus.DELIVERED;
    const saved = await this.transportRepo.save(request);

    await this.notificationService.sendToUsers(
      [request.requester_id],
      '✅ Livraison effectuée',
      `Votre cargaison de ${request.cargo_type} a été livrée avec succès!`,
      { type: 'TRANSPORT_DELIVERED', transport_request_id: saved.id, cargo_type: saved.cargo_type }
    );

    return saved;
  }

  async cancelTransportRequest(requestId: string, userId: string): Promise<any> {
    const request = await this.transportRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.requester_id !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à annuler cette demande");
    }
    await this.transportRepo.remove(request);
    return { success: true };
  }

  async updateTransportRequest(requestId: string, userId: string, dto: Partial<TransportRequest>): Promise<TransportRequest> {
    const request = await this.transportRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.requester_id !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette demande");
    }
    if (['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].includes(request.status)) {
      throw new ForbiddenException('Impossible de modifier une demande déjà acceptée ou en cours');
    }

    const allowed: Record<string, any> = {};
    if (dto.cargo_type !== undefined) allowed.cargo_type = dto.cargo_type;
    if (dto.quantity_kg !== undefined) allowed.quantity_kg = dto.quantity_kg;
    if (dto.weight_tonnes !== undefined) allowed.weight_tonnes = dto.weight_tonnes;
    if (dto.required_vehicle_type !== undefined) allowed.required_vehicle_type = dto.required_vehicle_type;
    if (dto.origin_lat !== undefined) allowed.origin_lat = dto.origin_lat;
    if (dto.origin_lng !== undefined) allowed.origin_lng = dto.origin_lng;
    if (dto.origin_address !== undefined) allowed.origin_address = dto.origin_address;
    if (dto.destination_lat !== undefined) allowed.destination_lat = dto.destination_lat;
    if (dto.destination_lng !== undefined) allowed.destination_lng = dto.destination_lng;
    if (dto.destination_address !== undefined) allowed.destination_address = dto.destination_address;
    if (dto.loading_datetime !== undefined) allowed.loading_datetime = dto.loading_datetime;
    if (dto.pickup_date !== undefined) allowed.pickup_date = dto.pickup_date;
    if (dto.is_express !== undefined) allowed.is_express = dto.is_express;
    if (dto.handling_notes !== undefined) allowed.handling_notes = dto.handling_notes;
    if (dto.proposed_price_tnd !== undefined) allowed.proposed_price_tnd = dto.proposed_price_tnd;
    if (dto.notes !== undefined) allowed.notes = dto.notes;

    Object.assign(request, allowed);
    return this.transportRepo.save(request);
  }

}
