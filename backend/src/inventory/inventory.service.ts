import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';

// Typical Tunisian market prices per tonne (TND) for stock valuation
const PRICE_ESTIMATES_PER_TONNE: Record<string, number> = {
  tomate: 800,
  piment: 1200,
  oignon: 600,
  'pomme de terre': 700,
  blé: 500,
  orge: 450,
  olive: 3500,
  melon: 500,
  default: 600,
};

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    private readonly dataSource: DataSource,
  ) {}

  async getMyInventory(userId: string) {
    return this.inventoryRepo.find({
      where: { owner_id: userId },
      order: { updated_at: 'DESC' }
    });
  }

  async getInventoryStats(userId: string) {
    const items = await this.getMyInventory(userId);

    let estimated_value_tnd = 0;
    let low_stock_count = 0;
    const stock_by_type: { crop_type: string; quantity_tonnes: number; estimated_value: number }[] = [];

    for (const item of items) {
      const qty = Number(item.quantity_tonnes);
      const pricePerTonne = PRICE_ESTIMATES_PER_TONNE[item.crop_type?.toLowerCase()] ?? PRICE_ESTIMATES_PER_TONNE.default;
      const value = qty * pricePerTonne;
      estimated_value_tnd += value;
      if (qty < 0.5) low_stock_count++;
      stock_by_type.push({ crop_type: item.crop_type, quantity_tonnes: qty, estimated_value: value });
    }

    // Last 7 days movement volume
    const recentMovements = await this.dataSource.query(`
      SELECT 
        im.type,
        SUM(im.quantity) AS total_qty,
        COUNT(*)::int AS count
      FROM inventory_movements im
      JOIN inventory i ON i.id = im.inventory_id
      WHERE i.owner_id = $1
        AND im.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY im.type
    `, [userId]);

    const inbound = recentMovements.find((m: any) => m.type === 'IN');
    const outbound = recentMovements.find((m: any) => m.type === 'OUT');

    return {
      total_stock_items: items.length,
      estimated_value_tnd,
      low_stock_count,
      stock_by_type,
      last_7d_in_tonnes: Number(inbound?.total_qty ?? 0),
      last_7d_out_tonnes: Number(outbound?.total_qty ?? 0),
    };
  }

  async getMovementHistory(userId: string, limit = 20) {
    return this.dataSource.query(`
      SELECT
        im.id, im.type, im.quantity, im.reason, im.created_at,
        i.crop_type
      FROM inventory_movements im
      JOIN inventory i ON i.id = im.inventory_id
      WHERE i.owner_id = $1
      ORDER BY im.created_at DESC
      LIMIT $2
    `, [userId, limit]);
  }

  async recordMovement(userId: string, dto: {
    crop_type: string;
    quantity: number;
    type: MovementType;
    reason?: string;
    unit_price_tnd?: number;
  }) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let inventory = await queryRunner.manager.findOne(Inventory, {
        where: { owner_id: userId, crop_type: dto.crop_type },
        lock: { mode: 'pessimistic_write' }
      });

      if (!inventory) {
        if (dto.type === MovementType.OUT) {
          throw new BadRequestException("Stock inexistant pour ce produit.");
        }
        inventory = queryRunner.manager.create(Inventory, {
          owner_id: userId,
          crop_type: dto.crop_type,
          quantity_tonnes: 0
        });
      }

      if (dto.type === MovementType.IN) {
        inventory.quantity_tonnes = Number(inventory.quantity_tonnes) + Number(dto.quantity);
      } else {
        if (Number(inventory.quantity_tonnes) < Number(dto.quantity)) {
          throw new BadRequestException("Stock insuffisant.");
        }
        inventory.quantity_tonnes = Number(inventory.quantity_tonnes) - Number(dto.quantity);
      }

      const savedInventory = await queryRunner.manager.save(inventory);

      const movement = queryRunner.manager.create(InventoryMovement, {
        inventory_id: savedInventory.id,
        type: dto.type,
        quantity: dto.quantity,
        reason: dto.reason
      });
      await queryRunner.manager.save(movement);

      await queryRunner.commitTransaction();
      return savedInventory;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
