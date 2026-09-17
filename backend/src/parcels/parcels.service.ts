import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcel } from './entities/parcel.entity';
import { CropZone } from './entities/crop-zone.entity';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { CreateCropZoneDto } from './dto/create-crop-zone.dto';
import { SubscriptionService } from '../subscriptions/subscription.service';

@Injectable()
export class ParcelsService {
  constructor(
    @InjectRepository(Parcel)
    private readonly repo: Repository<Parcel>,
    @InjectRepository(CropZone)
    private readonly zoneRepo: Repository<CropZone>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async create(dto: CreateParcelDto, ownerId: string): Promise<Parcel> {
    const limitCheck = await this.subscriptionService.checkLimit(ownerId, 'parcels');
    if (!limitCheck.allowed) {
      throw new ForbiddenException(`Plan ${limitCheck.planName}: ${limitCheck.current}/${limitCheck.limit} parcelles actives. Passez au plan supérieur.`);
    }

    const parcelCount = await this.repo.count({ where: { owner_id: ownerId } });
    const colors = ['#2D6A4F','#40916C','#52B788','#74C69D','#95D5B2','#B7E4C7','#D8F3DC','#1B4332'];
    const colorHex = dto.color_hex || colors[parcelCount % 8];

    let parcel = this.repo.create({ 
      ...dto, 
      owner_id: ownerId,
      color_hex: colorHex
    });
    
    parcel = await this.repo.save(parcel);

    if (dto.boundary_geojson) {
      await this.updateBoundary(parcel.id, dto.boundary_geojson);
      return this.findOne(parcel.id);
    }

    return parcel;
  }

  async updateBoundary(id: string, geojson: any): Promise<void> {
    const geojsonStr = JSON.stringify(geojson);
    await this.repo.query(`
      UPDATE parcels
      SET boundary = ST_GeomFromGeoJSON($1)::geography,
          center_lat = ST_Y(ST_Centroid(ST_GeomFromGeoJSON($1)::geometry)),
          center_lng = ST_X(ST_Centroid(ST_GeomFromGeoJSON($1)::geometry)),
          lat = ST_Y(ST_Centroid(ST_GeomFromGeoJSON($1)::geometry)),
          lng = ST_X(ST_Centroid(ST_GeomFromGeoJSON($1)::geometry)),
          location = ST_Centroid(ST_GeomFromGeoJSON($1)::geometry)::geography,
          area_ha = ST_Area(ST_GeomFromGeoJSON($1)::geography) / 10000
      WHERE id = $2
    `, [geojsonStr, id]);
  }

  findAll(): Promise<Parcel[]> {
    return this.repo.find({ relations: ['owner', 'cooperative'] });
  }

  findByOwner(ownerId: string): Promise<Parcel[]> {
    return this.repo.find({
      where: { owner_id: ownerId },
      relations: ['cooperative', 'zones'],
      order: { created_at: 'DESC' },
    });
  }

  findByCooperative(coopId: string): Promise<Parcel[]> {
    return this.repo.find({ where: { cooperative_id: coopId }, relations: ['owner'] });
  }

  async findOne(id: string): Promise<Parcel> {
    const parcel = await this.repo.findOne({ where: { id }, relations: ['owner', 'cooperative'] });
    if (!parcel) throw new NotFoundException(`Parcelle ${id} introuvable`);
    return parcel;
  }

  async findOneForUser(id: string, userId: string, isAdmin: boolean): Promise<Parcel> {
    const parcel = await this.findOne(id);
    if (!isAdmin && parcel.owner_id !== userId) {
      throw new ForbiddenException('Accès réservé au propriétaire');
    }
    return parcel;
  }

  async updateBoundaryForUser(id: string, geojson: any, userId: string, isAdmin: boolean): Promise<void> {
    const parcel = await this.findOne(id);
    if (!isAdmin && parcel.owner_id !== userId) {
      throw new ForbiddenException('Modification réservée au propriétaire');
    }
    await this.updateBoundary(id, geojson);
  }

  async update(id: string, dto: Partial<CreateParcelDto>, userId: string, isAdmin: boolean): Promise<Parcel> {
    const parcel = await this.findOne(id);
    if (!isAdmin && parcel.owner_id !== userId) {
      throw new ForbiddenException('Modification réservée au propriétaire');
    }
    Object.assign(parcel, dto);
    await this.repo.save(parcel);

    if (dto.boundary_geojson) {
      await this.updateBoundary(id, dto.boundary_geojson);
    }

    return this.findOne(id);
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const parcel = await this.findOne(id);
    if (!isAdmin && parcel.owner_id !== userId) {
      throw new ForbiddenException('Suppression réservée au propriétaire');
    }
    await this.repo.remove(parcel);
  }

  async getCropZones(parcelId: string): Promise<CropZone[]> {
    return this.zoneRepo.find({ where: { parcel_id: parcelId } });
  }

  async getCropZonesForUser(parcelId: string, userId: string, isAdmin: boolean): Promise<CropZone[]> {
    const parcel = await this.findOne(parcelId);
    if (!isAdmin && parcel.owner_id !== userId) {
      throw new ForbiddenException('Accès réservé au propriétaire');
    }
    return this.getCropZones(parcelId);
  }

  async addZoneGeo(parcelId: string, dto: CreateCropZoneDto, userId: string, isAdmin: boolean): Promise<CropZone> {
    const parcel = await this.findOne(parcelId);
    if (!isAdmin && parcel.owner_id !== userId) {
      throw new ForbiddenException('Action réservée au propriétaire');
    }

    const cropColors: Record<string, string> = {
      'tomate': '#E63946',
      'piment': '#F4A261',
      'oignon': '#E9C46A',
      'blé': '#F3D5A0',
      'orge': '#D4A373',
      'pomme de terre': '#A7C957',
    };
    const colorHex = cropColors[dto.crop_type?.toLowerCase()] || '#6D6875';

    let zone = this.zoneRepo.create({
      parcel_id: parcelId,
      crop_type: dto.crop_type,
      planted_at: dto.planted_at,
      notes: dto.notes,
      color_hex: colorHex,
    });
    zone = await this.zoneRepo.save(zone);

    if (dto.boundary_geojson) {
      await this.updateZoneBoundary(zone.id, dto.boundary_geojson, parcelId);
    }

    const foundZone = await this.zoneRepo.findOne({ where: { id: zone.id } });
    if (!foundZone) {
      throw new NotFoundException('Erreur lors de la création de la zone');
    }
    return foundZone;
  }

  async updateZoneBoundaryForUser(zoneId: string, geojson: any, parcelId: string, userId: string, isAdmin: boolean): Promise<void> {
    const zone = await this.zoneRepo.findOne({ where: { id: zoneId }, relations: ['parcel'] });
    if (!zone) throw new NotFoundException('Zone introuvable');
    if (zone.parcel_id !== parcelId) {
      throw new BadRequestException('La zone n appartient pas à cette parcelle');
    }
    if (!isAdmin && zone.parcel.owner_id !== userId) {
      throw new ForbiddenException('Modification réservée au propriétaire');
    }
    await this.updateZoneBoundary(zoneId, geojson, parcelId);
  }

  async updateZoneBoundary(zoneId: string, geojson: any, parcelId: string): Promise<void> {
    const geojsonStr = JSON.stringify(geojson);
    
    // Validation: containment (St_Contains requires valid geometries)
    // Coalesce to true if parent boundary is missing
    const check = await this.repo.query(`
      SELECT 
        CASE WHEN p.boundary IS NULL THEN true 
        ELSE ST_Contains(p.boundary::geometry, ST_GeomFromGeoJSON($2)::geometry)
        END as is_contained
      FROM parcels p WHERE p.id = $1
    `, [parcelId, geojsonStr]);

    if (check.length > 0 && check[0].is_contained === false) {
      throw new BadRequestException('La zone doit être à l intérieur de la parcelle');
    }

    await this.repo.query(`
      UPDATE crop_zones
      SET boundary = ST_GeomFromGeoJSON($1)::geography,
          surface_ha = ST_Area(ST_GeomFromGeoJSON($1)::geography) / 10000
      WHERE id = $2
    `, [geojsonStr, zoneId]);
  }

  async removeZone(zoneId: string, userId: string, isAdmin: boolean): Promise<void> {
    const zone = await this.zoneRepo.findOne({ where: { id: zoneId }, relations: ['parcel'] });
    if (!zone) throw new NotFoundException('Zone introuvable');
    if (!isAdmin && zone.parcel.owner_id !== userId) {
      throw new ForbiddenException('Suppression réservée au propriétaire');
    }
    await this.zoneRepo.remove(zone);
  }

  async getMapData(userId: string): Promise<any[]> {
    const parcels = await this.repo.query(`
      SELECT 
        p.id, p.name, p.color_hex, 
        COALESCE(p.area_ha, p.surface_ha, 0) as area_ha, 
        COALESCE(p.center_lat, p.lat) as center_lat, 
        COALESCE(p.center_lng, p.lng) as center_lng,
        ST_AsGeoJSON(p.boundary)::json as boundary_geojson
      FROM parcels p
      WHERE p.owner_id = $1
    `, [userId]);

    return this.enrichMapData(parcels);
  }

  async getCoopMapData(coopId: string): Promise<any[]> {
    const parcels = await this.repo.query(`
      SELECT 
        p.id, p.name, p.color_hex, 
        COALESCE(p.area_ha, p.surface_ha, 0) as area_ha, 
        COALESCE(p.center_lat, p.lat) as center_lat, 
        COALESCE(p.center_lng, p.lng) as center_lng,
        ST_AsGeoJSON(p.boundary)::json as boundary_geojson,
        u.first_name, u.last_name
      FROM parcels p
      JOIN users u ON p.owner_id = u.id
      WHERE p.cooperative_id = $1
    `, [coopId]);

    return this.enrichMapData(parcels);
  }

  private async enrichMapData(parcels: any[]): Promise<any> {
    for (const p of parcels) {
      const zones = await this.zoneRepo.query(`
        SELECT 
          z.id, z.crop_type, z.color_hex, z.surface_ha, z.gdd_accumulated, 
          z.harvest_threshold, z.alert_level, z.planted_at, z.harvest_eta_days, z.gdd_percentage,
          ST_AsGeoJSON(z.boundary)::json as boundary_geojson
        FROM crop_zones z
        WHERE z.parcel_id = $1
      `, [p.id]);

      let worstAlert = 'NORMAL';
      for (const z of zones) {
        if (z.alert_level === 'CRITICAL') worstAlert = 'CRITICAL';
        else if (z.alert_level === 'WARNING' && worstAlert !== 'CRITICAL') worstAlert = 'WARNING';
      }
      p.alert_level = worstAlert;
      p.crop_zones = zones;

      // Fetch last disease detection
      const lastDetection = await this.repo.query(`
        SELECT disease_name, confidence_score, photo_url, created_at as detected_at
        FROM disease_detections
        WHERE parcel_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [p.id]);
      
      p.last_detection = lastDetection.length > 0 ? lastDetection[0] : null;
      
      // Fetch 3-day weather
      if (p.center_lat && p.center_lng) {
        try {
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.center_lat}&longitude=${p.center_lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3`);
          if (weatherRes.ok) {
            const wData = await weatherRes.json();
            p.weather_3days = wData.daily.time.map((date: string, i: number) => ({
              date,
              tmax: wData.daily.temperature_2m_max[i],
              tmin: wData.daily.temperature_2m_min[i],
              precipitation_mm: wData.daily.precipitation_sum[i] || 0,
              weather_code: wData.daily.weathercode[i],
            }));
          } else {
            p.weather_3days = null;
          }
        } catch (e) {
          p.weather_3days = null;
        }
      } else {
        p.weather_3days = null;
      }
    }

    return parcels;
  }
}
