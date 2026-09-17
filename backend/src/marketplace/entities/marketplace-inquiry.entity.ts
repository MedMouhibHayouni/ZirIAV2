import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Demande de contact publique (sans compte) envoyée au vendeur depuis le Marketplace.
 */
@Entity('marketplace_inquiries')
export class MarketplaceInquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'listing_id', type: 'varchar' })
  listing_id: string;

  @Column({ name: 'seller_id', type: 'varchar' })
  seller_id: string;

  @Column({ name: 'inquirer_name', type: 'varchar' })
  inquirer_name: string;

  @Column({ name: 'inquirer_email', type: 'varchar' })
  inquirer_email: string;

  @Column({ name: 'inquirer_phone', type: 'varchar', nullable: true })
  inquirer_phone: string | null;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
