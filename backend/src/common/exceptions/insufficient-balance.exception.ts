import { UnprocessableEntityException } from '@nestjs/common';

export class InsufficientBalanceException extends UnprocessableEntityException {
  constructor(message = 'Solde insuffisant pour effectuer cette transaction') {
    super(message);
  }
}
