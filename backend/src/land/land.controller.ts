import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, Request, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LandService } from './land.service';
import { LandListing } from './entities/land-listing.entity';
import { LandAuctionService } from './land-auction.service';

@ApiTags('Land Market (Foncier)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('land')
export class LandController {
  constructor(
    private readonly landService: LandService,
    private readonly auctionService: LandAuctionService,
  ) {}

  @Get('my-stats')
  @ApiOperation({ summary: 'Statistiques du propriétaire foncier (enchères, offres, valorisation)' })
  getMyStats(@Request() req) {
    return this.landService.getOwnerStats(req.user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Publier une annonce foncière (LAND_OWNER)' })
  create(@Request() req, @Body() dto: Partial<LandListing>) {
    return this.landService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Parcourir les annonces foncières actives' })
  @ApiQuery({ name: 'governorate', required: false })
  @ApiQuery({ name: 'listing_type', required: false, enum: ['SALE', 'RENT', 'LEASE'] })
  findAll(
    @Query('governorate') governorate?: string,
    @Query('listing_type') listingType?: string,
  ) {
    return this.landService.findAll(governorate, listingType);
  }

  @Get('me')
  @ApiOperation({ summary: 'Mes annonces foncières' })
  getMyListings(@Request() req) {
    return this.landService.findMyListings(req.user.sub);
  }

  @Get(':id/valuation')
  @ApiOperation({ summary: "Estimation IA de la valeur d'une parcelle" })
  getValuation(@Param('id', ParseUUIDPipe) id: string) {
    return this.landService.getValuation(id);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une annonce foncière" })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.landService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une annonce foncière' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: Partial<LandListing>,
  ) {
    return this.landService.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une annonce foncière' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.landService.remove(id, req.user.sub);
  }

  // ─── AUCTIONS & BIDS ───────────────────────────────────────────────────────

  @Get('auctions')
  @ApiOperation({ summary: 'Lister les enchères foncières' })
  @ApiQuery({ name: 'my', required: false, type: Boolean })
  findAllAuctions(@Query('my') my?: string, @Request() req?: any) {
    if (my === 'true') return this.auctionService.findMyAuctions(req.user.sub);
    return this.auctionService.findAllAuctions();
  }

  @Post('auctions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une nouvelle enchère (LAND_OWNER)' })
  createAuction(@Body() dto: any, @Request() req) {
    return this.auctionService.createAuction({ ...dto, owner_id: req.user.sub });
  }

  @Get('auctions/:id/bids')
  @ApiOperation({ summary: "Historique des offres pour une enchère" })
  getAuctionBids(@Param('id', ParseUUIDPipe) id: string) {
    return this.auctionService.getBids(id);
  }

  @Post('auctions/:id/bids')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Placer une offre (Bid) sur une enchère' })
  placeBid(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('amount') amount: number,
  ) {
    return this.auctionService.placeBid(id, req.user.sub, amount);
  }

  @Post('auctions/:id/accept-bid')
  @ApiOperation({ summary: "Accepter la meilleure offre" })
  acceptBid(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.auctionService.acceptBestBid(id, req.user.sub);
  }

  @Post('auctions/:id/cancel')
  @ApiOperation({ summary: "Annuler une enchère" })
  cancelAuction(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.auctionService.cancelAuction(id, req.user.sub);
  }

  @Get('auctions/:id/questions')
  @ApiOperation({ summary: "Questions posées sur une enchère" })
  getQuestions(@Param('id', ParseUUIDPipe) id: string) {
    return this.auctionService.getQuestions(id);
  }

  @Post('auctions/:id/questions/:qid/answer')
  @ApiOperation({ summary: "Répondre à une question" })
  answerQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('qid', ParseUUIDPipe) qid: string,
    @Request() req,
    @Body('answer') answer: string,
  ) {
    return this.auctionService.answerQuestion(qid, req.user.sub, answer);
  }
}
