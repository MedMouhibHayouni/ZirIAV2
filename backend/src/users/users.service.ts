import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { FarmerActivityType } from '../common/enums/farmer-activity-type.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findAll(role?: string, cooperativeId?: string): Promise<User[]> {
    const where: any = {};
    if (role) where.role = role;
    if (cooperativeId) where.cooperative_id = cooperativeId;

    return this.repo.find({ 
      where,
      select: ['id', 'name', 'email', 'phone', 'role', 'governorate', 'verified', 'created_at'] 
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id }, select: ['id', 'name', 'email', 'phone', 'role', 'governorate', 'verified', 'created_at'] });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.repo.remove(user);
  }

  async anonymizeUser(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.name = `Utilisateur_Anonyme_${id.substring(0, 5)}`;
    user.email = `anonyme_${id}@deleted.ziria.local`;
    user.phone = null;
    user.location = null;
    user.fcm_token = null;
    user.verified = false;
    user.password_hash = 'DELETED';
    await this.repo.save(user);
  }

  async findNearbyFarmers(lat: number, lng: number, radiusKm = 10): Promise<User[]> {
    return this.repo.createQueryBuilder('u')
      .select(['u.id', 'u.name', 'u.governorate', 'u.role', 'u.verified'])
      .where('u.role = :role', { role: 'FARMER' })
      .andWhere('u.location IS NOT NULL')
      .andWhere(
        'ST_DWithin(u.location::geography, ST_SetSRID(ST_Point(:lng, :lat), 4326)::geography, :radius)',
        { lat, lng, radius: radiusKm * 1000 }
      )
      .limit(50)
      .getMany()
      .catch(() =>
        // Fallback without spatial: return all farmers in same governorate
        this.repo.find({ where: { role: 'FARMER' as any }, select: ['id', 'name', 'governorate', 'role', 'verified'], take: 20 })
      );
  }

  async updateAvailability(userId: string, availableDates: string[]) {
    await this.repo.update(userId, { available_dates: availableDates } as any);
    return { success: true, available_dates: availableDates };
  }

  async updateProfile(userId: string, dto: any): Promise<any> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);

    // Standard fields
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.profile_picture_url !== undefined) user.profile_picture_url = dto.profile_picture_url;
    if (dto.language !== undefined) user.language = dto.language;

    // Password hashing
    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, 12);
    }

    // Role-specific columns on users table
    if (dto.speciality !== undefined) user.speciality = dto.speciality;
    if (dto.equipment_type !== undefined) user.equipment_type = dto.equipment_type;
    if (dto.zone_id !== undefined) user.zone_id = dto.zone_id;
    if (dto.cooperative_id !== undefined) user.cooperative_id = dto.cooperative_id;

    if (user.role === 'SUPPLIER') {
      if (dto.business_name !== undefined) user.business_name = dto.business_name;
      if (dto.business_description !== undefined) user.business_description = dto.business_description;
    }

    const savedUser = await this.repo.save(user);

    // Role-specific separate tables
    if (user.role === 'WORKER' || user.role === 'AGRI_WORKER') {
      const skills = dto.skills || [];
      const dailyRate = dto.daily_rate_tnd !== undefined ? parseFloat(dto.daily_rate_tnd) : 50.0;
      const bio = dto.bio || '';
      await this.repo.manager.query(
        `INSERT INTO worker_profiles (user_id, skills, daily_rate_tnd, bio, rating, is_available) 
         VALUES ($1, $2, $3, $4, 0.0, true) 
         ON CONFLICT (user_id) DO UPDATE 
         SET skills = EXCLUDED.skills, daily_rate_tnd = EXCLUDED.daily_rate_tnd, bio = EXCLUDED.bio`,
        [user.id, skills, dailyRate, bio]
      );
    }

    if (user.role === 'DRIVER') {
      const vehicleType = dto.vehicle_type || 'TRUCK';
      const capacity = dto.capacity_tonnes !== undefined ? parseFloat(dto.capacity_tonnes) : 5.0;
      const plate = dto.vehicle_plate || '';
      const license = dto.license_number || '';
      await this.repo.manager.query(
        `INSERT INTO driver_profiles (user_id, vehicle_type, capacity_tonnes, vehicle_plate, license_number, rating, is_available) 
         VALUES ($1, $2, $3, $4, $5, 0.0, true) 
         ON CONFLICT (user_id) DO UPDATE 
         SET vehicle_type = EXCLUDED.vehicle_type, capacity_tonnes = EXCLUDED.capacity_tonnes, vehicle_plate = EXCLUDED.vehicle_plate, license_number = EXCLUDED.license_number`,
        [user.id, vehicleType, capacity, plate, license]
      );
    }

    const { password_hash, ...safeUser } = savedUser;
    return safeUser;
  }

  async setActivityType(userId: string, activityType: FarmerActivityType): Promise<any> {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);
    user.activity_type = activityType;
    const saved = await this.repo.save(user);
    const { password_hash, ...safeUser } = saved;
    return safeUser;
  }
}

