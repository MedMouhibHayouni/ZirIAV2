import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class GroupOrderService {
  private readonly logger = new Logger(GroupOrderService.name);

  constructor(private readonly dataSource: DataSource) {}

  async confirmGroupOrder(groupId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    
    // Transaction ACID absolue
    await queryRunner.startTransaction();

    try {
      // 1. Lock group order
      const groupOrder = await queryRunner.query(
        `SELECT * FROM group_orders WHERE id = $1 FOR UPDATE`, 
        [groupId]
      );
      
      if (!groupOrder || groupOrder.length === 0) throw new BadRequestException('Group order not found');

      // 2. Fetch items
      const items = await queryRunner.query(
        `SELECT * FROM group_order_items WHERE group_order_id = $1`, 
        [groupId]
      );

      // 3. Validate stock (pessimistic lock on inventory)
      for (const item of items) {
         const inventory = await queryRunner.query(
            `SELECT * FROM inventory WHERE product_id = $1 AND supplier_id = $2 FOR UPDATE`,
            [item.product_id, groupOrder[0].supplier_id]
         );

         if (!inventory || inventory.length === 0 || inventory[0].quantity_available < item.quantity) {
            throw new BadRequestException(`Insufficient stock for product ${item.product_id}`);
         }

         // Deduct stock
         await queryRunner.query(
            `UPDATE inventory SET quantity_available = quantity_available - $1 WHERE product_id = $2 AND supplier_id = $3`,
            [item.quantity, item.product_id, groupOrder[0].supplier_id]
         );
      }

      // 4. Update order status
      await queryRunner.query(
         `UPDATE group_orders SET status = 'CONFIRMED' WHERE id = $1`,
         [groupId]
      );

      // 5. Generate financial transactions
      await queryRunner.query(
         `INSERT INTO financial_transactions (reference_type, reference_id, amount_tnd, status, created_at) VALUES ('GROUP_ORDER', $1, $2, 'PENDING', NOW())`,
         [groupId, groupOrder[0].total_amount_tnd]
      );

      await queryRunner.commitTransaction();
      return { success: true, message: 'Group order confirmed, stock deducted, transactions generated.' };
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error confirming group order: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
