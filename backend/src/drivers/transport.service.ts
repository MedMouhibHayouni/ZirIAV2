import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransportRequest, TransportStatus } from './entities/transport-request.entity';
import { DriverProfile } from './entities/driver-profile.entity';

@Injectable()
export class TransportService {
  private readonly logger = new Logger(TransportService.name);

  constructor(
    @InjectRepository(TransportRequest)
    private readonly transportRepo: Repository<TransportRequest>,
    @InjectRepository(DriverProfile)
    private readonly driverRepo: Repository<DriverProfile>,
    private readonly dataSource: DataSource,
  ) {}

  async assignDriverToRequest(transactionId: string) {
    const request = await this.transportRepo.findOne({ where: { id: transactionId } });
    if (!request) throw new BadRequestException('Transport request not found');
    if (request.status !== TransportStatus.PENDING) throw new BadRequestException('Request is not pending');
    if (!request.origin_location || !request.destination_location) {
        throw new BadRequestException('Origin or destination location missing');
    }

    // 1. PostGIS Logic: Find drivers within 50km
    // ST_DWithin(geography, geography, distance_meters)
    const availableDrivers = await this.driverRepo.createQueryBuilder('driver')
      .where('driver.is_available = true')
      .andWhere('ST_DWithin(driver.location, ST_GeomFromEWKT(:origin), 50000)') // 50km radius
      .setParameter('origin', request.origin_location)
      .orderBy('driver.rating', 'DESC')
      .getMany();

    if (availableDrivers.length === 0) {
       return { success: false, message: 'No available drivers found within 50km.' };
    }

    // 2. Financial Logic: Calculate estimated amount based on ST_Distance
    // ST_Distance returns meters for geography types
    const distanceResult = await this.dataSource.query(
      `SELECT ST_Distance(ST_GeomFromEWKT($1), ST_GeomFromEWKT($2)) as distance_meters`,
      [request.origin_location, request.destination_location]
    );
    
    const distanceMeters = distanceResult[0].distance_meters;
    const distanceKm = distanceMeters / 1000;
    
    // Tarif calculé : 2.0 TND par kilomètre
    const ratePerKm = 2.0;
    const estimatedAmount = distanceKm * ratePerKm;

    const assignedDriver = availableDrivers[0];
    
    request.driver_profile_id = assignedDriver.id;
    request.status = TransportStatus.ACCEPTED;
    request.accepted_price_tnd = estimatedAmount;
    
    await this.transportRepo.save(request);

    return {
      success: true,
      driver: assignedDriver,
      distance_km: distanceKm,
      estimated_amount_tnd: estimatedAmount
    };
  }
}
